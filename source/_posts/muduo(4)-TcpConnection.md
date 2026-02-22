title: muduo(4)-TcpConnection
date: 2025-07-29 07:37:00
categories: muduo
tags: [muduo]
---
TcpConnection类是用于管理TCP连接的类，它负责管理一个TCP连接的读写事件， 并提供接口来设置读写回调、关闭回调、错误回调等。包含一个EventLoop对象，一个文件描述符，一个事件类型，一个回调函数。

### 一、数据发送策略

`muduo` 的 `TcpConnection` 采用两种发送方式结合的策略。首先尝试**直接发送**，如果 `outputBuffer_` 为空，就直接将数据写入 socket 内核缓冲区，避免了不必要的内存拷贝。当直接发送无法一次性完成时（通常因为内核缓冲区已满），剩余的数据会被存入应用层的 `outputBuffer_`。此时的发送流程从“主动发送”切换到了“事件驱动”模式。因为在使用outputBuffer时，会调用 channel_->enableWriting();关注写事件，后面通过handleWrite函数处理outputBuffer中的数据。

```cpp
void TcpConnection::sendInLoop(const void* data, size_t len)
{
    loop_->assertInLoopThread();
    ssize_t nwrote = 0;
    size_t remaining = len;
    bool faultError = false;
    if (state_ == kDisconnected)
    {
        LOG_WARN << "disconnected, give up writing";
        return;
    }
    // 如果输出缓冲区为空，并且 channel 没有在监听可写事件，尝试直接发送
    if (!channel_->isWriting() && outputBuffer_.readableBytes() == 0)
    {
        nwrote = sockets::write(channel_->fd(), data, len);
        if (nwrote >= 0)
        {
            remaining = len - nwrote;
            // 如果数据全部写入，则调用写完成回调
            if (remaining == 0 && writeCompleteCallback_)
            {
                loop_->queueInLoop(std::bind(writeCompleteCallback_, shared_from_this()));
            }
        }
        // 否则就是写入失败
        else
        {
            nwrote = 0;
            // 判断是否是缓冲区写满了，如果不是缓冲区写满，则记录错误
            if (errno != EWOULDBLOCK)
            {
                LOG_SYSERR << "TcpConnection::sendInLoop";
                if (errno == EPIPE || errno == ECONNRESET)
                {
                    faultError = true;
                }
            }
        }
    }
    //如果数据没有一次写完，说明缓冲区满了，需要将数据追加到输出队列中
    assert(remaining <= len);
    if (!faultError && remaining > 0)
    {
        // 计算已经写入的数据长度
        size_t oldLen = outputBuffer_.readableBytes();
        // 如果已经写入的和剩余的字符串长度大于等于高水位，并且已经写入的小于最高水位线，则调用高水位线回调
        if (oldLen + remaining >= highWaterMark_ && oldLen < highWaterMark_ &&
            highWaterMarkCallback_)
        {
            // 调用高水位线回调，处理高水位线事件
            loop_->queueInLoop(
                std::bind(highWaterMarkCallback_, shared_from_this(), oldLen + remaining));
        }
        //  将剩余数据放入 outputBuffer_
        outputBuffer_.append(static_cast<const char*>(data) + nwrote, remaining);
        // 如果当前没有写事件，则开启写事件
        if (!channel_->isWriting())
        {
            //当 outputBuffer_ 中有数据积压，并且内核的发送缓冲区有可用空间时，EventLoop 会触发 Channel 的可写事件，最终调用 handleWrite()
            channel_->enableWriting();
        }
    }
}

void TcpConnection::handleWrite()
{
    loop_->assertInLoopThread();
    if (channel_->isWriting())
    {
        // 将 outputBuffer_ 中的数据写入到 socket 中
        ssize_t n =
            sockets::write(channel_->fd(), outputBuffer_.peek(), outputBuffer_.readableBytes());
        if (n > 0)
        {
            // 从 outputBuffer_ 中移除已经写入的数据
            outputBuffer_.retrieve(n);
            // 如果 outputBuffer_ 中没有数据了，则关闭写事件
            if (outputBuffer_.readableBytes() == 0)
            {
                channel_->disableWriting();
                // 如果写完成回调不为空，则调用写完成回调
                if (writeCompleteCallback_)
                {
                    loop_->queueInLoop(std::bind(writeCompleteCallback_, shared_from_this()));
                }
                // 如果连接状态为 kDisconnecting，则关闭连接
                if (state_ == kDisconnecting)
                {
                    shutdownInLoop();
                }
            }
        }
        else
        {
            LOG_SYSERR << "TcpConnection::handleWrite";
            // if (state_ == kDisconnecting)
            // {
            //   shutdownInLoop();
            // }
        }
    }
    else
    {
        LOG_TRACE << "Connection fd = " << channel_->fd() << " is down, no more writing";
    }
}
```

在数据存入 `outputBuffer_` 时，会检查缓冲区的水位。如果“已有数据 + 新增数据”的总量超过了设定的高水位线 `highWaterMark_`，就会触发 `highWaterMarkCallback_` 回调，但是这个回调仅仅是**通知**，`muduo` 库本身不会擅自主张的丢弃数据，还是需要存入outputBuffer中，确保数据的可靠发送。具体的流量控制，需要在highWaterMarkCallback_中配置。



**值得注意的是，moduo库的epoll并没有使用ET模式，而是使用LT模式，在触发回调执行handlewrite函数时，并没有使用循环，而是只发送一次，然后在全部发送后调用`channel_->disableWriting();`取消写事件，如果outputbuffer一次性没有写完，epoll仍会关注这个可写事件，因为没有调用disableWriting，所以会在下一次epoll->wait函数的时候再次触发，知道数据全部写完并调用disableWriting，这样设计的原因是通过 `EventLoop` 实现了公平调度，避免了单个连接长时间霸占 I/O 线程，导致系统“卡死”**



### 二、Boost::any

`boost::any context_` 的作用是：允许用户将任意类型的、自定义的数据附加到一个 `TcpConnection` 对象上，作为一个与该连接绑定的“上下文”或“状态管理器”。`boost::any` (在 C++17 中已被标准化为 `std::any`) 是一个可以持有**任意类型**单个值的类型安全容器。你可以把它想象成一个“万能盒子”，什么都能装，但在取出来的时候，你必须明确知道里面装的是什么类型，否则会抛出异常。这比使用不安全的 `void*` 指针要好得多



`muduo` 作为一个通用的网络库，它只负责管理 TCP 连接、收发字节流这些底层事务。它**完全不知道**上层的业务逻辑是什么。

- 对于一个 **HTTP 服务器**，每个连接可能需要维护一个 `HttpContext` 对象，用来解析 HTTP 请求的状态。
- 对于一个 **RPC 服务器**，每个连接可能需要维护一个 `RpcChannel` 对象，用来处理 RPC 调用。
- 对于一个**游戏服务器**，每个连接可能需要关联一个 `Player` 或 `Session` 对象，来存储玩家信息。

如果 `muduo` 要为每一种应用都去修改 `TcpConnection` 类，添加 `HttpContext* httpContext_` 或 `Player* player_` 这样的成员，那这个库就失去了通用性。

`context_` 就是为了解决这个问题而生的。它提供了一个统一的、非侵入式的接口，让用户可以把自己的业务对象“挂”在 `TcpConnection` 上。



**在 HTTP 服务器中 (`HttpServer.cc`)**: 

当一个新的 TCP 连接建立时，`HttpServer` 会创建一个 `HttpContext` 对象，并通过 `conn->setContext()` 将它存入连接的 `context_` 中。在后续的 `onMessage` 回调中，服务器会通过 `conn->getMutableContext()` 取出这个 `HttpContext` 对象，用它来持续解析同一个连接上发来的数据流。

```cpp
void HttpServer::onConnection(const TcpConnectionPtr& conn)
{
  if (conn->connected())
  {
    // 新连接建立时，创建一个 HttpContext 并附加到连接上
    conn->setContext(HttpContext());
  }
}

void HttpServer::onMessage(const TcpConnectionPtr& conn,
                           Buffer* buf,
                           Timestamp receiveTime)
{
  // 从连接中取出之前存入的 HttpContext
  HttpContext* context = boost::any_cast<HttpContext>(conn->getMutableContext());

  if (!context->parseRequest(buf, receiveTime))
  {
    // ...
  }
  // ...
}
```

**在 RPC 服务器中 (`RpcServer.cc`)**:

同样，当新连接建立时，`RpcServer` 会创建一个 `RpcChannel` 对象，并将其存入 `context_`。

```cpp
void RpcServer::onConnection(const TcpConnectionPtr& conn)
{
  // ...
  if (conn->connected())
  {
    RpcChannelPtr channel(new RpcChannel(conn));
    channel->setServices(&services_);
    conn->setMessageCallback(
        std::bind(&RpcChannel::onMessage, get_pointer(channel), _1, _2, _3));
    // 将 RpcChannelPtr 附加到连接上
    conn->setContext(channel);
  }
  // ...
}
```

`TcpConnection` 类不需要知道任何关于上层业务（HTTP, RPC, Game...）的细节。它只负责提供一个“插座”。用户不需要为了添加自定义状态而去继承 `TcpConnection` 或修改库源码。使用 `boost::any_cast` 来获取数据，如果在运行时类型不匹配，会抛出异常，这比使用 `void*` 进行不安全的 `static_cast` 要健壮得多



具体使用示例：

```cpp
#include "muduo/base/Logging.h"
#include "muduo/net/EventLoop.h"
#include "muduo/net/http/HttpRequest.h"
#include "muduo/net/http/HttpResponse.h"
#include "muduo/net/http/HttpServer.h"

#include <iostream>
#include <map>

using namespace muduo;
using namespace muduo::net;

extern char favicon[555];
bool benchmark = false;

void onRequest(const HttpRequest& req, HttpResponse* resp)
{
    std::cout << "Headers " << req.methodString() << " " << req.path() << std::endl;
    if (!benchmark)
    {
        const std::map<string, string>& headers = req.headers();
        for (const auto& header : headers)
        {
            std::cout << header.first << ": " << header.second << std::endl;
        }
    }

    if (req.path() == "/")
    {
        resp->setStatusCode(HttpResponse::k200Ok);
        resp->setStatusMessage("OK");
        resp->setContentType("text/html");
        resp->addHeader("Server", "Muduo");
        string now = Timestamp::now().toFormattedString();
        resp->setBody("<html><head><title>This is title</title></head>"
                      "<body><h1>Hello</h1>Now is " +
                      now + "</body></html>");
    }
    else if (req.path() == "/favicon.ico")
    {
        resp->setStatusCode(HttpResponse::k200Ok);
        resp->setStatusMessage("OK");
        resp->setContentType("image/png");
        resp->setBody(string(favicon, sizeof favicon));
    }
    else if (req.path() == "/hello")
    {
        resp->setStatusCode(HttpResponse::k200Ok);
        resp->setStatusMessage("OK");
        resp->setContentType("text/plain");
        resp->addHeader("Server", "Muduo");
        resp->setBody("hello, world!\n");
    }
    else
    {
        resp->setStatusCode(HttpResponse::k404NotFound);
        resp->setStatusMessage("Not Found");
        resp->setCloseConnection(true);
    }
}

int main(int argc, char* argv[])
{
    int numThreads = 0;
    if (argc > 1)
    {
        benchmark = true;
        Logger::setLogLevel(Logger::WARN);
        numThreads = atoi(argv[1]);
    }
    EventLoop loop;
    HttpServer server(&loop, InetAddress(8000), "dummy");
    server.setHttpCallback(onRequest);
    server.setThreadNum(numThreads);
    server.start();
    loop.loop();
}

char favicon[555] = {
    '\x89', 'P',    'N',    'G',    '\xD',  '\xA',  '\x1A', '\xA',  '\x0',  '\x0',  '\x0',  '\xD',
    'I',    'H',    'D',    'R',    '\x0',  '\x0',  '\x0',  '\x10', '\x0',  '\x0',  '\x0',  '\x10',
    '\x8',  '\x6',  '\x0',  '\x0',  '\x0',  '\x1F', '\xF3', '\xFF', 'a',    '\x0',  '\x0',  '\x0',
    '\x19', 't',    'E',    'X',    't',    'S',    'o',    'f',    't',    'w',    'a',    'r',
    'e',    '\x0',  'A',    'd',    'o',    'b',    'e',    '\x20', 'I',    'm',    'a',    'g',
    'e',    'R',    'e',    'a',    'd',    'y',    'q',    '\xC9', 'e',    '\x3C', '\x0',  '\x0',
    '\x1',  '\xCD', 'I',    'D',    'A',    'T',    'x',    '\xDA', '\x94', '\x93', '9',    'H',
    '\x3',  'A',    '\x14', '\x86', '\xFF', '\x5D', 'b',    '\xA7', '\x4',  'R',    '\xC4', 'm',
    '\x22', '\x1E', '\xA0', 'F',    '\x24', '\x8',  '\x16', '\x16', 'v',    '\xA',  '6',    '\xBA',
    'J',    '\x9A', '\x80', '\x8',  'A',    '\xB4', 'q',    '\x85', 'X',    '\x89', 'G',    '\xB0',
    'I',    '\xA9', 'Q',    '\x24', '\xCD', '\xA6', '\x8',  '\xA4', 'H',    'c',    '\x91', 'B',
    '\xB',  '\xAF', 'V',    '\xC1', 'F',    '\xB4', '\x15', '\xCF', '\x22', 'X',    '\x98', '\xB',
    'T',    'H',    '\x8A', 'd',    '\x93', '\x8D', '\xFB', 'F',    'g',    '\xC9', '\x1A', '\x14',
    '\x7D', '\xF0', 'f',    'v',    'f',    '\xDF', '\x7C', '\xEF', '\xE7', 'g',    'F',    '\xA8',
    '\xD5', 'j',    'H',    '\x24', '\x12', '\x2A', '\x0',  '\x5',  '\xBF', 'G',    '\xD4', '\xEF',
    '\xF7', '\x2F', '6',    '\xEC', '\x12', '\x20', '\x1E', '\x8F', '\xD7', '\xAA', '\xD5', '\xEA',
    '\xAF', 'I',    '5',    'F',    '\xAA', 'T',    '\x5F', '\x9F', '\x22', 'A',    '\x2A', '\x95',
    '\xA',  '\x83', '\xE5', 'r',    '9',    'd',    '\xB3', 'Y',    '\x96', '\x99', 'L',    '\x6',
    '\xE9', 't',    '\x9A', '\x25', '\x85', '\x2C', '\xCB', 'T',    '\xA7', '\xC4', 'b',    '1',
    '\xB5', '\x5E', '\x0',  '\x3',  'h',    '\x9A', '\xC6', '\x16', '\x82', '\x20', 'X',    'R',
    '\x14', 'E',    '6',    'S',    '\x94', '\xCB', 'e',    'x',    '\xBD', '\x5E', '\xAA', 'U',
    'T',    '\x23', 'L',    '\xC0', '\xE0', '\xE2', '\xC1', '\x8F', '\x0',  '\x9E', '\xBC', '\x9',
    'A',    '\x7C', '\x3E', '\x1F', '\x83', 'D',    '\x22', '\x11', '\xD5', 'T',    '\x40', '\x3F',
    '8',    '\x80', 'w',    '\xE5', '3',    '\x7',  '\xB8', '\x5C', '\x2E', 'H',    '\x92', '\x4',
    '\x87', '\xC3', '\x81', '\x40', '\x20', '\x40', 'g',    '\x98', '\xE9', '6',    '\x1A', '\xA6',
    'g',    '\x15', '\x4',  '\xE3', '\xD7', '\xC8', '\xBD', '\x15', '\xE1', 'i',    '\xB7', 'C',
    '\xAB', '\xEA', 'x',    '\x2F', 'j',    'X',    '\x92', '\xBB', '\x18', '\x20', '\x9F', '\xCF',
    '3',    '\xC3', '\xB8', '\xE9', 'N',    '\xA7', '\xD3', 'l',    'J',    '\x0',  'i',    '6',
    '\x7C', '\x8E', '\xE1', '\xFE', 'V',    '\x84', '\xE7', '\x3C', '\x9F', 'r',    '\x2B', '\x3A',
    'B',    '\x7B', '7',    'f',    'w',    '\xAE', '\x8E', '\xE',  '\xF3', '\xBD', 'R',    '\xA9',
    'd',    '\x2',  'B',    '\xAF', '\x85', '2',    'f',    'F',    '\xBA', '\xC',  '\xD9', '\x9F',
    '\x1D', '\x9A', 'l',    '\x22', '\xE6', '\xC7', '\x3A', '\x2C', '\x80', '\xEF', '\xC1', '\x15',
    '\x90', '\x7',  '\x93', '\xA2', '\x28', '\xA0', 'S',    'j',    '\xB1', '\xB8', '\xDF', '\x29',
    '5',    'C',    '\xE',  '\x3F', 'X',    '\xFC', '\x98', '\xDA', 'y',    'j',    'P',    '\x40',
    '\x0',  '\x87', '\xAE', '\x1B', '\x17', 'B',    '\xB4', '\x3A', '\x3F', '\xBE', 'y',    '\xC7',
    '\xA',  '\x26', '\xB6', '\xEE', '\xD9', '\x9A', '\x60', '\x14', '\x93', '\xDB', '\x8F', '\xD',
    '\xA',  '\x2E', '\xE9', '\x23', '\x95', '\x29', 'X',    '\x0',  '\x27', '\xEB', 'n',    'V',
    'p',    '\xBC', '\xD6', '\xCB', '\xD6', 'G',    '\xAB', '\x3D', 'l',    '\x7D', '\xB8', '\xD2',
    '\xDD', '\xA0', '\x60', '\x83', '\xBA', '\xEF', '\x5F', '\xA4', '\xEA', '\xCC', '\x2',  'N',
    '\xAE', '\x5E', 'p',    '\x1A', '\xEC', '\xB3', '\x40', '9',    '\xAC', '\xFE', '\xF2', '\x91',
    '\x89', 'g',    '\x91', '\x85', '\x21', '\xA8', '\x87', '\xB7', 'X',    '\x7E', '\x7E', '\x85',
    '\xBB', '\xCD', 'N',    'N',    'b',    't',    '\x40', '\xFA', '\x93', '\x89', '\xEC', '\x1E',
    '\xEC', '\x86', '\x2',  'H',    '\x26', '\x93', '\xD0', 'u',    '\x1D', '\x7F', '\x9',  '2',
    '\x95', '\xBF', '\x1F', '\xDB', '\xD7', 'c',    '\x8A', '\x1A', '\xF7', '\x5C', '\xC1', '\xFF',
    '\x22', 'J',    '\xC3', '\x87', '\x0',  '\x3',  '\x0',  'K',    '\xBB', '\xF8', '\xD6', '\x2A',
    'v',    '\x98', 'I',    '\x0',  '\x0',  '\x0',  '\x0',  'I',    'E',    'N',    'D',    '\xAE',
    'B',    '\x60', '\x82',
};

```

```cpp
HttpServer::HttpServer(EventLoop* loop,
                       const InetAddress& listenAddr,
                       const string& name,
                       TcpServer::Option option)
  : server_(loop, listenAddr, name, option),
    httpCallback_(detail::defaultHttpCallback)
{
  server_.setConnectionCallback(
      std::bind(&HttpServer::onConnection, this, _1));
  server_.setMessageCallback(
      std::bind(&HttpServer::onMessage, this, _1, _2, _3));
}

void HttpServer::start()
{
  LOG_WARN << "HttpServer[" << server_.name()
    << "] starts listening on " << server_.ipPort();
  server_.start();
}

void HttpServer::onConnection(const TcpConnectionPtr& conn)
{
  if (conn->connected())
  {
    conn->setContext(HttpContext());
  }
}

void HttpServer::onMessage(const TcpConnectionPtr& conn,
                           Buffer* buf,
                           Timestamp receiveTime)
{
  HttpContext* context = boost::any_cast<HttpContext>(conn->getMutableContext());

  if (!context->parseRequest(buf, receiveTime))
  {
    conn->send("HTTP/1.1 400 Bad Request\r\n\r\n");
    conn->shutdown();
  }

  if (context->gotAll())
  {
    onRequest(conn, context->request());
    context->reset();
  }
}

void HttpServer::onRequest(const TcpConnectionPtr& conn, const HttpRequest& req)
{
  const string& connection = req.getHeader("Connection");
  bool close = connection == "close" ||
    (req.getVersion() == HttpRequest::kHttp10 && connection != "Keep-Alive");
  HttpResponse response(close);
  httpCallback_(req, &response);
  Buffer buf;
  response.appendToBuffer(&buf);
  conn->send(&buf);
  if (response.closeConnection())
  {
    conn->shutdown();
  }
}


```

1. 在HttpServer初始化的时候，在TcpServer中设置了自定义的onConnection和onMessage的回调函数，在onConnection中设置了 `conn>setContext(HttpContext());`上下文对象，在onMessage中，设置了自定义的解析函数

2. 在新连接建立后，会触发设置好的onConnection函数

    ```cpp
    void HttpServer::onConnection(const TcpConnectionPtr& conn)
    {
      if (conn->connected())
      {
        conn->setContext(HttpContext());
      }
    }
    ```

    将httpContext上下文设置到TcpConnection的context中

3. 在请求消息到来时，会触发epoll树上的读事件

4. 这个读事件会触发设置好的读回调，也就是TcpConnection::handleRead(Timestamp receiveTime)

    ```cpp
    {
        loop_->assertInLoopThread();
        int savedErrno = 0;
        ssize_t n = inputBuffer_.readFd(channel_->fd(), &savedErrno);
        if (n > 0)
        {
            messageCallback_(shared_from_this(), &inputBuffer_, receiveTime);//如果正确读取数据，会调用我们设置的自定义messageCallback_
        }
        else if (n == 0)
        {
            handleClose();
        }
        else
        {
            errno = savedErrno;
            LOG_SYSERR << "TcpConnection::handleRead";
            handleError();
        }
    }
    ```

    如果正确读取到数据，会调用预先设置到的messageCallback_，将读取到的内容通过buf传进来

    ```cpp
    void HttpServer::onMessage(const TcpConnectionPtr& conn,
                               Buffer* buf,
                               Timestamp receiveTime)
    {
      HttpContext* context = boost::any_cast<HttpContext>(conn->getMutableContext());
    
      if (!context->parseRequest(buf, receiveTime))
      {
        conn->send("HTTP/1.1 400 Bad Request\r\n\r\n");
        conn->shutdown();
      }
    
      if (context->gotAll())
      {
        onRequest(conn, context->request());
        context->reset();
      }
    }
    ```

   然后获取实现设置好的context对象，解析http请求，然后调用onRequest函数，调用httpCallback_函数返回数据。

  有没有好奇一个问题，那就是在onConnection中传入一个context,然后在onMessage中取出context,但是你会发现，在TcpConnection中，没有对context做任何操作，那为什么还需要传入context呢？buf和receiveTime直接传过来，然后Context使用局部变量不就好了吗？

      **原因是TCP是一个流式传输协议**

    在发送数据过来是，TCP 并不保证你每次收到的数据都恰好是一个完整的应用层消息（比如一个完整的 HTTP 请求），一个完整的 HTTP 请求可能会被拆分成多个 TCP 包进行传输。这意味着 `onMessage` 回调可能会被触发多次，每次 `buf` 里只包含请求的一部分，例如：

    1. 第一次 `onMessage`，`buf` 里是 `"GET /index.html HTTP/1.1\r\n"`
    2. 第二次 `onMessage`，`buf` 里是 `"Host: www.example.com\r\n"`
    3. 第三次 `onMessage`，`buf` 里是 `"\r\n"`

    为了效率，TCP 也可能将多个小的数据包合并在一起发送。在 HTTP 的 `Keep-Alive` 模式下，客户端可能会连续发送多个请求。这意味着你的一次 `onMessage` 回调中，`buf` 里可能包含一个半、甚至两个或更多的 HTTP 请求。
    如果`onMessage` 每次都创建一个新的、局部的 `HttpContext` 对象：
    ```cpp
    // 假设使用局部变量
    void HttpServer::onMessage(const TcpConnectionPtr& conn,
                               Buffer* buf,
                               Timestamp receiveTime)
    {
      HttpContext local_context; // 每次都创建一个新的 context
    
      // 场景1：请求被拆分
      // 第一次回调，buf 里只有 "GET /index.html..."，不完整。
      // parseRequest 会解析一部分，然后返回。local_context 随函数结束而被销毁。
      // 第二次回调，buf 里是剩下的部分 "Host: ...\r\n\r\n"。
      // 此时又创建了一个全新的 local_context，它完全不知道之前已经解析过请求行了。
      // 它会尝试把 "Host: ..." 当作一个新的请求行来解析，这必然会导致解析失败。
      local_context.parseRequest(buf, receiveTime);
    
      if (local_context.gotAll()) {
        // ...
      }
    }
    ```

    **局部变量是无状态的**。它无法“记住”上一次 `onMessage` 回调时解析到了哪里。

    `context` 的真正作用：为每个连接维持状态，内部维护一个解析的状态机，记录着请求的解析状态。当一个不完整的 HTTP 请求到达时，`HttpContext` 会解析它所能解析的部分，并记录下当前的状态。当这个连接的下一个数据包到达时，`onMessage` 通过 `conn->getMutableContext()` 获取到的是**同一个 `HttpContext` 实例**，然后继续从上次的状态开始解析。

    `HttpServer` 可能同时处理成千上万个连接，每个连接的 HTTP 请求解析进度都不同。`context` 机制确保了每个连接的解析状态都独立存储，互不干扰。所以看起来传进去啥都没干，实际上是确保了数据的正确解析，将TcpConnecton和应用层解析状态绑定到了一起
