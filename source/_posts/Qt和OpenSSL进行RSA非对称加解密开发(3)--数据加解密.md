title: Qt和OpenSSL进行RSA非对称加解密开发(3)--数据加解密
date: 2025-03-12 14:13:00
categories: OpenSSL
tags: [Qt,openssl]
---
#### 4.1使用公钥加密

##### 4.1.1、EVP_PKEY_CTX_new

用于创建与给定密钥对象（`EVP_PKEY`）相关联的密钥上下文（`EVP_PKEY_CTX`）。

```cpp
EVP_PKEY_CTX *EVP_PKEY_CTX_new(EVP_PKEY *pkey, ENGINE *e);
```

参数解释：

- `pkey`：与上下文关联的密钥对象。这可以是一个公钥、私钥或对称密钥对象，具体取决于使用场景。
- `e`：可选参数，与上下文关联的引擎（Engine）。如果不需要使用特定引擎，可以传入 `NULL`。

返回值

- `EVP_PKEY_CTX` 类型的指针，即新创建的密钥上下文对象

```cpp
// 创建加密数据的上下文对象
EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new(m_publicKey, NULL);
assert(ctx != NULL);
```

> 需要注意的是，使用完密钥上下文后应该调用 `EVP_PKEY_CTX_free` 函数来释放相应的资源，以避免内存泄漏。

##### 4.1.2、EVP_PKEY_encrypt_init

用于初始化使用非对称密钥进行加密操作

```cpp
int EVP_PKEY_encrypt_init(EVP_PKEY_CTX *);
```

参数解释：

- ctx：要进行加密操作的密钥上下文

返回值

- 1：成功
- 0：失败

```cpp
int ret = EVP_PKEY_encrypt_init(ctx);
assert(ret == 1);
```

##### 4.1.3、EVP_PKEY_CTX_set_rsa_padding

用于设置 RSA 加密或解密操作的填充方式

```cpp
int EVP_PKEY_CTX_set_rsa_padding(EVP_PKEY_CTX *ctx, int pad);
```

参数解释：

- `ctx`：RSA 加密或解密操作的上下文（`EVP_PKEY_CTX`）。
- `pad`：要设置的加密填充（padding）方式，可以是以下值之一：
    - `RSA_PKCS1_PADDING`：PKCS#1 填充方式，是最常见的 RSA 填充方式。
    - `RSA_PKCS1_OAEP_PADDING`：PKCS#1 OAEP 填充方式，带有随机性质的填充方式，安全性更高。
    - `RSA_NO_PADDING`：不进行填充操作，仅加密或解密数据。

> 设置签名时，不能使用RSA_PKCS1_OAPE_PADDING这种填充方式，因为OAEP 是一种概率性加密填充，每次加密同一明文会产生不同的密文，但签名需要确定性，这样才能保证相同数据的签名结果可以被验证

返回值

- 1：成功
- 0：失败

```cpp
ret = EVP_PKEY_CTX_set_rsa_padding(ctx, RSA_PKCS1_PADDING);
assert(ret == 1);
```

##### 4.1.4、EVP_PKEY_encrypt

使用非对称密钥进行加密操作

```cpp
int EVP_PKEY_encrypt(EVP_PKEY_CTX *ctx,
         unsigned char *out, size_t *outlen,
         const unsigned char *in, size_t inlen);
```

参数解释：

- `ctx`：指向 EVP_PKEY_CTX 对象的指针，用于进行加密操作的上下文。
- `out`：指向输出缓冲区的指针，用于存储加密后的数据。
- `outlen`：指向保存输出数据长度的变量的指针，同时也作为输入来指定输出缓冲区的大小。
- `in`：指向输入缓冲区的指针，包含需要加密的数据。
- `inlen`：输入数据的长度。

返回值

- 1：成功
- 0：失败

```cpp
size_t outLen = 0;
ret = EVP_PKEY_encrypt(
ctx, NULL, &outLen, reinterpret_cast<const unsigned char*>(data.data()), data.size());
assert(ret == 1);
unsigned char* out = new unsigned char[outLen];
EVP_PKEY_encrypt(
ctx, out, &outLen, reinterpret_cast<const unsigned char*>(data.data()), data.size());
assert(ret == 1);
```

> 使用公钥加密数据，由于不知道加密数据的大小，所以第一次调用EVP_PKEY_encrypt的目的是获取outLen，这是因为outLen记录着加密后数据的长度，通过这个长度就能创建出合适的内存大小

##### 4.1.5、EVP_PKEY_CTX_free

释放密钥对上下文对象

```cpp
void EVP_PKEY_CTX_free(EVP_PKEY_CTX *ctx);
```

参数解释：

- `ctx`：指向要释放内存的密钥对上下文对象的指针。

```cpp
// 释放资源
delete[] out;
EVP_PKEY_CTX_free(ctx);
```

##### 完整示例

```cpp
QByteArray RSACrypto::publicEncrypt(const QByteArray& data)
{
    // 创建加密数据的上下文对象
    EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new(m_publicKey, NULL);
    assert(ctx != NULL);

    // 设置加密和填充模式
    int ret = EVP_PKEY_encrypt_init(ctx);
    assert(ret == 1);
    ret = EVP_PKEY_CTX_set_rsa_padding(ctx, RSA_PKCS1_OAEP_PADDING);
    assert(ret == 1);

    // 使用公钥加密数据，由于不知道加密数据的大小，所以第一次调用EVP_PKEY_encrypt的目的是获取outLen，
    // 这是因为outLen记录着加密后数据的长度，通过这个长度就能创建出合适的内存大小
    size_t outLen = 0;
    ret = EVP_PKEY_encrypt(
        ctx, NULL, &outLen, reinterpret_cast<const unsigned char*>(data.data()), data.size());
    assert(ret == 1);
    unsigned char* out = new unsigned char[outLen];
    EVP_PKEY_encrypt(
        ctx, out, &outLen, reinterpret_cast<const unsigned char*>(data.data()), data.size());
    assert(ret == 1);

    QByteArray encryptData(reinterpret_cast<char*>(out), outLen);

    // 释放资源
    delete[] out;
    EVP_PKEY_CTX_free(ctx);
    return encryptData;
}
```

#### 4.2 使用私钥解密

##### 4.2.1、EVP_PKEY_CTX_new

用于创建与给定密钥对象（`EVP_PKEY`）相关联的密钥上下文（`EVP_PKEY_CTX`）。

```cpp
EVP_PKEY_CTX *EVP_PKEY_CTX_new(EVP_PKEY *pkey, ENGINE *e);
```

参数解释：

- `pkey`：与上下文关联的密钥对象。这可以是一个公钥、私钥或对称密钥对象，具体取决于使用场景。
- `e`：可选参数，与上下文关联的引擎（Engine）。如果不需要使用特定引擎，可以传入 `NULL`。

返回值

- `EVP_PKEY_CTX` 类型的指针，即新创建的密钥上下文对象

```cpp
// 创建加密数据的上下文对象
EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new(m_privateKey, NULL);
assert(ctx != NULL);
```

> 需要注意的是，使用完密钥上下文后应该调用 `EVP_PKEY_CTX_free` 函数来释放相应的资源，以避免内存泄漏。

##### 4.2.2、EVP_PKEY_decrypt_init

用于初始化使用非对称密钥进行解密操作

```cpp
int EVP_PKEY_decrypt_init(EVP_PKEY_CTX *);
```

参数解释：

- ctx：要进行加密操作的密钥上下文

返回值

- 1：成功
- 0：失败

```cpp
int ret = EVP_PKEY_decrypt_init(ctx);
assert(ret == 1);
```

##### 4.2.3、EVP_PKEY_CTX_set_rsa_padding

用于设置 RSA 加密或解密操作的填充方式

```cpp
int EVP_PKEY_CTX_set_rsa_padding(EVP_PKEY_CTX *ctx, int pad);
```

参数解释：

- `ctx`：RSA 加密或解密操作的上下文（`EVP_PKEY_CTX`）。
- `pad`：要设置的加密填充（padding）方式，可以是以下值之一：
    - `RSA_PKCS1_PADDING`：PKCS#1 填充方式，是最常见的 RSA 填充方式。
    - `RSA_PKCS1_OAEP_PADDING`：PKCS#1 OAEP 填充方式，带有随机性质的填充方式，安全性更高。
    - `RSA_NO_PADDING`：不进行填充操作，仅加密或解密数据。

> 设置签名时，不能使用RSA_PKCS1_OAPE_PADDING这种填充方式，因为OAEP 是一种概率性加密填充，每次加密同一明文会产生不同的密文，但签名需要确定性，这样才能保证相同数据的签名结果可以被验证

返回值

- 1：成功
- 0：失败

```cpp
ret = EVP_PKEY_CTX_set_rsa_padding(ctx, RSA_PKCS1_PADDING);
assert(ret == 1);
```

##### 4.2.4、EVP_PKEY_decrypt

使用非对称密钥进行加密操作

```cpp
int EVP_PKEY_decrypt(EVP_PKEY_CTX *ctx,
         unsigned char *out, size_t *outlen,
         const unsigned char *in, size_t inlen);
```

参数解释：

- `ctx`：指向 EVP_PKEY_CTX 对象的指针，用于进行解密操作的上下文。
- `out`：指向输出缓冲区的指针，用于存储解密后的数据。
- `outlen`：指向保存输出数据长度的变量的指针，同时也作为输入来指定输出缓冲区的大小。
- `in`：指向输入缓冲区的指针，包含需要解密的数据。
- `inlen`：输入数据的长度。

返回值

- 1：成功
- 0：失败

```cpp
size_t outLen = 0;
ret = EVP_PKEY_decrypt(
ctx, NULL, &outLen, reinterpret_cast<const unsigned char*>(data.data()), data.size());
assert(ret == 1);
unsigned char* out = new unsigned char[outLen];
EVP_PKEY_decrypt(
ctx, out, &outLen, reinterpret_cast<const unsigned char*>(data.data()), data.size());
assert(ret == 1);
```

> 使用私钥解密数据，由于不知道解密数据的大小，所以第一次调用EVP_PKEY_decrypt的目的是获取outLen，这是因为outLen记录着解密后数据的长度，通过这个长度就能创建出合适的内存大小

##### 4.2.5、EVP_PKEY_CTX_free

释放密钥对上下文对象

```cpp
void EVP_PKEY_CTX_free(EVP_PKEY_CTX *ctx);
```

参数解释：

- `ctx`：指向要释放内存的密钥对上下文对象的指针。

```cpp
// 释放资源
delete[] out;
EVP_PKEY_CTX_free(ctx);
```

##### 完整示例

```cpp
QByteArray RSACrypto::privateDecrypt(const QByteArray& data)
{
    // 创建解密数据的上下文对象
    EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new(m_privateKey, NULL);
    assert(ctx != NULL);

    // 设置加密和填充模式
    int ret = EVP_PKEY_decrypt_init(ctx);
    assert(ret == 1);
    ret = EVP_PKEY_CTX_set_rsa_padding(ctx, RSA_PKCS1_OAEP_PADDING);
    assert(ret == 1);

    // 使用私钥解密
    size_t outLen = 0;
    ret = EVP_PKEY_decrypt(
        ctx, NULL, &outLen, reinterpret_cast<const unsigned char*>(data.data()), data.size());
    assert(ret == 1);
    unsigned char* out = new unsigned char[outLen];
    ret = EVP_PKEY_decrypt(
        ctx, out, &outLen, reinterpret_cast<const unsigned char*>(data.data()), data.size());
    assert(ret == 1);

    QByteArray decryptData(reinterpret_cast<char*>(out), outLen);

    // 释放资源
    delete[] out;
    EVP_PKEY_CTX_free(ctx);
    return decryptData;
}
```
