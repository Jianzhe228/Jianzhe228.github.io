title: muduo(2)-Acceptor
date: 2025-07-29 07:35:00
categories: muduo
tags: [muduo]
---
Acceptor类是用于接受新连接的类，它负责监听一个端口，当有新的连接到来时，它负责接受这个连接，并调用回调函数处理这个连接。包含一个Socket对象，一个Channel对象，一个NewConnectionCallback对象。**Socket** 对底层的socket文件描述符（sockfd）进行了面向对象的封装，提供了 bind, listen, accept等接口。

### 一、类的初始化

```cpp
Acceptor::Acceptor(EventLoop* loop, const InetAddress& listenAddr, bool reuseport)
    : loop_(loop),
      acceptSocket_(sockets::createNonblockingOrDie(listenAddr.family())), // 1. 创建Socket
      acceptChannel_(loop, acceptSocket_.fd()),                            // 创建Channel
      listening_(false),
      idleFd_(::open("/dev/null",
                     O_RDONLY |
                         O_CLOEXEC)) // 预留一个fd，当accept失败时，释放预留的fd，并重新接受新连接
{
    assert(idleFd_ >= 0);
    acceptSocket_.setReuseAddr(true);
    acceptSocket_.setReusePort(reuseport); // 设置端口复用
    acceptSocket_.bindAddress(listenAddr); // 绑定地址
    // 为 acceptChannel_ 设置一个读回调函数 Acceptor::handleRead。当有新连接到达时，EventLoop
    // 会调用这个函数，handleRead 内部会调用 accept() 来接受连接。
    acceptChannel_.setReadCallback(std::bind(&Acceptor::handleRead, this));
}

// 当有新连接到来时，epoll会返回监听描述符，然后EventLoop会通过之前设置好的Channel来处理这个监听描述符，会调用channel的回调函数，也就是这里的handleRead进行处理，执行accept，并调用TcpServer中的newConnetion函数。
void Acceptor::handleRead()
{
    loop_->assertInLoopThread();
    InetAddress peerAddr;
    int connfd = acceptSocket_.accept(&peerAddr);
    if (connfd >= 0)
    {
        // 在TcpServer的构造函数中设置好了newConnectionCallback_，当有新连接到来时，会调用TcpServer的newConnection函数
        if (newConnectionCallback_)
        {
            newConnectionCallback_(connfd, peerAddr);
        }
        else
        {
            sockets::close(connfd);
        }
    }
    else
    {
        if (errno == EMFILE)
        {
            ::close(idleFd_);                                    // 1. 释放预留的fd
            idleFd_ = ::accept(acceptSocket_.fd(), NULL, NULL);  // 2. 接受新连接
            ::close(idleFd_);                                    // 3. 立即关闭它
            idleFd_ = ::open("/dev/null", O_RDONLY | O_CLOEXEC); // 4. 重新打开一个fd
        }
    }
}

//Acceptor建立新连接时，调用TcpServer的newConnection函数，将新连接封装成一个TcpConnectionPtr
void TcpServer::newConnection(int sockfd, const InetAddress& peerAddr)
{
    loop_->assertInLoopThread();
    EventLoop* ioLoop = threadPool_->getNextLoop();//获取一个EventLoop线程,将TcpConnection对象放入该线程中
    char buf[64];
    snprintf(buf, sizeof buf, "-%s#%d", ipPort_.c_str(), nextConnId_);
    ++nextConnId_;
    string connName = name_ + buf;

    InetAddress localAddr(sockets::getLocalAddr(sockfd));
    TcpConnectionPtr conn(new TcpConnection(ioLoop, connName, sockfd, localAddr, peerAddr));
    connections_[connName] = conn;
    //设置TcpConnection的回调函数
    conn->setConnectionCallback(connectionCallback_);// 连接回调
    conn->setMessageCallback(messageCallback_);// 消息回调
    conn->setWriteCompleteCallback(writeCompleteCallback_);// 写完成回调
    conn->setCloseCallback(std::bind(&TcpServer::removeConnection, this, _1)); // 关闭回调
    ioLoop->runInLoop(std::bind(&TcpConnection::connectEstablished, conn));//将TcpConnection对象的连接建立事件放入EventLoop线程中执行
}
```

宏观上看，Acceptor这个类并不复杂，主要的任务就是负责初始化监听描述符，并设置监听描述符的回调函数handleRead，在新连接到来时，Acceptor会调用Acceptor会调用headleRead建立连接，并调用newConnection回调函数。

```cpp
if (errno == EMFILE)
{
    ::close(idleFd_);                                    // 1. 释放预留的fd
    idleFd_ = ::accept(acceptSocket_.fd(), NULL, NULL);  // 2. 接受新连接
    ::close(idleFd_);                                    // 3. 立即关闭它
    idleFd_ = ::open("/dev/null", O_RDONLY | O_CLOEXEC); // 4. 重新打开一个fd
}
```

当服务器并发连接数非常高时，可能会耗尽进程可用的文件描述符（fd）。这时，`accept()` 会失败并返回 `EMFILE` 错误。如果不处理，服务器将无法接受任何新连接，相当于“假死”。

**muduo 的解决方案：**

1. `Acceptor` 在构造时，就预先打开一个指向 `/dev/null` 的文件描述符 `idleFd_`。它就像一个“备用座位”。
2. 当 `accept` 因 `EMFILE` 失败时，`Acceptor` 会**立即关闭这个备用的 `idleFd_`**，从而释放出一个文件描述符名额。
3. 有了这个名额，`Acceptor` 就能成功 `accept()` 那个等待中的新连接。
4. 为了避免新连接因为没有被处理而丢失，`Acceptor` **会立即 `close()` 这个刚刚接受的连接**。这虽然拒绝了客户端，但保证了服务器自身不会卡死，并且向客户端发出了一个明确的拒绝信号（`RST`），客户端可以稍后重试。
5. 最后，`Acceptor` 会再次打开 `/dev/null` 来重新占用 `idleFd_`，为下一次 `EMFILE` 危机做好准备。

这个技巧确保了即使在 fd 耗尽的极端情况下，`Acceptor` 所在的 `EventLoop` 也能正常运转，不会因为 `accept` 不断失败而陷入死循环



**SO_RESUCEADDR和SO_RESUCEPORT的区别**

| 特性            | `SO_REUSEADDR` (地址复用)                                    | `SO_REUSEPORT` (端口复用)                                    |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **核心目的**    | **服务器快速重启**                                           | **性能扩展 (负载均衡)**                                      |
| **解决问题**    | 允许新启动的服务器立即绑定一个处于 `TIME_WAIT` 状态的端口    | 允许多个独立的监听套接字绑定到完全相同的 IP 和端口。         |
| **工作模式**    | 一个端口在同一时间**仍然只能被一个**监听套接字绑定。         | 一个端口可以被**多个**监听套接字同时绑定。                   |
| **适用场景**    | 几乎所有服务器程序都应该开启，用于开发和运维中的快速迭代和重启。 | 面向高性能、高并发连接的服务器，用于在多核 CPU 上扩展 `accept` 的处理能力。 |
| **在 muduo 中** | **默认开启**                                                 | **默认关闭**，需要显式开启。                                 |

在标准的 `TcpServer` 模型中，只有一个主线程负责 `accept` 所有新连接，但当服务器面临**极高的连接建立速率**时就会成为整个系统的**性能瓶颈**。`acceptSocket_.setReusePort(reuseport);` ,也就是**SO_RESUCEPORT** ，这个选项允许多个线程或进程创建各自的监听套接字，并**全部绑定到同一个 IP 和端口上**。当新连接到来时，**内核**会负责进行负载均衡，将这个连接请求“派发”给其中一个监听套接字。这样一来，`accept` 的工作就被均匀地分摊到了多个 CPU 核心上。

更多细节，见：https://stackoverflow.com/questions/14388706/how-do-so-reuseaddr-and-so-reuseport-differ





仔细看的话，还能发现建立连接的是一个acceptSocket_，而不是系统的accept函数，这是muduo对系统调用的封装，提高扩展性

```cpp
Socket acceptSocket_;
/// 对底层的socket文件描述符（sockfd）进行了面向对象的封装，提供了 bind, listen, accept 等接口。
class Socket : noncopyable
{
public:
    explicit Socket(int sockfd) : sockfd_(sockfd)
    {
    }
    ~Socket();
    int fd() const
    {
        return sockfd_;
    }
    bool getTcpInfo(struct tcp_info*) const;
    bool getTcpInfoString(char* buf, int len) const;
    void bindAddress(const InetAddress& localaddr);
    void listen();
    int accept(InetAddress* peeraddr);
    void shutdownWrite();
    void setTcpNoDelay(bool on);
    void setReuseAddr(bool on);
    void setReusePort(bool on);
    void setKeepAlive(bool on);

private:
    const int sockfd_;
};
//Socket封装socket,利用RAII思想关闭文件描述符，避免忘记关闭
Socket::~Socket()
{
  sockets::close(sockfd_);
}
//Socket
void Socket::listen()
{
  sockets::listenOrDie(sockfd_);
}
//sockets
void sockets::listenOrDie(int sockfd)
{
  //设置等待连接队列的最大长度(SOMAXCONN)。
  int ret = ::listen(sockfd, SOMAXCONN);
  if (ret < 0)
  {
    LOG_SYSFATAL << "sockets::listenOrDie";
  }
}

```

可以看见，Socket内部的实现都放在一个名为sockets的作用域中，设计思想：**Socket作为一个抽象层，我们在使用的时候不需要考虑不同平台的调用方式，底层的sockets负责实现阔平台逻辑**



### 二、挂载EventLoop

我们发现，Acceptor没有调用listen函数进行监听，实际上开始监听的操作是在TcpServer的start函数实现的

```cpp
void TcpServer::start()
{
    if (started_.getAndSet(1) == 0)
    {
        //启动EventLoop线程池
        threadPool_->start(threadInitCallback_);

        assert(!acceptor_->listening());
        //将 Acceptor::listen() 的调用任务放入EventLoop 的待执行队列中,这确保了所有和 EventLoop 相关的操作都在同一个I/O线程中执行，避免了锁竞争
        loop_->runInLoop(std::bind(&Acceptor::listen, get_pointer(acceptor_)));
    }
}

void EventLoop::runInLoop(Functor cb)
{
    if (isInLoopThread())
    {
        cb();
    }
    else
    {
        queueInLoop(std::move(cb));
    }
}

void Acceptor::listen()
{
    loop_->assertInLoopThread();
    listening_ = true;
    // 将socket设置为监听状态，并设置等待连接队列的最大长度(SOMAXCONN)。
    acceptSocket_.listen();
    // 放到epoll树上，注册可读事件
    acceptChannel_.enableReading();
}


```

在TcpServer::start函数启动后，loop_->runInLoop(std::bind(&Acceptor::listen, get_pointer(acceptor_)));会将Acceptor::listen函数启动开始监听，并将文件描述符放到主线程的epoll树上监听读实现，当事件触发时，会调用文件描述符的读回调，也就是headleRead函数处理连接。。
