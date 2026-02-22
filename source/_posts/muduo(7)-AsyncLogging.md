title: muduo(7)-AsyncLogging
date: 2025-07-31 03:18:00
categories: muduo
tags: [muduo]
---
muduo库的AsyncLogging异步日志记录使用双缓冲+任务队列实现，同时，在日志内容过多时，主动丢弃部分日志，确保系统高效的运行，防止被日志阻塞。

```cpp
BufferPtr currentBuffer_ GUARDED_BY(mutex_);//当前缓冲区
BufferPtr nextBuffer_ GUARDED_BY(mutex_);//备用缓冲区
BufferVector buffers_ GUARDED_BY(mutex_);//待写入队列


void AsyncLogging::append(const char* logline, int len)
{
    muduo::MutexLockGuard lock(mutex_);
    // 如果当前缓冲区有足够的空间，则直接追加到当前缓冲区
    if (currentBuffer_->avail() > len)
    {
        currentBuffer_->append(logline, len);
    }
    else
    {
        // 将当前缓冲区放入待写入队列或者说待写入缓冲区
        buffers_.push_back(std::move(currentBuffer_));
        // 为 currentBuffer_ 获取一个新的空缓冲区
        if (nextBuffer_) // 如果备用缓冲区存在
        {
            // 将备用缓冲区设置为当前缓冲区
            currentBuffer_ = std::move(nextBuffer_);
        }
        else
        {
            // 在备用缓冲区不存在的情况下，为 currentBuffer_ 分配一个新的空缓冲区
            currentBuffer_.reset(new Buffer);
        }
        // 将新的日志消息写入新的 currentBuffer_
        currentBuffer_->append(logline, len);
        // 通知等待的线程开始写入数据(当前缓冲区已满，批量写入)
        cond_.notify();
    }
}
```

后端一直循环写入日志，看起来比较绕，currentBuffer,nextBuffer,buffers,newBuffer1,newBuffer2,buffersToWrite,一共六个buffer

1. currentBuffer:前端写入日志的buffer
2. nextBuffer:前端备用buffer
3. buffers：前端待写入日志队列
4. newBuffer1:后端备用buffer
5. newBuffer2:后端备用buffer
6. bufferToWrite：真正要写入日志的buffer

```cpp
void AsyncLogging::threadFunc()
{
  // 确认后端日志线程已启动
  assert(running_ == true);
  // 使用 CountDownLatch 通知前端线程：后端线程已成功启动，可以开始记录日志了
  latch_.countDown();
  
  // 创建一个 LogFile 对象，这是日志最终写入的目标文件。
  // 第三个参数 threadSafe 设置为 false，因为所有写操作都在这一个后端线程内完成，无需加锁。
  LogFile output(basename_, rollSize_, false);

  // 这两个缓冲区用于后续和前端的缓冲区进行交换，避免在后端线程中频繁分配新内存
  BufferPtr newBuffer1(new Buffer);
  BufferPtr newBuffer2(new Buffer);
  newBuffer1->bzero();
  newBuffer2->bzero();

  // 准备一个 vector，用于存放从前端（append函数）收集到的、待写入文件的缓冲区指针
  BufferVector buffersToWrite;
  buffersToWrite.reserve(16);

  // 后端日志线程主循环
  while (running_)
  {
    // 在循环开始时，断言两个空闲缓冲区都是空的，并且待写入区也是空的
    assert(newBuffer1 && newBuffer1->length() == 0);
    assert(newBuffer2 && newBuffer2->length() == 0);
    assert(buffersToWrite.empty());

    {
      muduo::MutexLockGuard lock(mutex_);

      // 等待可能被两种情况唤醒：
      // 1. 前端线程写满一个 buffer 后调用 cond_.notify() 唤醒。
      // 2. 超时时间到达，即使没有数据也要进行一次日志刷盘。
      if (buffers_.empty())  // unusual usage!
      {
        cond_.waitForSeconds(flushInterval_);
      }

      // 无论 cond_ 是如何被唤醒的，我们都把前端的 currentBuffer_ 移到待写入队列中。
      // 这样可以确保即使在超时的情况下，当前缓冲区里未满的日志也能被收集到。
      buffers_.push_back(std::move(currentBuffer_));
      
      // 将之前准备好的空闲缓冲区 newBuffer1 设置为新的 currentBuffer_
      currentBuffer_ = std::move(newBuffer1);

      // 将前端的整个待写入队列 buffers_ 和后端的 buffersToWrite 进行交换。
      // 交换后，buffers_ 变为空，前端可以继续无锁地向其中添加写满的 buffer。
      buffersToWrite.swap(buffers_);

      // 如果前端把备用缓冲区 nextBuffer_ 也用掉了，那么就把另一个空闲缓冲区 newBuffer2 补上。
      // currentbuffer写满了，执行currentbuffer = move(nextbuffer),此后nextbuffer为空
      if (!nextBuffer_)
      {
        nextBuffer_ = std::move(newBuffer2);
      }
    }

    // 断言我们确实拿到了待写入的数据
    assert(!buffersToWrite.empty());

    // 如果待写入的缓冲区数量过多（超过25个），说明前端日志产生速度远超后端写入速度，
    // 为了防止内存无限增长，这里会丢弃掉一部分日志。
    if (buffersToWrite.size() > 25)
    {
      char buf[256];
      snprintf(buf, sizeof buf, "Dropped log messages at %s, %zd larger buffers\n",
               Timestamp::now().toFormattedString().c_str(),
               buffersToWrite.size()-2);
      fputs(buf, stderr);
      output.append(buf, static_cast<int>(strlen(buf)));
      // 只保留前两个 buffer 的日志，其他的丢弃
      buffersToWrite.erase(buffersToWrite.begin()+2, buffersToWrite.end());
    }

    // 遍历所有待写入的 buffer，将它们的内容追加到 LogFile 对象中
    for (const auto& buffer : buffersToWrite)
    {
      output.append(buffer->data(), buffer->length());
    }
    if (buffersToWrite.size() > 2)
    {
      // 丢弃多余的buffer，只保留两个，用于回收利用，避免内存持有过多
      buffersToWrite.resize(2);
    }

    // 从处理完的 buffersToWrite 中回收 buffer 作为下一个空闲缓冲区(这个一定执行)
    if (!newBuffer1)
    {
      assert(!buffersToWrite.empty());
      newBuffer1 = std::move(buffersToWrite.back());
      buffersToWrite.pop_back();
      newBuffer1->reset(); // 清空 buffer
    }
	//可能执行，如果是超时进来的，就不会执行，因为没有执行currentbuffer = move(nextbuffer),nextbuffer没有为空那么上面的交换
     //就没有执行，所以newBUffer2就不会为空，反之为空
    if (!newBuffer2)
    {
      assert(!buffersToWrite.empty());
      newBuffer2 = std::move(buffersToWrite.back());
      buffersToWrite.pop_back();
      newBuffer2->reset(); // 清空 buffer
    }

    // 清空待写入队列，并强制将 LogFile 缓冲区的数据刷到磁盘
    buffersToWrite.clear();
    output.flush();
  }
  // 线程退出前，最后一次将 LogFile 缓冲区的数据刷到磁盘
  output.flush();
}
```

如何使用：

这个AsyncLogging需要配合Logger类使用

1. `LOG_INFO` 宏创建 `Logger` 对象

```cpp
#define LOG_INFO if (muduo::Logger::logLevel() <= muduo::Logger::INFO) \
  muduo::Logger(__FILE__, __LINE__).stream()

LOG_INFO << "hello world";
```

日志会创建一个临时对象，然后这个对象在结束的时候通过`g_output`将内容添加到currentBuffer

```cpp
Logger::~Logger()
{
  impl_.finish();
  const LogStream::Buffer& buf(stream().buffer());
  g_output(buf.data(), buf.length());
  if (impl_.level_ == FATAL)
  {
    g_flush();
    abort();
  }
}
Logger::OutputFunc g_output = defaultOutput;

void defaultOutput(const char* msg, int len)
{
    size_t n = fwrite(msg, 1, len, stdout);
    // FIXME check n
    (void)n;
}
```

从这里可以看出默认的输出是输出到终端，所以我们在使用的时候需要自定义输出器

```cpp
#include <muduo/base/CurrentThread.h>
#include <muduo/base/AsyncLogging.h>
#include <muduo/base/Logging.h>
#include <muduo/base/Thread.h>

//定义全局AsyncLogging指针
muduo::AsyncLogging* g_asyncLogging = nullptr;

//定义异步输出函数
void asyncOutput(const char* msg, int len)
{
    g_asyncLogging->append(msg, len);
}

int main()
{
    muduo::AsyncLogging log("log.txt", 0);
    g_asyncLogging = &log;

    //设置日志输出函数
    muduo::Logger::setOutput(asyncOutput);
    //启动异步日志线程
    log.start();
    //输出日志
    LOG_INFO << "hello world";
    muduo::CurrentThread::sleepUsec(1000 * 1000);
    return 0;
}
```

