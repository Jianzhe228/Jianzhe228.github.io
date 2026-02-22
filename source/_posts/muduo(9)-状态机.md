title: muduo(9)-状态机
date: 2025-08-01 02:01:08
categories: muduo
tags: [muduo]
---
在muduo库中，使用了很多有限状态机来管理事件的处理流程，如

```cpp
//TcpConnection
enum StateE { kDisconnected, kConnecting, kConnected, kDisconnecting };
StateE state_;

//Connector
enum States { kDisconnected, kConnecting, kConnected };
States state_;

//HttpContext
enum HttpRequestParseState
{
  kExpectRequestLine, // 解析请求行
  kExpectHeaders,     // 解析头部
  kExpectBody,        // 解析包体
  kGotAll,            // 完成
};
HttpRequestParseState state_;
```

通过状态机管理对象或流程的执行状态，流程清晰易于管理。

分析管理的对象或流程，将整个生命周期中所有稳定且互斥的阶段识别出来，这些阶段就是一个一个状态。然后找到所有可能导致状态改变的外部输入或内部条件。

下面几个示例，方便理解与使用

**`TcpConnection`：管理连接的完整生命周期**

1. `kConnecting`：连接已建立，正在进行初始化（如调用 `connectEstablished`）。
2. `kConnected`：连接完全就绪，可以进行数据收发。
3. `kDisconnecting`：已调用 `shutdown()`，正在等待数据发送完毕或对端关闭。
4. `kDisconnected`：连接已完全关闭。

**事件与状态转移**：

- **事件**：`connectEstablished()` 被调用
    - **转移**：`kConnecting` -> `kConnected`
    - **动作**：启用读事件，调用用户的 `ConnectionCallback`。
- **事件**：用户调用 `shutdown()`
    - **转移**：`kConnected` -> `kDisconnecting`
    - **动作**：关闭写端，但仍可接收数据。
- **事件**：`read()` 返回0 或发生错误，触发 `handleClose()`
    - **转移**：`kConnected` 或 `kDisconnecting` -> `kDisconnected`
    - **动作**：关闭 socket，调用用户的 `ConnectionCallback` 和内部的 `CloseCallback`



**`Connector`：连接管理**

1. `kDisconnected`：初始状态或连接失败后的状态。
2. `kConnecting`：已发起非阻塞 `connect`，正在等待结果。
3. `kConnected`：连接成功建立。

**事件与状态转移**：

- **事件**：调用 `start()` 发起连接
    - **转移**：`kDisconnected` -> `kConnecting`
- **事件**：socket 可写，`handleWrite()` 检查 `SO_ERROR` 成功
    - **转移**：`kConnecting` -> `kConnected`
- **事件**：连接失败，`retry()` 被调用
    - **转移**：`kConnecting` -> `kDisconnected`



**`HttpContext`：TCP流式协议解析**

1. `kExpectRequestLine`：正在解析请求行
2. `kExpectHeaders`：正在解析请求头
3. `kExpectBody`：正在解析请求体
4. `kGotAll`：解析完成

**事件与状态转移**：

- **事件**：在缓冲区中找到并成功解析了请求行
    - **转移**：`kExpectRequestLine` -> `kExpectHeaders`
- **事件**：在缓冲区中解析完所有头部，并遇到了一个空行
    - **转移**：`kExpectHeaders` -> `kGotAll`



文件下载器

```cpp
enum status{
    kIdle,//空闲
    kConnecting,//正在建立连接
    kDownloading,//正在下载
    kPaused,//正在暂停
    kCompleted,//下载完成
    kError,//异常发生
}
```

- **事件**: `user_starts_download()` 
    -  **转移**: `kIdle` -> `kConnecting`
- **事件**: `connection_succeeded()` 
    - **转移**: `kConnecting` -> `kDownloading`
- **事件**: `data_chunk_received()` 
    - **转移**: `kDownloading` -> `kDownloading` (保持状态，但更新进度)
- **事件**: `user_pauses()` 
    -  **转移**: `kDownloading` -> `kPaused`
- **事件**: `download_finished()` 
    -  **转移**: `kDownloading` -> `kCompleted`
- **事件**: `network_error()` 
    -  **转移**: `kDownloading` 或 `kConnecting` -> `kError`
