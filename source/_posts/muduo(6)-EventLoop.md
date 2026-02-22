title: muduo(6)-EventLoop
date: 2025-07-29 07:38:00
categories: muduo
tags: [muduo]
---
### 一、线程安全注解

充分利用编译器

```cpp
EventLoop* loop_ GUARDED_BY(mutex_);

class SCOPED_CAPABILITY MutexLockGuard : noncopyable
{
 public:
  explicit MutexLockGuard(MutexLock& mutex) ACQUIRE(mutex)
    : mutex_(mutex)
  {
    mutex_.lock();
  }

  ~MutexLockGuard() RELEASE()
  {
    mutex_.unlock();
  }

 private:

  MutexLock& mutex_;
};
#define MutexLockGuard(x) error "Missing guard object name"
```

`EventLoop* loop_ GUARDED_BY(mutex_);` 是一种线程安全注解，**通常用于标注某个成员变量的访问需要特定的锁保护**。在这个例子中，`loop_` 的访问需要由 `mutex_` 互斥锁保护。

在编译时，静态分析工具会检查代码中是否正确地在访问 `loop_` 时持有 `mutex_` 锁。如果没有持有锁，工具会发出警告或错误提示。`GUARDED_BY` 是一种编译期的注解，对运行时行为没有直接影响。它不会生成额外的代码，也不会影响程序的性能。为开发者提供明确的线程安全约定，提醒其他人维护代码时遵守这些规则。

**MutexLockGuard(x)是一种防止用法错误的技巧宏**，目的是防止你写出如下代码：

```cpp
MutexLockGuard(mutex_);
```

这样写会创建一个临时的 MutexLockGuard 对象，它在这一行代码结束后就被销毁，锁也会立即释放，根本起不到加锁保护作用！宏定义把 MutexLockGuard(x) 替换成 error "Missing guard object name"。如果你写了 MutexLockGuard(mutex_);，编译器会报错：“Missing guard object name”。这样强制你必须写变量名，防止误用。

`SCOPED_CAPABILITY，ACQUIRE，RELEASE`都是配合Clang编译器检查使用的

`SCOPED_CAPABILITY` 是一个线程安全注解宏，这个类是一个“作用域锁”，构造函数是“加锁”，析构函数是“解锁”。

`ACQUIRE`(mutex) 也是线程安全注解宏，函数会“获取”某个锁（mutex）。

`RELEASE`()也是线程安全注解宏，函数会“释放”锁（mutex）。

通过Clang编译时检查，见：Thread Safety Analysis: https://clang.llvm.org/docs/ThreadSafetyAnalysis.html

### 二、事件处理模式

```cpp
while (!quit_)
{
    activeChannels_.clear();
    //activeChannels_是一个传入传出参数，保存着有事件发生的Channel
    pollReturnTime_ = poller_->poll(kPollTimeMs, &activeChannels_);
    ++iteration_;
    // TODO sort channel by priority
    eventHandling_ = true;
    //遍历activeChannels_，调用Channel的handleEvent方法
    for (Channel* channel : activeChannels_)
    {
        currentActiveChannel_ = channel;
        currentActiveChannel_->handleEvent(pollReturnTime_);
    }
    currentActiveChannel_ = NULL;
    eventHandling_ = false;
    doPendingFunctors();
}
// epoll监听
Timestamp EPollPoller::poll(int timeoutMs, ChannelList* activeChannels)
{
  LOG_TRACE << "fd total count " << channels_.size();
  int numEvents = ::epoll_wait(epollfd_,
                               &*events_.begin(),
                               static_cast<int>(events_.size()),
                               timeoutMs);
  int savedErrno = errno;
  Timestamp now(Timestamp::now());
  if (numEvents > 0)
  {
    LOG_TRACE << numEvents << " events happened";
    //将监听到的全部事件都转移到activeChannels，单一职责，poller只负责 I/O 复用，事件处理是EventLoop的职责
    fillActiveChannels(numEvents, activeChannels);
    if (implicit_cast<size_t>(numEvents) == events_.size())
    {
      events_.resize(events_.size()*2);
    }
  }
  else if (numEvents == 0)
  {
    LOG_TRACE << "nothing happened";
  }
  else
  {
    // error happens, log uncommon ones
    if (savedErrno != EINTR)
    {
      errno = savedErrno;
      LOG_SYSERR << "EPollPoller::poll()";
    }
  }
  return now;
}

void EPollPoller::fillActiveChannels(int numEvents,
                                     ChannelList* activeChannels) const
{
  assert(implicit_cast<size_t>(numEvents) <= events_.size());
  for (int i = 0; i < numEvents; ++i)
  {
    Channel* channel = static_cast<Channel*>(events_[i].data.ptr);
#ifndef NDEBUG
    int fd = channel->fd();
    ChannelMap::const_iterator it = channels_.find(fd);
    assert(it != channels_.end());
    assert(it->second == channel);
#endif
    channel->set_revents(events_[i].events);
    activeChannels->push_back(channel);
  }
}
```

`Poller` 的职责是 I/O 复用，而 `EventLoop` 的职责是事件分发。通过activeChannels_将两者分开，可以使系统结构更清晰、耦合度更低、更易于扩展。



```cpp
if (implicit_cast<size_t>(numEvents) == events_.size())
{
events_.resize(events_.size()*2);
}
```

epoll返回的数量等于我们传入的最大数量，说明epoll内部其实有更多的事件触发，只不过受限于我们传入的`static_cast<int>(events_.size())`无法全部传出，所以需要扩容方便后续处理更多事件



```cpp
eventHandling_ = true;
//遍历activeChannels_，调用Channel的handleEvent方法
for (Channel* channel : activeChannels_)
{
    currentActiveChannel_ = channel;
    currentActiveChannel_->handleEvent(pollReturnTime_);
}
currentActiveChannel_ = NULL;
eventHandling_ = false;
```

eventHandling作为一个状态标志，防止在处理activeChannels_中的事件时，修改activeChannels_中的信息导致出差。**不能在遍历一个容器的同时修改它**。

如在removeChannel函数中

```cpp
void EventLoop::removeChannel(Channel* channel)
{
assert(channel->ownerLoop() == this);
assertInLoopThread();
if (eventHandling_)
{
assert(currentActiveChannel_ == channel ||
   std::find(activeChannels_.begin(), activeChannels_.end(), channel) ==
       activeChannels_.end());
}
poller_->removeChannel(channel);
}
```

在取出一个channel时，必须要确保当前活跃的channel和要删除channel一致或者不在activeChannels_中的chennel，如果两个channel不一致且存在activeChannels_中，就可能会发生异常情况，在

```cpp
for (Channel* channel : activeChannels_)
{
    currentActiveChannel_ = channel;
    currentActiveChannel_->handleEvent(pollReturnTime_);
}
```

中执行到被删除的channel时就可能会发生错误(空指针)



### 三、职责单一原则

muduo强调类职责单一原则，其他类通过runInLoop添加到EventLoop中的**pendingFunctors_**，这个**pendingFunctors_**在EventLoop处理完全部epoll事件后统一处理。

```cpp
while (!quit_)
{
    activeChannels_.clear();
    // activeChannels_是一个传入传出参数，保存着有事件发生的Channel
    pollReturnTime_ = poller_->poll(kPollTimeMs, &activeChannels_);
    ++iteration_;
    if (Logger::logLevel() <= Logger::TRACE)
    {
        printActiveChannels();
    }
    // TODO sort channel by priority
    eventHandling_ = true;
    // 遍历activeChannels_，调用Channel的handleEvent方法
    for (Channel* channel : activeChannels_)
    {
        currentActiveChannel_ = channel;
        currentActiveChannel_->handleEvent(pollReturnTime_);
    }
    currentActiveChannel_ = NULL;
    eventHandling_ = false;
    doPendingFunctors();
}

void EventLoop::doPendingFunctors()
{
    std::vector<Functor> functors;
    callingPendingFunctors_ = true;

    {
        MutexLockGuard lock(mutex_);
        functors.swap(pendingFunctors_);
    }

    for (const Functor& functor : functors)
    {
        functor();
    }
    callingPendingFunctors_ = false;
}
```

如将监听描述符上树添加到EventLoop

```cpp
//将 Acceptor::listen() 的调用任务放入EventLoop 的待执行队列中,这确保了所有和 EventLoop 相关的操作都在同一个I/O线程中执行，避免了锁竞争
loop_->runInLoop(std::bind(&Acceptor::listen, get_pointer(acceptor_)));
```

如关闭连接等等

```cpp
loop_->runInLoop(std::bind(&TcpServer::removeConnectionInLoop, this, conn));
loop_->runInLoop(std::bind(&TcpConnection::shutdownInLoop, this));
```

所有的事件操作都需要在EventLoop中执行



### 四、唤醒EventLoop线程

```cpp
int wakeupFd_;
std::unique_ptr<Channel> wakeupChannel_;
```

muduo将wakeupChannel_添加到每一个EventLoop中，这样在有事件发生时，能够及时的唤醒对应的线程，防止阻塞



### 五、定时任务

muduo库还支持定时任务，在EventLoop初始化的时候，初始化一个timerQueue_，这个容器记录能够记录着各个定时任务，在TimerQueue初始化的时候，也会创建一个timerfd_放到EventLoop的监听当中，当最近的定时任务到期时，`timerfd` 会变为可读，`EventLoop` 从 `poll` 调用中被唤醒，并将 `timerfdChannel_` 作为一个活跃事件进行处理，最终调用其读回调，也就是 `TimerQueue::handleRead`，从而执行到期的定时任务。将时间事件转换为一个文件描述符的 I/O 事件，典型的应用有：定时发送心跳，

```cpp
//TimeQueue.h
private:
  // 按到期时间排序的 set，用于快速查找下一个要到期的定时器
  typedef std::pair<Timestamp, Timer*> Entry;
  typedef std::set<Entry> TimerList;

  // 按Timer* 地址排序的 set，用于快速取消（删除）一个定时器
  typedef std::pair<Timer*, int64_t> ActiveTimer;
  typedef std::set<ActiveTimer> ActiveTimerSet;

  TimerList timers_;//待办事项
  ActiveTimerSet activeTimers_;

//TimeQueue::Insert
bool TimerQueue::insert(Timer* timer)
{
  loop_->assertInLoopThread();
  assert(timers_.size() == activeTimers_.size());
  bool earliestChanged = false;
  Timestamp when = timer->expiration();
  TimerList::iterator it = timers_.begin();
  // 检查新插入的定时器是否会成为新的“最早到期”的定时器
  if (it == timers_.end() || when < it->first)
  {
    earliestChanged = true;
  }

  // 同时插入到两个 set 中
  timers_.insert(Entry(when, timer));
  activeTimers_.insert(ActiveTimer(timer, timer->sequence()));

  assert(timers_.size() == activeTimers_.size());
  return earliestChanged;
}

//当 timerfd 触发，handleRead 被调用。
void TimerQueue::handleRead()
{
  // 当前时间
  Timestamp now(Timestamp::now());
  readTimerfd(timerfd_, now); // 清除事件

  // 1. 获取所有已到期的定时器（为什么不是一个，而是全部？这是因为在处理其他IO事件时，时间仍在流失，可能有多个任务都到期了）
  std::vector<Entry> expired = getExpired(now);

  callingExpiredTimers_ = true;
  cancelingTimers_.clear();

  // 2. 执行回调
  for (const Entry& it : expired)
  {
    it.second->run();
  }
  callingExpiredTimers_ = false;

  // 3. 重置周期性任务
  reset(expired, now);
}

std::vector<TimerQueue::Entry> TimerQueue::getExpired(Timestamp now)
{
  std::vector<Entry> expired;
  // 构造一个哨兵值，时间为 now，指针为一个最大值
  Entry sentry(now, reinterpret_cast<Timer*>(UINTPTR_MAX));
  // lower_bound 会 O(log N) 找到第一个到期时间 > now 的迭代器
  TimerList::iterator end = timers_.lower_bound(sentry);

  // 从头到 end 迭代器之间的所有元素都是已到期的
  std::copy(timers_.begin(), end, back_inserter(expired));
  timers_.erase(timers_.begin(), end);

  // 从 activeTimers_ 中也移除这些定时器
  for (const Entry& it : expired)
  {
    ActiveTimer timer(it.second, it.second->sequence());
    size_t n = activeTimers_.erase(timer);
    assert(n == 1); (void)n;
  }
  return expired;
}

void TimerQueue::reset(const std::vector<Entry>& expired, Timestamp now)
{
  Timestamp nextExpire;

  // 遍历过期的定时器，如果定时器是重复的，则重启定时器，否则删除定时器
  for (const Entry& it : expired)
  {
    ActiveTimer timer(it.second, it.second->sequence());
    // 如果定时器是重复的，则重启定时器，否则删除定时器
    if (it.second->repeat()
        && cancelingTimers_.find(timer) == cancelingTimers_.end())
    {
      it.second->restart(now);
      insert(it.second);
    }
    // 如果定时器不是重复的，则删除定时器
    else
    {
      delete it.second; 
    }
  }

  // 如果处理后的定时任务不为空，则设置下一次超时时间
  if (!timers_.empty())
  {
    nextExpire = timers_.begin()->second->expiration();
  }

  //确保下一次超时时间有效
  if (nextExpire.valid())
  {
    // 设置下一次超时时间
    resetTimerfd(timerfd_, nextExpire);
  }
}

//设置下一次到期时间
void resetTimerfd(int timerfd, Timestamp expiration)
{
  // wake up loop by timerfd_settime()
  struct itimerspec newValue;
  struct itimerspec oldValue;
  memZero(&newValue, sizeof newValue);
  memZero(&oldValue, sizeof oldValue);
  newValue.it_value = howMuchTimeFromNow(expiration);
  //调用 timerfd_settime 系统调用，让 timerfd_ 在 expiration 这个时刻变为可读状态
  int ret = ::timerfd_settime(timerfd, 0, &newValue, &oldValue);
  if (ret)
  {
    LOG_SYSERR << "timerfd_settime()";
  }
}
```

```cpp
//EventLoop.h
std::unique_ptr<TimerQueue> timerQueue_;

timerQueue_(new TimerQueue(this)),

TimerQueue::TimerQueue(EventLoop* loop)
  : loop_(loop),
    timerfd_(createTimerfd()),
    timerfdChannel_(loop, timerfd_),
    timers_(),
    callingExpiredTimers_(false)
{
  timerfdChannel_.setReadCallback(
      std::bind(&TimerQueue::handleRead, this));
  timerfdChannel_.enableReading();
}
```



### 六、任务安全处理

muduo在执行任务时非常注意安全问题，通常都会使用一个原子变量标注，防止在执行任务的时候其他类修改任务

```cpp
//EventLoop.cc
eventHandling_(false),
callingPendingFunctors_(false),
//执行前设置为true
eventHandling_ = true;
// 遍历activeChannels_，调用Channel的handleEvent方法
for (Channel* channel : activeChannels_)
{
    currentActiveChannel_ = channel;
    currentActiveChannel_->handleEvent(pollReturnTime_);
}
currentActiveChannel_ = NULL;
//结束后设置为false
eventHandling_ = false;


//EventLoop.cc
//开始前设置为ture
callingPendingFunctors_ = true;
{
    MutexLockGuard lock(mutex_);
    functors.swap(pendingFunctors_);
}

for (const Functor& functor : functors)
{
    functor();
}
//结束时设置为false
callingPendingFunctors_ = false;


//定时任务处理，TimerQueue.cc
callingExpiredTimers_ = true;
cancelingTimers_.clear();
// safe to callback outside critical section
for (const Entry& it : expired)
{
    it.second->run();
}
callingExpiredTimers_ = false;
```

