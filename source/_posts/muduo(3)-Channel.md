title: muduo(3)-Channel
date: 2025-07-29 07:36:00
categories: muduo
tags: [muduo]
---
Channel类是用于管理文件描述符的类，它负责管理一个文件描述符的读写事件，*并提供接口来设置读写回调、关闭回调、错误回调等。包含一个EventLoop对象，一个文件描述符，一个事件类型，一个回调函数。**是TcpConnection和EventLoop交流的桥梁**

```cpp
class Channel : noncopyable
{
private:
    static string eventsToString(int fd, int ev);

    void update();
    void handleEventWithGuard(Timestamp receiveTime);

    static const int kNoneEvent;  // 表示不关注任何事件，即不关注读写事件
    static const int kReadEvent;  // 表示关注读事件，即POLLIN | POLLPRI
    static const int kWriteEvent; // 表示关注写事件，即POLLOUT

    EventLoop* loop_; // 指向所属的 EventLoop
    const int fd_;    // 封装的文件描述符
    int events_;      // 感兴趣的事件类型
    int revents_;     // 实际发生的事件类型,Channel::handleEvent 方法会根据 revents_ 的值来决定调用哪个具体的回调函数。
    int index_;   // 记录该 Channel 在 Poller 中的状态，避免了不必要的系统调用
    bool logHup_; // 是否记录HUP事件日志，连接断开时会触发HUP事件

    std::weak_ptr<void> tie_;
    bool tied_;
    bool eventHandling_;//一个状态标志,当 Channel 正在执行 handleEvent 方法时，这个值设置为 true,结束时设为false，防止在事件处理过程中发生重入
    bool addedToLoop_;//一个状态标志，表示这个 `Channel` 是否已经被添加到 `EventLoop` 的 `Poller` 中
    ReadEventCallback readCallback_;
    EventCallback writeCallback_;
    EventCallback closeCallback_;
    EventCallback errorCallback_;
};
```

**index_**

​	通过index_实现一种状态记录机制，这种机制决定着poller中的行为，以epoll为例的话，就是决定ADD,DELETE,MOD等操作，如果没有这个index_的话，在每一个事件触发时，epoll不知道要执行什么操作，他不知道这个fd是否在epoll树上。在查看muduo如何实现之前，我们看一下下面的实现，存在哪些问题

```cpp
void TcpServer::run()
{
    this->m_thread_pool->run();
    auto *channel = new Channel(this->m_lfd, FDEvent::ReadEvent, TcpServer::accept_connection,
                                nullptr, nullptr, this);
    this->m_main_loop->add_task(channel, ElementType::ADD);//将监听描述符放到epoll树上
    this->m_main_loop->run();
}

struct ChannelElement
{
    // 处理节点的类型,ADD,DELETE,MODIFY
    ElementType type;
    Channel *channel;
};

int EventLoop::add_task(Channel *channel, const ElementType type)
{
    this->m_mutex.lock();
    auto *node = new class ChannelElement();//包装一个任务
    node->channel = channel;
    node->type = type;
    this->m_task_q.push(node);
    this->m_mutex.unlock();

    if (this->m_thread_id == std::this_thread::get_id())
    {
        std::cout << "\n--------------子线程进入(evLoop->threadId == pthread_self()),threadName = "<< this->m_thread_name
        + ", threadID = " << this->m_thread_id << std::endl;
        process_taskQ();
    } else
    {
        printf("\n----------主线程进入task_wake_up,threadID = %lu\n\n", pthread_self());
        task_wake_up();
    }
    return 0;
}

void EventLoop::process_taskQ()
{

    while (!this->m_task_q.empty())
    {
        this->m_mutex.lock();
        const auto node = m_task_q.front();
        m_task_q.pop();
        this->m_mutex.unlock();
        if (node->type == ElementType::ADD)//根据任务类型中的定义匹配对应的实现
        {
            add(node->channel);
        } else if (node->type == ElementType::DELETE)
        {
            remove(node->channel);
        } else
        {
            modify(node->channel);
        }
        delete node;
    }
}
```

上面这个例子存一个问题，那就是效率低，每次添加一个任务，都需要执行一次：new ChannelElement(),m_task_q.push(node)和m_task_q.pop();，同时还要获取互斥锁。是一种**命令机制**

而muduo的做法是一种**状态机制**

```cpp
void EPollPoller::updateChannel(Channel* channel)
{
  Poller::assertInLoopThread();
  const int index = channel->index();
  LOG_TRACE << "fd = " << channel->fd()
    << " events = " << channel->events() << " index = " << index;
  
  if (index == kNew || index == kDeleted)
  {
    // a new one, add with EPOLL_CTL_ADD
    int fd = channel->fd();
    if (index == kNew)
    {
      assert(channels_.find(fd) == channels_.end());
      //如果是新的，将它添加到 Poller 的 map 中进行管理
      channels_[fd] = channel;
    }
    else // index == kDeleted
    {
      assert(channels_.find(fd) != channels_.end());
      //原本就存在于 map 中，只不过之前被停用了，现在重新激活
      assert(channels_[fd] == channel);
    }
    // 更新状态为“已添加”，并调用 epoll_ctl(ADD) 将其加入内核监听
    channel->set_index(kAdded);
    update(EPOLL_CTL_ADD, channel);
  }
  else// 否则就是KAdded状态，即已经关注了该事件
  {
    // 如果 Channel 不再关心任何事件
    int fd = channel->fd();
    (void)fd;
    assert(channels_.find(fd) != channels_.end());
    assert(channels_[fd] == channel);
    assert(index == kAdded);
    // 如果该事件不关注了，调用 epoll_ctl(DEL) 从内核监听中移除
    if (channel->isNoneEvent())
    {
      update(EPOLL_CTL_DEL, channel);
      channel->set_index(kDeleted);
    }
    else
    {
      // Channel 关心的事件类型发生了变化
      update(EPOLL_CTL_MOD, channel);
    }
  }
}
```

通过一个标志位index_记录channel的处理状态，不需要每次都new 出一个类似的ChannelElement，即使是push到activeChannels，其速度也是非常快的，因为push的是一个本就存在的指针

| 对比         | `activeChannels.push_back(channel)` | `task_queue.push(new ...)`         |
| ------------ | ----------------------------------- | ---------------------------------- |
| **操作对象** | 拷贝一个**裸指针**                  | 拷贝一个**裸指针**                 |
| **内存管理** | **无** (操作的是已存在的对象)       | **有** (必须先 `new`，后 `delete`) |
| **性能开销** | **极低** (一次指针拷贝)             | **高** (一次堆分配 + 一次堆释放)   |



**tie_和tied_**

​	**解决 `TcpConnection` 的生命周期安全问题**。`TcpConnection` 是通过 `std::shared_ptr` 管理的， `Channel` 内部的回调函数如果直接捕获 `shared_ptr` 会导致循环引用。`tie_` 用于保存一个指向 `TcpConnection` 的 `weak_ptr`。在 `handleEvent` 执行回调前，会尝试将 `weak_ptr`提升为 `shared_ptr`。如果提升成功，说明 `TcpConnection` 对象还活着（**通过 tie_.lock() 在事件处理期间"锁住"对象，确保其不会被销毁**），就安全地执行回调；如果失败，说明 `TcpConnection` 已经被销毁了，就不再执行回调，从而避免了对悬空指针的访问。`tied_` 只是一个标志，表示是否启用了这个机制。

```cpp
//1
void TcpConnection::connectEstablished()
{
    // ...
    channel_->tie(shared_from_this());  // 将TcpConnection的shared_ptr绑定到Channel
    // ...
}
//2
void Channel::tie(const std::shared_ptr<void>& obj)
{
    tie_ = obj;    // 以weak_ptr形式存储，不增加引用计数
    tied_ = true;  // 标记已绑定
}
//3
void Channel::handleEvent(Timestamp receiveTime)
{
    std::shared_ptr<void> guard;
    if (tied_)
    {
        guard = tie_.lock();  // 尝试将weak_ptr转换为shared_ptr
        if (guard)
        {
            handleEventWithGuard(receiveTime);  // 有guard保护下处理事件
        }
        // 如果guard为空，说明对象已销毁，直接跳过处理
    }
    else
    {
        handleEventWithGuard(receiveTime);  // 未绑定时直接处理
    }
}


```

**shared_from_this():用于在对象内部安全地获取指向自身的 shared_ptr**,这里为什么不能直接使用 this 指针呢？

```cpp
class BadExample {
public:
    std::shared_ptr<BadExample> getSharedPtr() {
        return std::shared_ptr<BadExample>(this); 
    }
};

// 使用时会出现问题
auto ptr1 = std::make_shared<BadExample>();
auto ptr2 = ptr1->getSharedPtr();  // 创建了两个独立的控制块！
// 当 ptr1 和 ptr2 都析构时，对象会被删除两次 -> 崩溃
```

TcpConnection 通过继承 **std::enable_shared_from_this<TcpConnection>** 来解决这个问题。

