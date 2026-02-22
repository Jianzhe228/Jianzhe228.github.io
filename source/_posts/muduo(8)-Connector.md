title: muduo(8)-Connector
date: 2025-07-31 08:03:00
categories: muduo
tags: [muduo]
---
断开连接重试机制

```cpp
void Connector::retry(int sockfd)
{
    sockets::close(sockfd);
    setState(kDisconnected);
    if (connect_)
    {
        loop_->runAfter(retryDelayMs_ / 1000.0,std::bind(&Connector::startInLoop, shared_from_this()));
        retryDelayMs_ = std::min(retryDelayMs_ * 2, kMaxRetryDelayMs);
    }
    else
    {
        LOG_DEBUG << "do not connect";
    }
}
```

muduo在尝试重连时，并不是立刻进行连接，而是创建一个定时任务，并且，这个定时任务的间隔时间越来越长，通过翻倍的方式进行，知道最大间隔时长kMaxRetryDelayMs，避免频繁的尝试重连对服务器造成压力。



 muduo 中 `TcpClient` 从开始连接到关闭重试的完整生命周期

**阶段一：客户端初始化**

在创建一个 `TcpClient` 对象时，主要完成了以下工作：

1. 构造函数会保存 `EventLoop` 指针、服务器地址 InetAddress 和客户端名称。
2. TcpClient 自身不处理连接的细节，而是将这个任务委托给一个内部的 Connector 对象。**Connector 的核心职责就是与服务器建立连接**。
3. TcpClient 会向 Connector 注册一个回调函数 TcpClient::newConnection。这个**回调函数会在 Connector 成功建立连接后被调用。**

```cpp
TcpClient::TcpClient(EventLoop* loop, const InetAddress& serverAddr, const string& nameArg)
    : loop_(CHECK_NOTNULL(loop)),
      connector_(new Connector(loop, serverAddr)),
      name_(nameArg),
      connectionCallback_(defaultConnectionCallback),
      messageCallback_(defaultMessageCallback),
      retry_(false),
      connect_(true),
      nextConnId_(1)
{
    connector_->setNewConnectionCallback(std::bind(&TcpClient::newConnection, this, _1));//设置成功连接的回调函数
}
```

**阶段二：发起连接**

1. 调用TcpClient::connect函数连接服务器

    ```cpp
    void TcpClient::connect()
    {
        connect_ = true;
        connector_->start();
    }
    ```

2. 启动connector，调用connector::start()函数

    ```cpp
    void Connector::start()
    {
        connect_ = true;
        loop_->runInLoop(std::bind(&Connector::startInLoop, this)); // FIXME: unsafe
    }
    
    void Connector::startInLoop()
    {
        loop_->assertInLoopThread();
        assert(state_ == kDisconnected);
        if (connect_)
        {
            connect();
        }
        else
        {
            LOG_DEBUG << "do not connect";
        }
    }
    
    void Connector::connect()
    {
        int sockfd = sockets::createNonblockingOrDie(serverAddr_.family());
        int ret = sockets::connect(sockfd, serverAddr_.getSockAddr());
        int savedErrno = (ret == 0) ? 0 : errno;
        switch (savedErrno)
        {
        case 0:
        case EINPROGRESS:
        case EINTR:
        case EISCONN:
            connecting(sockfd);
            break;
    
        case EAGAIN:
        case EADDRINUSE:
        case EADDRNOTAVAIL:
        case ECONNREFUSED:
        case ENETUNREACH:
            retry(sockfd);
            break;
    
        case EACCES:
        case EPERM:
        case EAFNOSUPPORT:
        case EALREADY:
        case EBADF:
        case EFAULT:
        case ENOTSOCK:
            LOG_SYSERR << "connect error in Connector::startInLoop " << savedErrno;
            sockets::close(sockfd);
            break;
    
        default:
            LOG_SYSERR << "Unexpected error in Connector::startInLoop " << savedErrno;
            sockets::close(sockfd);
            // connectErrorCallback_();
            break;
        }
    }
    
    ```

3. start函数内部调用将Connector::startInLoop任务放到反应堆中执行，然后执行connect();函数，这个函数是非阻塞的，所以立即返回

    - 如果返回 `0`，表示连接立即成功（通常发生在连接本地地址时）。
    - 如果返回 `-1` 且 `errno` 为 `EINPROGRESS`，表示连接正在进行中。这是最常见的情况。
    - 其他错误则表示连接失败，可能会触发重试逻辑。

    调用connecting函数，关注它的写事件

    ```cpp
    void Connector::connecting(int sockfd)
    {
        setState(kConnecting);
        assert(!channel_);
        channel_.reset(new Channel(loop_, sockfd));
        channel_->setWriteCallback(std::bind(&Connector::handleWrite, this)); 
        channel_->setErrorCallback(std::bind(&Connector::handleError, this)); 
    
        channel_->enableWriting();
    }
    
    ```

**阶段三：连接建立成功**

1. 当建立连接成功时，poller触发时间，调用Connector::handleWrite方法，在这个方法中，会检验是否真的连接成功了，如果连接成功，调用newConnectionCallback_方法，也就是TcpClient::newConnection方法

    ```cpp
    void Connector::handleWrite()
    {
        LOG_TRACE << "Connector::handleWrite " << state_;
    
        if (state_ == kConnecting)
        {
            int sockfd = removeAndResetChannel();
            // 获取socket的错误码，判断是否真的连接成功了，0表示连接成功，非0表示连接失败
            int err = sockets::getSocketError(sockfd);
            if (err)
            {
                LOG_WARN << "Connector::handleWrite - SO_ERROR = " << err << " " << strerror_tl(err);
                // 尝试重连
                retry(sockfd);
            }
            // 判断是否是自连接，如果是自连接，则尝试重连
            else if (sockets::isSelfConnect(sockfd))
            {
                LOG_WARN << "Connector::handleWrite - Self connect";
                retry(sockfd);
            }
            // 连接成功，设置状态为已连接，并调用回调函数
            else
            {
                setState(kConnected);
                if (connect_)
                {
                    newConnectionCallback_(sockfd);
                }
                else
                {
                    sockets::close(sockfd);
                }
            }
        }
        else
        {
            // what happened?
            assert(state_ == kDisconnected);
        }
    }
    
    void TcpClient::newConnection(int sockfd)
    {
        loop_->assertInLoopThread();
        // 获取对端地址
        InetAddress peerAddr(sockets::getPeerAddr(sockfd));
        char buf[32];
        // 格式化连接名称
        snprintf(buf, sizeof buf, ":%s#%d", peerAddr.toIpPort().c_str(), nextConnId_);
        ++nextConnId_;
        // 连接名称
        string connName = name_ + buf;
    
        // 获取本地地址
        InetAddress localAddr(sockets::getLocalAddr(sockfd));
        // 创建TcpConnection对象
        TcpConnectionPtr conn(new TcpConnection(loop_, connName, sockfd, localAddr, peerAddr));
    
        // 设置回调函数
        conn->setConnectionCallback(connectionCallback_);
        conn->setMessageCallback(messageCallback_);
        // 设置写完成回调函数
        conn->setWriteCompleteCallback(writeCompleteCallback_);
        conn->setCloseCallback(std::bind(&TcpClient::removeConnection, this, _1));
        // 设置连接
        {
            MutexLockGuard lock(mutex_);
            connection_ = conn;
        }
        conn->connectEstablished();
    }
    
    void TcpConnection::connectEstablished()
    {
        loop_->assertInLoopThread();
        assert(state_ == kConnecting);
        setState(kConnected);
        channel_->tie(shared_from_this());
        channel_->enableReading();
    
        connectionCallback_(shared_from_this());
    }
    ```

    TcpClient::newConnection会设置各种回调，然后调用TcpConnection::connectEstablished方法，开始监听读事件，然后调用connectionCallback_提示建立连接成功

    

**阶段四：连接断开与触发重试**

连接可能因为多种原因断开：客户端主动断开、服务器断开、网络故障等。

**检测到断开**：

- **对端关闭**：`TcpConnection::handleRead` 在 `read()` 时返回 `0`，表示对端关闭了连接。
- **发生错误**：`handleRead` 读取时出错，或 `handleError` 被调用。

```cpp
void TcpConnection::handleRead(Timestamp receiveTime)
{
    loop_->assertInLoopThread();
    int savedErrno = 0;
    ssize_t n = inputBuffer_.readFd(channel_->fd(), &savedErrno);
    if (n > 0)
    {
        messageCallback_(shared_from_this(), &inputBuffer_, receiveTime);
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

void TcpConnection::handleClose()
{
    loop_->assertInLoopThread();
    LOG_TRACE << "fd = " << channel_->fd() << " state = " << stateToString();
    assert(state_ == kConnected || state_ == kDisconnecting);

    setState(kDisconnected);
    channel_->disableAll();

    TcpConnectionPtr guardThis(shared_from_this());
    connectionCallback_(guardThis);

    closeCallback_(guardThis);
}
```

1. 将连接状态设置为 `kDisconnected`。
2. 从 `Poller` 中移除所有事件监听。
3. 调用用户的 `ConnectionCallback`，通知连接已断开。
4. 调用内部设置的 `closeCallback_`，也就是 `TcpClient::removeConnection`。

```cpp
void TcpClient::removeConnection(const TcpConnectionPtr& conn)
{
    loop_->assertInLoopThread();
    assert(loop_ == conn->getLoop());

    {
        MutexLockGuard lock(mutex_);
        assert(connection_ == conn);
        connection_.reset();
    }

    loop_->queueInLoop(std::bind(&TcpConnection::connectDestroyed, conn));
    if (retry_ && connect_)
    {
        connector_->restart();
    }
}

void TcpConnection::connectDestroyed()
{
    loop_->assertInLoopThread();
    if (state_ == kConnected)
    {
        setState(kDisconnected);
        channel_->disableAll();

        connectionCallback_(shared_from_this());
    }
    channel_->remove();
}
```

1. 释放对 `TcpConnection` 对象的引用。`TcpConnection` 对象会在其所在的 I/O 线程中被安全地销毁。
2. 检查retry_和connect_标志判断是否重试



**阶段五：执行重试**

```cpp
void Connector::restart()
{
    loop_->assertInLoopThread();
    setState(kDisconnected);
    retryDelayMs_ = kInitRetryDelayMs;
    connect_ = true;
    startInLoop();
}

void Connector::startInLoop()
{
    loop_->assertInLoopThread();
    assert(state_ == kDisconnected);
    if (connect_)
    {
        connect();
    }
    else
    {
        LOG_DEBUG << "do not connect";
    }
}

void Connector::retry(int sockfd)
{
    sockets::close(sockfd);
    setState(kDisconnected);
    if (connect_)
    {
        loop_->runAfter(retryDelayMs_ / 1000.0,
                        std::bind(&Connector::startInLoop, shared_from_this()));
        retryDelayMs_ = std::min(retryDelayMs_ * 2, kMaxRetryDelayMs);
    }
    else
    {
        LOG_DEBUG << "do not connect";
    }
}

```

然后重试连接失败，调用retry(sockfd);函数重试，这个过程会一直循环，直到连接成功或用户调用 `stop()`



**阶段六：客户端关闭**

```cpp
void Connector::stop()
{
    connect_ = false;
    loop_->queueInLoop(std::bind(&Connector::stopInLoop, this)); 
}

void Connector::stopInLoop()
{
    loop_->assertInLoopThread();
    if (state_ == kConnecting)
    {
        setState(kDisconnected);
        int sockfd = removeAndResetChannel();
        retry(sockfd);
    }
}

int Connector::removeAndResetChannel()
{
    //取消监听事件
    channel_->disableAll();
    //删除poller上的监听
    channel_->remove();
    int sockfd = channel_->fd();
    loop_->queueInLoop(std::bind(&Connector::resetChannel, this)); 
    return sockfd;
}

void Connector::resetChannel()
{
    channel_.reset();
}
```

当 `TcpClient` 对象析构时，它会确保 `Connector` 被停止，并且如果还存在 `TcpConnection`，会通过 `forceClose()` 强制关闭它，保证所有资源被正确释放。

```cpp
TcpClient::~TcpClient()
{
    LOG_INFO << "TcpClient::~TcpClient[" << name_ << "] - connector " << get_pointer(connector_);
    TcpConnectionPtr conn;
    bool unique = false;
    {
        MutexLockGuard lock(mutex_);
        unique = connection_.unique();
        conn = connection_;
    }
    if (conn)
    {
        assert(loop_ == conn->getLoop());
        // FIXME: not 100% safe, if we are in different thread
        CloseCallback cb = std::bind(&detail::removeConnection, loop_, _1);
        loop_->runInLoop(std::bind(&TcpConnection::setCloseCallback, conn, cb));
        if (unique)
        {
            conn->forceClose();
        }
    }
    else
    {
        connector_->stop();
        // FIXME: HACK
        loop_->runAfter(1, std::bind(&detail::removeConnector, connector_));
    }
}
```

