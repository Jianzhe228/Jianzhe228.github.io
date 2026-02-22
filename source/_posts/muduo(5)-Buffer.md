title: muduo(5)-Buffer
date: 2025-07-29 07:37:43
categories: muduo
tags: [muduo]
---
### 一、Buffer缓冲区设计

```cpp
+-------------------+------------------+------------------+
| prependable bytes |  readable bytes  |  writable bytes  |
|                   |     (CONTENT)    |                  |
+-------------------+------------------+------------------+
|                   |                  |                  |
0      <=      readerIndex   <=   writerIndex    <=     size
```

1. prependable bytes：长度字段固定8字节
2. readable bytes：可读缓冲区
3. writable bytes：可写缓冲区

```cpp
static const size_t kCheapPrepend = 8;
static const size_t kInitialSize = 1024;

explicit Buffer(size_t initialSize = kInitialSize)
    : buffer_(kCheapPrepend + initialSize),
readerIndex_(kCheapPrepend),
writerIndex_(kCheapPrepend)
{
    assert(readableBytes() == 0);
    assert(writableBytes() == initialSize);
    assert(prependableBytes() == kCheapPrepend);
}
```

在buffer初始化阶段，buffer的默认大小是8+1024，将可读指针和可写指针移动到同一个位置



```cpp
//NOTE 用最少的 read 系统调用次数，读取尽可能多的数据，以减少用户态和内核态之间的切换开销
ssize_t Buffer::readFd(int fd, int* savedErrno)
{
    char extrabuf[65536];
    struct iovec vec[2];
    // writableBytes() 返回当前 inputBuffer_ 内部 std::vector<char> 中 writerIndex_
    // 之后剩余的空闲空间大小
    const size_t writable = writableBytes();
    // 第一块缓冲区：指向 inputBuffer_ 内部的可写空间 (begin() + writerIndex_)，长度为
    // writableBytes()。
    vec[0].iov_base = begin() + writerIndex_;
    vec[0].iov_len = writable;
    // 第二块缓冲区：指向一个在栈上临时分配的、大小为 64KB 的备用缓冲区 (extrabuf)。
    vec[1].iov_base = extrabuf;
    vec[1].iov_len = sizeof extrabuf;
    // 如果 inputBuffer_ 内部的可写空间足够大，则只使用第一块缓冲区，否则会同时使用第二块缓冲区
    const int iovcnt = (writable < sizeof extrabuf) ? 2 : 1;
    // readv 会尝试一次性把 socket 接收缓冲区的数据同时读到这两块内存中。
    const ssize_t n = sockets::readv(fd, vec, iovcnt);
    if (n < 0)
    {
        *savedErrno = errno;
    }
    else if (implicit_cast<size_t>(n) <= writable)
    {
        writerIndex_ += n;
    }
    else
    {
        writerIndex_ = buffer_.size();
        append(extrabuf, n - writable);
    }
    return n;
}
```

在从缓冲区中读数据时，使用**readv函数**，这个函数可以配置两个缓冲区，当第一个缓冲区写满时，会写到第二个缓冲区。



写入数据处理，以HttpResponse::appendToBuffer为例

```cpp
void HttpResponse::appendToBuffer(Buffer* output) const
{
    char buf[32];
    snprintf(buf, sizeof buf, "HTTP/1.1 %d ", statusCode_);
    output->append(buf);
    output->append(statusMessage_);
    output->append("\r\n");

    if (closeConnection_)
    {
        output->append("Connection: close\r\n");
    }
    else
    {
        snprintf(buf, sizeof buf, "Content-Length: %zd\r\n", body_.size());
        output->append(buf);
        output->append("Connection: Keep-Alive\r\n");
    }

    for (const auto& header : headers_)
    {
        output->append(header.first);
        output->append(": ");
        output->append(header.second);
        output->append("\r\n");
    }

    output->append("\r\n");
    output->append(body_);
}


void append(const StringPiece& str)
{
    append(str.data(), str.size());
}

void append(const char* /*restrict*/ data, size_t len)
{
    ensureWritableBytes(len);
    std::copy(data, data + len, beginWrite());
    hasWritten(len);
}

//关键时makeSpace函数
void ensureWritableBytes(size_t len)
{
    if (writableBytes() < len)
    {
        makeSpace(len);
    }
    assert(writableBytes() >= len);
}

void makeSpace(size_t len)
{
    //如果剩余空间不足，则重新分配内存
    if (writableBytes() + prependableBytes() < len + kCheapPrepend)
    {
        buffer_.resize(writerIndex_ + len);
    }
    else
    {
        // 将可读数据从当前位置移动到 buffer 的起始位置，为新数据腾出空间。
        assert(kCheapPrepend < readerIndex_);
        size_t readable = readableBytes();
        // 将可读数据从当前位置移动到 buffer 的起始位置，为新数据腾出空间。
        std::copy(begin() + readerIndex_, begin() + writerIndex_, begin() + kCheapPrepend);
        readerIndex_ = kCheapPrepend;
        writerIndex_ = readerIndex_ + readable;
        assert(readable == readableBytes());
    }
}

// 返回可写字节数
size_t writableBytes() const
{
    return buffer_.size() - writerIndex_;
}
// 返回当前读取位置到buffer起始位置的距离
size_t prependableBytes() const
{
    return readerIndex_;
}
```

**muduo将buffer中的内存设计为可移动的，即长度字段固定，但可读和可写缓冲区大小可以调节**，原因是这样的，readerIndex_在读取数据的时候是会往右边移动的，readerIndex_和writerIndex之间的可读区域其实是一个滑动窗口，在向右移动的过程中，左边就会空出一部分内存，也就是kCheapPrepend到readerIndex_之间的那片内存，这个是可利用的，所以当发现writerIndex到末尾的内存不够用时，会左边检查空出的那部分内存，如果两个内存加起来够用，就将可读区域的内存往左边移，这样右边就能空出更多内存，这样就能插入数据了。如果内存真的不够，就buffer_.resize(writerIndex_ + len);重新分配内存，**通过内存复用避免频繁创建新的内存**



### 二、零拷贝添加长度

在实现网络协议是，通常需要**在数据包内容前面添加长度字段**，经典的协议为：`[4字节长度][消息体]`。

常规的做法是：先序列化消息体，得到长度 `N`，然后申请 `4+N` 的空间，先把长度 `N` 写进去，再把消息体拷贝进去。这个过程至少需要一次额外的拷贝。

**`muduo` 的做法**：

```cpp
void ProtobufCodecLite::fillEmptyBuffer(muduo::net::Buffer* buf,
                                        const google::protobuf::Message& message)
{
    assert(buf->readableBytes() == 0);

    buf->append(tag_);

    int byte_size = serializeToBuffer(message, buf);

    int32_t checkSum = checksum(buf->peek(), static_cast<int>(buf->readableBytes()));
    buf->appendInt32(checkSum);
    assert(buf->readableBytes() == tag_.size() + byte_size + kChecksumLen);
    (void)byte_size;
    int32_t len = sockets::hostToNetwork32(static_cast<int32_t>(buf->readableBytes()));
    //上面是填入响应数据，prepend是在长度字段填入响应数据长度
    buf->prepend(&len, sizeof len);
}
// 将转换成网络字节序之后的4个字节，添加到 Buffer 的最前端
void prepend(const void* /*restrict*/ data, size_t len)
{
    assert(len <= prependableBytes());
    readerIndex_ -= len;
    const char* d = static_cast<const char*>(data);
    std::copy(d, d + len, begin() + readerIndex_);
}
```

1. 直接在 `writerIndex_` 处（`writable` 区域）序列化消息体。
2. 得到消息体长度 `N` 后，利用 `prependable` 空间，在 `readerIndex_` **之前**写入4字节的长度 `N`，然后将 `readerIndex_` 向左移动4个字节。
3. 整个过程**没有 `memmove` 或额外的内存拷贝**



### 三、数据操作零拷贝

当上层逻辑（比如协议解析）需要检查缓冲区中的数据时，它会调用 `peek()` 方法。这个方法直接返回 `begin() + readerIndex_` 的指针，让用户可以直接访问内部存储。

如在Http协议解析的时候：

```cpp
if (state_ == kExpectRequestLine)
{
    const char* crlf = buf->findCRLF();
    if (crlf)
    {
        ok = processRequestLine(buf->peek(), crlf);
        if (ok)
        {
            request_.setReceiveTime(receiveTime);
            buf->retrieveUntil(crlf + 2);
            state_ = kExpectHeaders;
        }
        else
        {
            hasMore = false;
        }
    }
    else
    {
        hasMore = false;
    }
}


bool HttpContext::processRequestLine(const char* begin, const char* end)
{
  bool succeed = false;
  const char* start = begin;
  const char* space = std::find(start, end, ' ');
  if (space != end && request_.setMethod(start, space))
  {
    start = space+1;
    space = std::find(start, end, ' ');
    if (space != end)
    {
      const char* question = std::find(start, space, '?');
      if (question != space)
      {
        request_.setPath(start, question);
        request_.setQuery(question, space);
      }
      else
      {
        request_.setPath(start, space);
      }
      start = space+1;
      succeed = end-start == 8 && std::equal(start, end-1, "HTTP/1.");
      if (succeed)
      {
        if (*(end-1) == '1')
        {
          request_.setVersion(HttpRequest::kHttp11);
        }
        else if (*(end-1) == '0')
        {
          request_.setVersion(HttpRequest::kHttp10);
        }
        else
        {
          succeed = false;
        }
      }
    }
  }
  return succeed;
}
```

`processRequestLine` 在分割出 method, path 等部分后，传递给 `HttpRequest` 的 `set` 方法的是**一对指向 `Buffer` 内部内存的 `const char*` 指针**。`HttpRequest` 的 `set` 方法内部才根据这对指针创建 `std::string`。这样做的好处是，解析本身是零拷贝的，只有在确认需要存储时才发生一次内存分配。这在性能上通常优于在解析过程中创建多个临时 `std::string` 对象。



当 `Buffer` 中 `readable` 区域的数据已经被上层逻辑完全处理或转发后，就会调用 `retrieve()` 来更新缓冲区的状态，以便后续的内存复用。**利用retrieve移动指针，减少删除和清理任何内存的消耗。**如：buf->retrieveUntil(crlf + 2);，