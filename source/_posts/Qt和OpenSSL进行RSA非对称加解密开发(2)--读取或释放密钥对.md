title: Qt和OpenSSL进行RSA非对称加解密开发(2)--读取或释放密钥对
date: 2025-03-12 14:12:00
categories: OpenSSL
tags: [Qt,openssl]
---
#### 3.1、从文件中读取密钥对

##### 3.1.1、BIO_new_file

用于创建适用于文件 I/O 的 `BIO` 对象，它允许将文件与 `BIO` 抽象接口结合使用，以便**进行读取或写入文件的操作**。

```cpp
BIO *BIO_new_file(const char *filename, const char *mode);
```

参数解释：

- `filename`：要进行读取或写入的文件的名称或路径。
- `mode`：表示文件操作模式的字符串。常见的模式包括：
    - `"r"`：只读模式。
    - `"w"`：写入模式，如果文件不存在则创建，如果文件存在则截断。
    - `"a"`：追加模式，在文件末尾写入数据。
    - `"rb"`：以二进制格式打开文件进行只读操作。
    - `"wb"`：以二进制格式打开文件进行写入操作。
    - `"ab"`：以二进制格式打开文件进行追加操作。

返回值：

- 成功：指向新创建的文件 `BIO` 对象的指针。
- 失败：返回 `NULL`。

```cpp
BIO* bio = BIO_new_file(fileName.data(), "rb");
assert(bio != NULL);
```

##### 3.1.2、PEM_read_bio_PUBKEY

从一个 BIO 对象（在内存中的数据流）中读取 PEM 编码的公钥，`PEM_read_bio_PUBKEY` 函数读取 PEM 编码的公钥，并将结果存储在 **EVP_PKEY** 结构体中。

```cpp
#include <openssl/pem.h>

EVP_PKEY *PEM_read_bio_PUBKEY(BIO *bp, EVP_PKEY **x, pem_password_cb *cb, void *u);
```

该函数接受以下参数：

- `bp`：指向 BIO 对象的指针，可用于读取 PEM 文件中的数据或从其他数据源读取 PEM 格式的数据。
- `x`：指向 EVP_PKEY 指针的指针，用于接收读取的公钥。
- `cb`：一个回调函数，用于处理密码（如果 PEM 文件有密码保护）。
- `u`：用户自定义数据，在回调函数中可以使用。

返回值：

- 成功，返回 EVP_PKEY 指针
- 失败，返回 NULL。

```cpp
if (keyType == PUBLICKEY)
{
	PEM_read_bio_PUBKEY(bio, &m_publicKey, NULL, NULL);
}
```

##### 3.1.3、PEM_read_bio_PrivateKey

用于从一个 BIO 对象（在内存中的数据流）中读取 PEM 编码的私钥，`PEM_read_bio_PrivateKey` 函数读取 PEM 编码的公钥，并将结果存储在 **EVP_PKEY** 结构体中。

```cpp
#include <openssl/pem.h>

EVP_PKEY *PEM_read_bio_PrivateKey(BIO *bp, EVP_PKEY **x, pem_password_cb *cb, void *u);
```

该函数接受以下参数：

- `bp`：指向 BIO 对象的指针，可用于读取 PEM 文件中的数据或从其他数据源读取 PEM 格式的数据。
- `x`：指向 EVP_PKEY 指针的指针，用于接收读取的私钥。
- `cb`：一个回调函数，用于处理密码（如果 PEM 文件有密码保护）。
- `u`：用户自定义数据，在回调函数中可以使用。

返回值：

- 成功，返回 EVP_PKEY 指针
- 失败，返回 NULL。

```cpp
else
{
	PEM_read_bio_PrivateKey(bio, &m_privateKey, NULL, NULL);
}
```

> 记得调用BIO_free(bio);函数释放BIO对象

##### 完整示例：

```cpp
RSACrypto::RSACrypto(const QByteArray& fileName, KeyType keyType, QObject* parent)
{
    BIO* bio = BIO_new_file(fileName.data(), "rb");
    assert(bio != NULL);
    if (keyType == PUBLICKEY)
    {
        PEM_read_bio_PUBKEY(bio, &m_publicKey, NULL, NULL);
    }
    else
    {
        PEM_read_bio_PrivateKey(bio, &m_privateKey, NULL, NULL);
    }
    BIO_free(bio);
}
```

#### 3.2 释放密钥对对象

##### 3.2.1、EVP_PKEY_free

```cpp
void EVP_PKEY_free(EVP_PKEY *pkey);
```

参数解释：

- pkey: 要释放的私钥或公钥的EVP_PKEY对象

```cpp
RSACrypto::~RSACrypto()
{
    if (m_privateKey)
    {
        EVP_PKEY_free(m_privateKey);
    }
    if (m_publicKey)
    {
        EVP_PKEY_free(m_publicKey);
    }
}
```

### 