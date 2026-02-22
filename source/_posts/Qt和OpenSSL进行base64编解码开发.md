title: Qt和OpenSSL进行base64编解码开发
date: 2025-03-13 07:03:15
categories: OpenSSL
tags: [Qt,openssl]
---
### 一、基本用法

```cpp
// 发送端对加密后的数据使用base64编码
Base64 base64;
QByteArray encryptData = base64.enCode(reinterpret_cast<char*>(out), outLen);

// 接收端先对数据进行base64解码
Base64 base64;
data = base64.deCode(data);
```

**必要头文件**

```cpp
#include <openssl/bio.h>
#include <openssl/buffer.h>
#include <openssl/evp.h>
```

### 二、Base64编码

#### 2.1、BIO_new

创建 `BIO` 对象

```cpp
BIO *BIO_new(const BIO_METHOD *method);
```

参数解释:

- method :`BIO_METHOD` 结构体指针,表示要使用的 BIO 方法,要获取一个 `BIO_METHOD*` 指针，你可以使用 OpenSSL 库中一组已经定义好的 `BIO_METHOD` 对象。这些 `BIO_METHOD` 对象通常以 `BIO_s_` 开头，表示特定类型的 `BIO` 操作方法

    以下是几个常用的 `BIO_METHOD` 对象及其对应的函数：

    - `BIO_f_base64()`:用于base64编码

    - `BIO_s_file()`：用于文件 I/O 操作。
    - `BIO_s_mem()`：用于内存缓冲区的读写操作。
    - `BIO_s_socket()`：用于套接字 I/O 操作。

返回值：返回一个BIO对象指针

```cpp
// 创建bio对象
BIO* base64 = BIO_new(BIO_f_base64());
BIO* mem = BIO_new(BIO_s_mem());
```

#### 2.2、BIO_push

用于将两个 `BIO` 对象连接起来的函数，该函数将 `next` 对象串联在 `bio` 对象之后，形成一个 `BIO` 对象链。

```cpp
BIO *BIO_push(BIO *bio, BIO *next);
```

参数解释：

- bio:当前使用的 `BIO` 对象
- next：要连接的下一个 `BIO` 对象

> 需要注意的是，当连接多个 `BIO` 对象时，应将它们以正确的顺序连接起来，确保数据可以按照正确的顺序流经整个 `BIO` 对象链。例如，如果需要在内存缓冲区和文件之间进行数据传输，应该先将内存缓冲区 `BIO` 对象链接到文件 `BIO` 对象之后，这样在写入数据时，数据会先写入内存缓冲区，然后再写入文件。

```cpp
// 组织bio链
BIO_push(base64, mem);
```

#### 2.3、BIO_write

用于在 `BIO` 对象中写入数据的函数

```cpp
int BIO_write(BIO *bio, const void *buf, int len);
```

参数解释：

- 要写入数据的 `BIO` 对象指针 `bio`
- 要写入的数据缓冲区指针 `buf`
- 要写入的数据长度 `len`。

返回值：函数返回一个整数，表示实际写入的数据长度。

```cpp
// 数据编码
BIO_write(base64, data, length);
BIO_flush(base64);
```

#### 2.4、BIO_flush

将缓冲区中的数据写入磁盘

```cpp
int BIO_flush(BIO *bio);
```

参数解释：

- `bio`：指向要刷新的 `BIO` 对象的指针。

返回值：

- 成功：返回 1。
- 失败：返回 0。

#### 2.5、BIO_get_mem_ptr

用于获取内存 `BIO` 对象中的数据指针和数据长度的函数。该函数会返回一个 `BIO_MEM_PTR` 结构体，包含了指向数据的指针和数据的长度。需要注意的是，获取到的数据指针 `ptr` 指向的数据是内存 BIO 对象中的数据，因此在使用数据时需要保证内存 BIO 对象的有效性，避免发生悬空指针的问题。

```cpp
int BIO_get_mem_ptr(BIO *bio, BUF_MEM **pp);
```

参数解释：

- bio：之前写入数据的BIO对象
- pp:BUF_MEM对象，BIO_get_mem_ptr函数会将编码后的数据和数据的长度写入到pp

返回值：

- 1:成功
- 0：失败

```cpp
// 把编码后的数据读出来
BUF_MEM* ptr;
BIO_get_mem_ptr(base64, &ptr);
QByteArray str(ptr->data, ptr->length);
```

#### 2.6、BIO_free_all

用于释放 `BIO` 对象以及其关联资源的函数。该函数会递归地释放与 `BIO` 对象相关联的所有资源，包括底层的文件描述符、内存缓冲区等。

```cpp
void BIO_free_all(BIO *bio);
```

参数解释：

- bio：前面创建的base64编码的BIO对象

```cpp
BIO_free_all(base64);
```

#### 完整示例：

```cpp
QByteArray Base64::enCode(const char* data, int length)
{
    // 创建bio对象
    BIO* base64 = BIO_new(BIO_f_base64());
    BIO* mem = BIO_new(BIO_s_mem());
    // 组织bio链
    BIO_push(base64, mem);
    // 数据编码
    BIO_write(base64, data, length);
    BIO_flush(base64);
    // 把编码后的数据读出来
    BUF_MEM* ptr;
    BIO_get_mem_ptr(base64, &ptr);
    QByteArray str(ptr->data, ptr->length);
    BIO_free_all(base64);
    return str;
}
```



### 三、Base64解码

#### 3.1、BIO_new

创建 `BIO` 对象

```cpp
BIO *BIO_new(const BIO_METHOD *method);
```

参数解释:

- method :`BIO_METHOD` 结构体指针,表示要使用的 BIO 方法,要获取一个 `BIO_METHOD*` 指针，你可以使用 OpenSSL 库中一组已经定义好的 `BIO_METHOD` 对象。这些 `BIO_METHOD` 对象通常以 `BIO_s_` 开头，表示特定类型的 `BIO` 操作方法

    以下是几个常用的 `BIO_METHOD` 对象及其对应的函数：

    - `BIO_f_base64()`:用于base64编码

    - `BIO_s_file()`：用于文件 I/O 操作。
    - `BIO_s_mem()`：用于内存缓冲区的读写操作。
    - `BIO_s_socket()`：用于套接字 I/O 操作。

返回值：返回一个BIO对象指针

```cpp
// 创建bio对象
BIO* base64 = BIO_new(BIO_f_base64());
BIO* mem = BIO_new(BIO_s_mem());
```

#### 3.2、BIO_push

用于将两个 `BIO` 对象连接起来的函数，该函数将 `next` 对象串联在 `bio` 对象之后，形成一个 `BIO` 对象链。

```cpp
BIO *BIO_push(BIO *bio, BIO *next);
```

参数解释：

- bio:当前使用的 `BIO` 对象
- next：要连接的下一个 `BIO` 对象

> 需要注意的是，当连接多个 `BIO` 对象时，应将它们以正确的顺序连接起来，确保数据可以按照正确的顺序流经整个 `BIO` 对象链。例如，如果需要在内存缓冲区和文件之间进行数据传输，应该先将内存缓冲区 `BIO` 对象链接到文件 `BIO` 对象之后，这样在写入数据时，数据会先写入内存缓冲区，然后再写入文件。

```cpp
// 组织bio链
BIO_push(base64, mem);
```

#### 3.3、BIO_write

用于在 `BIO` 对象中写入数据的函数

```cpp
int BIO_write(BIO *bio, const void *buf, int len);
```

参数解释：

- 要写入数据的 `BIO` 对象指针 `bio`
- 要写入的数据缓冲区指针 `buf`
- 要写入的数据长度 `len`。

返回值：函数返回一个整数，表示实际写入的数据长度。

```cpp
// 将待解码的数据写入mem节点
BIO_write(mem, data, length);
```

#### 2.5、BIO_read

用于从 `BIO` 对象中读取数据的函数

```cpp
int BIO_read(BIO *bio, void *buf, int len);
```

参数解释：

- 要读取数据的 `BIO` 对象指针 `bio`
- 用于存储读取数据的缓冲区指针 `buf`
- 要读取的最大数据长度 `len`

返回值：实际读取的数据长度，需要注意的是，`BIO_read` 函数可能会返回 0，表示已经没有更多数据可供读取。此外，如果返回的读取数据长度小于预期的长度 `len`，应当根据实际需求进行处理。

```cpp
// 解码,数据存入buf
char* buf = new char[length];
int result = BIO_read(base64, buf, length);
QByteArray out(buf, result);
```

#### 2.6、BIO_free_all

用于释放 `BIO` 对象以及其关联资源的函数。该函数会递归地释放与 `BIO` 对象相关联的所有资源，包括底层的文件描述符、内存缓冲区等。

```cpp
void BIO_free_all(BIO *bio);
```

参数解释：

- bio：前面创建的base64编码的BIO对象

```cpp
BIO_free_all(base64);
```

#### 完整示例：

```cpp
QByteArray Base64::deCode(const char* data, int length)
{
    // 创建bio对象
    BIO* base64 = BIO_new(BIO_f_base64());
    BIO* mem = BIO_new(BIO_s_mem());
    // 组织bio链
    BIO_push(base64, mem);
    // 将待解码的数据写入mem节点
    BIO_write(mem, data, length);
    // 解码,数据存入buf
    char* buf = new char[length];
    int result = BIO_read(base64, buf, length);
    QByteArray out(buf, result);
    BIO_free_all(base64);
    delete[] buf;
    return out;
}
```



