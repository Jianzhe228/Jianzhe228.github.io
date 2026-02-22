title: Qt和OpenSSL进行RSA非对称加解密开发(4)--数字签名和校验
date: 2025-03-12 14:13:00
categories: OpenSSL
tags: [Qt,openssl]
---
数字签名和校验的流程：计算数据的哈希值，然后对哈希值进行数据签名，数据校验时，也是先计算接受到的数据的哈希值，然后对哈希值进行校验

#### 5.1、数据签名

##### 5.1.1、哈希值计算

Qt的**QCryptographicHash**提供了一系列的加密算法实现，其中就包括哈希值计算

```cpp
QCryptographicHash::Algorithm hashType;
hashType = QCryptographicHash::Sha256;

// 计算哈希值
QCryptographicHash hashCode(hashType);
hashCode.addData(data);
// 目前md存储的是二进制格式数据
QByteArray md = hashCode.result();
```

##### 5.1.2、EVP_PKEY_CTX_new

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

##### 5.1.3、EVP_PKEY_sign_init

用于初始化使用非对称密钥进行签名操作的函数

```cpp
int EVP_PKEY_sign_init(EVP_PKEY_CTX *);
```

参数解释：

- ctx：要进行数字签名操作的密钥上下文

返回值

- 1：成功
- 0：失败

```cpp
int ret = EVP_PKEY_sign_init(ctx);
assert(ret == 1);
```

##### 5.1.4、EVP_PKEY_CTX_set_rsa_padding

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

##### 5.1.5、EVP_PKEY_CTX_set_signature_md

用于设置签名算法

```cpp
int EVP_PKEY_CTX_set_signature_md(EVP_PKEY_CTX *ctx, const EVP_MD *md);
```

参数解释：

- `ctx`：指向 `EVP_PKEY_CTX` 上下文结构的指针，用于设置签名算法。
- `md`：指向 `EVP_MD` 结构的指针，表示要使用的签名算法。

签名算法由 OpenSSL 中的 `EVP_MD` 结构表示，其中包含有关算法的信息，如名称、摘要长度等

返回值

- 1：成功
- 0：失败

```cpp
const QMap<QCryptographicHash::Algorithm, hashFunc> hashMethods = {
    {QCryptographicHash::Md5, EVP_md5},
    {QCryptographicHash::Sha1, EVP_sha1},
    {QCryptographicHash::Sha224, EVP_sha224},
    {QCryptographicHash::Sha256, EVP_sha256},
    {QCryptographicHash::Sha384, EVP_sha384},
    {QCryptographicHash::Sha512, EVP_sha512},
    {QCryptographicHash::Sha3_224, EVP_sha3_224},
    {QCryptographicHash::Sha3_256, EVP_sha3_256},
    {QCryptographicHash::Sha3_384, EVP_sha3_384},
    {QCryptographicHash::Sha3_512, EVP_sha3_512},
};
// 设置签名使用的哈希算法
ret = EVP_PKEY_CTX_set_signature_md(ctx, hashMethods.value(hashType)());
assert(ret == 1);
```

##### 5.1.6、EVP_PKEY_sign

使用非对称密钥进行签名操作的函数

```cpp
int EVP_PKEY_sign(EVP_PKEY_CTX *ctx, 
        unsigned char *sig, size_t *siglen,
        const unsigned char *tbs, size_t tbslen);
```

参数解释：

- `ctx`：指向 `EVP_PKEY_CTX` 上下文结构的指针，表示签名操作的上下文。
- `sig`：指向缓冲区的指针，用于存储签名结果。
- `siglen`：指向 `sig` 缓冲区长度的指针，表示输入时表示 `sig` 缓冲区的长度，输出时表示实际写入 `sig` 的字节数。
- `tbs`：指向要签名的数据的指针。
- `tbslen`：要签名的数据的长度。

返回值：

- 1：成功
- 0：失败

```cpp
// 数据签名
size_t outLen = 0;
ret = EVP_PKEY_sign(
    ctx, NULL, &outLen, reinterpret_cast<const unsigned char*>(md.data()), md.size());
assert(ret == 1);
unsigned char* out = new unsigned char[outLen];
ret = EVP_PKEY_sign(
    ctx, out, &outLen, reinterpret_cast<const unsigned char*>(md.data()), md.size());
assert(ret == 1);
```

##### 5.1.7、EVP_PKEY_CTX_free

释放密钥对上下文对象

```cpp
void EVP_PKEY_CTX_free(EVP_PKEY_CTX *ctx);
```

参数解释：

- `ctx`：指向要释放内存的密钥对上下文对象的指针。

```cpp
// 释放上下文
EVP_PKEY_CTX_free(ctx);
```

完整示例：

```cpp
QByteArray RSACrypto::sign(const QByteArray& data, QCryptographicHash::Algorithm hashType)
{
    // 计算哈希值
    QCryptographicHash hashCode(hashType);
    hashCode.addData(data);
    // 目前md存储的是二进制格式数据
    QByteArray md = hashCode.result();

    // 创建解密数据的上下文对象
    EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new(m_privateKey, NULL);
    assert(ctx != NULL);

    // 设置加密和填充模式
    int ret = EVP_PKEY_sign_init(ctx);
    assert(ret == 1);

    // NOTE 设置签名时，不能使用RSA_PKCS1_OAPE_PADDING这种填充方式
    // OAEP 是一种概率性加密填充，每次加密同一明文会产生不同的密文
    // 但签名需要确定性，这样才能保证相同数据的签名结果可以被验证
    ret = EVP_PKEY_CTX_set_rsa_padding(ctx, RSA_PKCS1_PADDING);
    assert(ret == 1);

    // 设置签名使用的哈希算法
    ret = EVP_PKEY_CTX_set_signature_md(ctx, hashMethods.value(hashType)());
    assert(ret == 1);

    // 数据签名
    size_t outLen = 0;
    ret = EVP_PKEY_sign(
        ctx, NULL, &outLen, reinterpret_cast<const unsigned char*>(md.data()), md.size());
    assert(ret == 1);
    unsigned char* out = new unsigned char[outLen];
    ret = EVP_PKEY_sign(
        ctx, out, &outLen, reinterpret_cast<const unsigned char*>(md.data()), md.size());
    assert(ret == 1);

    QByteArray signData(reinterpret_cast<char*>(out), outLen);

    // 释放资源
    delete[] out;
    EVP_PKEY_CTX_free(ctx);
    return signData;
}
```

#### 5.2、数据校验

##### 5.2.1、哈希值计算

Qt的**QCryptographicHash**提供了一系列的加密算法实现，其中就包括哈希值计算

```cpp
QCryptographicHash::Algorithm hashType;
hashType = QCryptographicHash::Sha256;

// 计算哈希值
QCryptographicHash hashCode(hashType);
hashCode.addData(data);
// 目前md存储的是二进制格式数据
QByteArray md = hashCode.result();
```

##### 5.2.2、EVP_PKEY_CTX_new

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

##### 5.2.3、EVP_PKEY_verify_init

用于使用非对称密钥进行验签操作的函数

```cpp
int EVP_PKEY_verify_init(EVP_PKEY_CTX *);
```

参数解释：

- ctx：要进行数据校验操作的密钥上下文

返回值

- 1：成功
- 0：失败

```cpp
int ret = EVP_PKEY_sign_init(ctx);
assert(ret == 1);
```

##### 5.2.4、EVP_PKEY_CTX_set_rsa_padding

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

##### 5.2.5、EVP_PKEY_CTX_set_signature_md

用于设置签名算法

```cpp
int EVP_PKEY_CTX_set_signature_md(EVP_PKEY_CTX *ctx, const EVP_MD *md);
```

参数解释：

- `ctx`：指向 `EVP_PKEY_CTX` 上下文结构的指针，用于设置签名算法。
- `md`：指向 `EVP_MD` 结构的指针，表示要使用的签名算法。

签名算法由 OpenSSL 中的 `EVP_MD` 结构表示，其中包含有关算法的信息，如名称、摘要长度等

返回值

- 1：成功
- 0：失败

```cpp
const QMap<QCryptographicHash::Algorithm, hashFunc> hashMethods = {
    {QCryptographicHash::Md5, EVP_md5},
    {QCryptographicHash::Sha1, EVP_sha1},
    {QCryptographicHash::Sha224, EVP_sha224},
    {QCryptographicHash::Sha256, EVP_sha256},
    {QCryptographicHash::Sha384, EVP_sha384},
    {QCryptographicHash::Sha512, EVP_sha512},
    {QCryptographicHash::Sha3_224, EVP_sha3_224},
    {QCryptographicHash::Sha3_256, EVP_sha3_256},
    {QCryptographicHash::Sha3_384, EVP_sha3_384},
    {QCryptographicHash::Sha3_512, EVP_sha3_512},
};
// 设置校验使用的哈希算法，与签名一致
ret = EVP_PKEY_CTX_set_signature_md(ctx, hashMethods.value(hashType)());
assert(ret == 1);
```

##### 5.2.6、EVP_PKEY_verify

使用非对称密钥进行签名操作的函数

```cpp
int EVP_PKEY_sign(EVP_PKEY_CTX *ctx, 
        unsigned char *sig, size_t *siglen,
        const unsigned char *tbs, size_t tbslen);
```

参数解释：

- `ctx`：指向 `EVP_PKEY_CTX` 上下文结构的指针，表示签名操作的上下文。
- `sig`：指向缓冲区的指针，用于存储签名结果。
- `siglen`：指向 `sig` 缓冲区长度的指针，表示输入时表示 `sig` 缓冲区的长度，输出时表示实际写入 `sig` 的字节数。
- `tbs`：指向要签名的数据的指针。
- `tbslen`：要签名的数据的长度。

返回值：

- 1：成功
- 0：失败

```cpp
// 签名校验
size_t outLen = 0;
ret = EVP_PKEY_verify(ctx,
                      reinterpret_cast<const unsigned char*>(sign.data()),
                      sign.size(),
                      reinterpret_cast<const unsigned char*>(md.data()),
                      md.size());
```

##### 5.2.7、EVP_PKEY_CTX_free

释放密钥对上下文对象

```cpp
void EVP_PKEY_CTX_free(EVP_PKEY_CTX *ctx);
```

参数解释：

- `ctx`：指向要释放内存的密钥对上下文对象的指针。

```cpp
// 释放上下文
EVP_PKEY_CTX_free(ctx);
```

##### 完整示例

```cpp
bool RSACrypto::varify(const QByteArray& sign,
                       const QByteArray& data,
                       QCryptographicHash::Algorithm hashType)
{
    // 计算哈希值
    QCryptographicHash hashCode(hashType);
    hashCode.addData(data);
    // 目前md存储的是二进制格式数据
    QByteArray md = hashCode.result();

    // 创建解密数据的上下文对象
    EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new(m_publicKey, NULL);
    assert(ctx != NULL);

    // 设置加密和填充模式
    int ret = EVP_PKEY_verify_init(ctx);
    assert(ret == 1);
    // 填充要与签名的一致
    ret = EVP_PKEY_CTX_set_rsa_padding(ctx, RSA_PKCS1_PADDING);
    assert(ret == 1);

    // 设置签名使用的哈希算法
    ret = EVP_PKEY_CTX_set_signature_md(ctx, hashMethods.value(hashType)());
    assert(ret == 1);

    // 签名校验
    size_t outLen = 0;
    ret = EVP_PKEY_verify(ctx,
                          reinterpret_cast<const unsigned char*>(sign.data()),
                          sign.size(),
                          reinterpret_cast<const unsigned char*>(md.data()),
                          md.size());
    EVP_PKEY_CTX_free(ctx);
    if (ret == 1)
        return true;
    return false;
}

```