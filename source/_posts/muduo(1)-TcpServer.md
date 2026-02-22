title: muduo(1)-TcpServer
date: 2025-07-29 07:32:00
categories: muduo
tags: [muduo]
---
TcpServer类是用于管理TCP连接的类，它负责管理多个TcpConnection对象，并提供接口来设置连接回调、消息回调、写完成回调等。包含一个Acceptor对象，一个EventLoopThreadPool对象，一个ConnectionMap对象，Acceptor 负责监听新连接，EventLoopThreadPool 负责管理多个EventLoop线程，ConnectionMap 负责管理多个TcpConnection对象。

### 一、类的前置声明

不要直接将一个类作为另一个类的类成员，尽量使用指针，然后通过前置声明减少头文件依赖，加快编译速度

```cpp
class Acceptor;
class EventLoop;
class EventLoopThreadPool;
```

作用：

1. **减少头文件依赖**：如果在头文件里只用到了指针或引用（比如 EventLoop* loop_;），只需要告诉编译器“有这么个类”，不需要知道它的具体实现。这样可以**减少头文件之间的耦合，避免不必要的编译依赖**。
2. **加快编译速度:** 在C++中，`#include` 是一个简单粗暴的文本替换操作。如果在一个头文件 `A.h` 中 `#include "B.h"`，那么任何 `#include "A.h"` 的源文件 (`.cc`) 都会被迫把 `B.h` 的全部内容也包含进来。如果 `B.h` 文件有任何一丁点改动，所有包含了 `A.h` 的源文件，以及包含了那些源文件所生成头文件的其他源文件……全都需要**重新编译**。在一个大型项目中，这可能意味着一次小修改导致数十分钟甚至数小时的编译等待。
3. **防止循环依赖**：如果两个类互相包含对方的头文件，就会导致循环依赖，编译器会报错。前向声明可以避免这种情况。



这种设计是如何工作的：

​	以std::unique_ptr<Acceptor> acceptor_;为例，`class Acceptor;` 这行代码告诉编译器“有一个类叫Acceptor,你不需要管他怎么实现的”，编译器**不需要**知道 `Acceptor` 的完整定义就可以处理 `std::unique_ptr<Acceptor>`。为什么？因为无论 `Acceptor` 本身多复杂，一个指针（或智能指针）的大小是固定的（在64位系统上是8字节）。编译器知道如何为一个指针分配空间。

​	`TcpServer` 只有在它的实现文件 `TcpServer.cc` 中才需要真正地创建 `Acceptor` 对象 (`new Acceptor(...)`) 或者调用它的方法 (`acceptor_->listen()`)。因此，`#include "muduo/net/Acceptor.h"` 这行代码被放在了 `TcpServer.cc` 的开头，而不是头文件中。

​	现在，如果 `Acceptor.h` 或 `EventLoopThreadPool.h` 的内部实现发生了任何改变，只要 `TcpServer.h` 的接口不变，**就只有 `TcpServer.cc` 这一个文件需要重新编译**。所有其他只包含了 `TcpServer.h` 的文件都安然无恙。编译时间从 O(N) 变成了 O(1)。同时，`TcpServer` 的使用者完全不知道 `Acceptor` 的存在，实现细节被完美地隐藏了起来。



什么时候使用头文件？

在头文件里用到了类的完整定义（比如**作为成员变量直接存储对象，而不是指针/引用，或者需要调用成员函数**），就必须 include 头文件。**如果只是用指针、引用、声明参数类型、返回值类型，只需要前向声明。**

### 二、禁用拷贝赋值

通过继承一个禁用掉拷贝和赋值运算符的类实现，避免重复代码，同时，在继承这个类时，可以充当文档告诉其他开发者，这个类时禁止拷贝或者赋值的

```cpp
class noncopyable
{
public:
    noncopyable(const noncopyable&) = delete;
    void operator=(const noncopyable&) = delete;

protected:
    noncopyable() = default;
    ~noncopyable() = default;
};
class TcpServer : noncopyable //继承noncopyable，class继承默认为private
```

原理：**利用 C++ 的继承和访问控制机制，让编译器在你尝试拷贝或赋值时直接报错。流程：通过private继承noncopyable，意味着 noncopyable 的 public 和 protected 成员在 TcpServer 里是 private 的，外部无法访问。**

1、构造和析构是 protected，这样只能被子类构造和析构，不能在外部直接创建 noncopyable 对象。

2、拷贝构造函数和赋值运算符被 = delete，外部和子类都不能访问。

编译器行为：

- 当你写 **TcpServer a; TcpServer b = a; 或 b = a;** 时，编译器会去找 TcpServer 的拷贝构造和赋值运算符。

- 由于 TcpServer 没有自己实现这两个函数，编译器会去基类 noncopyable 里找。

- 发现基类的这两个函数被 = delete，所以编译器直接报错，禁止拷贝和赋值。

### 三、回调函数声明

```cpp
//Callback.h
typedef std::function<void (const TcpConnectionPtr&)> ConnectionCallback;
typedef std::function<void (const TcpConnectionPtr&)> CloseCallback;
typedef std::function<void (const TcpConnectionPtr&)> WriteCompleteCallback;
//TcpServer.h
class TcpServer : noncopyable
{
public:
    typedef std::function<void(EventLoop*)> ThreadInitCallback;
```

刚开始很奇怪，为什么ThreadInitCallback生命在TcpServer.h，而其他回调放在统一放在Callback.h文件中，以为是作者忘记了，后来询问ai，发现是有意为之

原因：

1. ThreadInitCallback 这个类型只和 TcpServer 的线程池初始化有关，它的语义非常专用，只在 TcpServer 相关代码中用到。
2. Callback.h 里一般放的是通用的回调类型，比如 ConnectionCallback、MessageCallback 这种会被很多类用到的回调。
3. 如果把所有只在某个类用到的 typedef 都放到 Callback.h，会让 Callback.h 变得很臃肿、不清晰，反而降低了可维护性。
4. ThreadInitCallback 依赖于 EventLoop 类型，如果放到 Callback.h，就会让 Callback.h 依赖 EventLoop.h，这样会让头文件之间的依赖变复杂，甚至可能引入循环依赖。
5. 一般来说，只在某个类/模块内部用到的类型定义，直接放在对应的头文件里，而不是放到全局的 callback 头文件中。只有那种全局通用的回调类型，才会放到 Callback.h 这种公共头文件。



### 四、变量命名方式

封装，在muduo库中你几乎看不见直接使用底层API，至少都会都会经过一次封装，封装成一个类，同时，使用typedef重命名，明确每一个类的作用

```cpp
typedef std::map<string, TcpConnectionPtr> ConnectionMap;
typedef std::function<void(EventLoop*)> ThreadInitCallback;
AtomicInt32 started_;
TcpServer(EventLoop* loop,
          const InetAddress& listenAddr,
          const string& nameArg,
          Option option = kNoReusePort);
```

目的：

​	这不仅仅是为了隐藏底层细节，更是为了**创造一个比底层API更强大、更安全、更易用的抽象层**。如后面会看见的，**poller**将IO复用模型封装，随时能改变底层的IO复用模型，还有**Socket**同理，不直接使用linux底层的socket函数，这样在移植系统时，无论底层接口是什么，都能直接使用Socket而不需要关心底层，和poller一样，都能随时改变，这种设计的可扩展性就很高。后面还会继续展开muduo库在使用上的各种封装。

​	还有typedef的使用，`std::map<std::string, std::shared_ptr<muduo::net::TcpConnection>>` 这样的类型声明又长又复杂。当您读到 `ConnectionMap` 时，您立刻就能明白它的**意图**——这是一个“存储连接的容器”，而不需要去想着这个复杂map到底是干什么的。



### 五、智能指针使用

在muduo库中，很少能看见裸指针的直接使用，智能指针管理“所有权”，裸指针表示“使用权”

```cpp
EventLoop* loop_; 
std::unique_ptr<Acceptor> acceptor_; 
std::shared_ptr<EventLoopThreadPool> threadPool_;
```

muduo中大量使用智能指针，其根本是RAII的编程思想，作者通过大量封装，充分的利用了RAII思想，如后面会介绍的**Socket**，在析构的时候关闭文件描述符，避免忘记关闭文件描述符，如**MutexLockGuard**，`MutexLockGuard` 类在**构造函数中调用 `mutex_.lock()`**，在**析构函数中调用 `mutex_.unlock()`**等等。



虽然裸指针很少使用，但是可以看到，EventLoop就是一个裸指针

**智能指针 (std::unique_ptr, std::shared_ptr)**：当你使用智能指针时，你是在声明：“**我这个对象，对另一个对象的生命周期负有责任**”。

- `std::unique_ptr<Acceptor> acceptor_` 意味着 `TcpServer` **独占** `Acceptor`，当 `TcpServer` 析构时，`Acceptor` **必须**被销毁。
- `std::shared_ptr<TcpConnection>` 意味着 `TcpServer` 和其他协作者（如回调函数）**共同拥有** `TcpConnection` 的生命周期。

**裸指针 (EventLoop\*)**：当你使用裸指针时，你是在声明：“**我需要使用那个对象，但我不管它的死活，它的生命周期由别人负责**”。这是一种**非拥有（non-owning）**的、观察性的关系。

因为在 muduo 的设计中，**`EventLoop` 的生命周期总是长于使用它的 `TcpConnection` 或 `TcpServer`**。`EventLoop` 对象是在一个线程的栈上创建的，它的生命周期与整个线程的事件循环 `loop.loop()` 绑定。只要这个线程在运行，`EventLoop` 对象就一直存活。**用智能指针明确所有权和生命周期管理，用裸指针表示无所有权的、有生命周期保障的引用。**



RAII思想：

**将任何一种“资源”（文件描述符、内存、锁、线程、甚至是更复杂的对象）的生命周期，与一个栈上对象的生命周期绑定。通过 “对象离开作用域时析构函数必被调用”的特性，来实现资源的自动、安全、无遗漏的释放。**



### 六、类初始化处理

```cpp
TcpServer::TcpServer(EventLoop* loop,
                     const InetAddress& listenAddr,
                     const string& nameArg,
                     Option option)
    : loop_(CHECK_NOTNULL(loop)),//主EventLoop
      ipPort_(listenAddr.toIpPort()),//监听地址
      name_(nameArg),//服务器名称
      acceptor_(new Acceptor(loop, listenAddr, option == kReusePort)),//Acceptor 负责监听新连接
      threadPool_(new EventLoopThreadPool(loop, name_)),//EventLoopThreadPool 负责管理多个EventLoop线程
      connectionCallback_(defaultConnectionCallback),//默认连接回调
      messageCallback_(defaultMessageCallback),//默认消息回调
      nextConnId_(1)//连接计数器，为每一个新到来的 TcpConnection 生成一个独一无二的、递增的ID号。
{
    // 设置Acceptor的回调函数，当有新连接到来时，Acceptor会调用TcpServer的newConnection函数,将新连接封装成一个TcpConnectionPtr
    acceptor_->setNewConnectionCallback(std::bind(&TcpServer::newConnection, this, _1, _2));
}

//Acceptor建立新连接时，调用TcpServer的newConnection函数，将新连接封装成一个TcpConnectionPtr
void TcpServer::newConnection(int sockfd, const InetAddress& peerAddr)
{
    loop_->assertInLoopThread();
    EventLoop* ioLoop = threadPool_->getNextLoop();//获取一个EventLoop线程,将TcpConnection对象放入该线程中
    char buf[64];
    snprintf(buf, sizeof buf, "-%s#%d", ipPort_.c_str(), nextConnId_);
    ++nextConnId_;//连接计数器，为每一个新到来的 TcpConnection 生成一个独一无二的、递增的ID号。
    string connName = name_ + buf;

    InetAddress localAddr(sockets::getLocalAddr(sockfd));
    TcpConnectionPtr conn(new TcpConnection(ioLoop, connName, sockfd, localAddr, peerAddr));
    connections_[connName] = conn;
    //设置TcpConnection的回调函数
    conn->setConnectionCallback(connectionCallback_);// 连接回调
    conn->setMessageCallback(messageCallback_);// 消息回调
    conn->setWriteCompleteCallback(writeCompleteCallback_);// 写完成回调
    conn->setCloseCallback(std::bind(&TcpServer::removeConnection, this, _1)); // 关闭回调
    ioLoop->runInLoop(std::bind(&TcpConnection::connectEstablished, conn)); ////将TcpConnection对象的连接建立事件放入EventLoop线程中执行
}
```

TcpServer在建立连接阶段的作用：

开始的时候，TcpServer在构造函数那里初始化Acceptor,并设置Acceptor建立连接后的回调，这个回调用于将fd封装成一个TcpConnnection并放入到一个EventLoop中，由该EventLoop负责后续的监听。
