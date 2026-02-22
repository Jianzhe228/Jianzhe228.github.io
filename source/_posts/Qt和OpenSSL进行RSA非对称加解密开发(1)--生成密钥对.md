title: Qt和OpenSSL进行RSA非对称加解密开发(1)--生成密钥对
date: 2025-03-12 14:11:00
categories: OpenSSL
tags: [Qt,openssl]
---
### 一、基本用法

```cpp
// 生成密钥对
RSACrypto rsa;
rsa.generateRSAKeyPair(RSACrypto::BITS_2K);

// 公钥加密
RSACrypto rsa1("public.pem", RSACrypto::PUBLICKEY);
QByteArray cipher = rsa1.publicEncrypt("测试数据");

// 私钥解密 
RSACrypto rsa2("private.pem", RSACrypto::PRIVATEKEY);
QByteArray plain = rsa2.privateDecrypt(cipher);

// 数字签名
QByteArray signature = rsa2.sign(plain);

// 签名验证
bool isValid = rsa1.verify(signature, plain);

```

**必要头文件**

```cpp
#include <openssl/rsa.h>
#include <openssl/pem.h>
#include <openssl/evp.h>
#include <openssl/rsa.h>
#include <openssl/bio.h>
```

### 二、生成密钥对

#### 2.1、EVP_PKEY_CTX_new_id

用于创建密钥上下文的函数，基于给定的公钥算法标识符创建一个新的密钥上下文对象

```cpp
EVP_PKEY_CTX *EVP_PKEY_CTX_new_id(int id, ENGINE *e);
```

参数解释：

- **id** : 公钥算法的标识符，用于指定要使用的加密算法,可以使用 `EVP_PKEY_XXX` 常量（例如 `EVP_PKEY_RSA`、`EVP_PKEY_EC`）指定所需的算法。
- **e**：可选参数，指定要使用的加密引擎。如果为 NULL，则使用默认的加密引擎

返回值：

- 成功：返回指向新创建的 `EVP_PKEY_CTX` 对象的指针。
- 失败：返回 NULL。

```cpp
// 创建密钥上下文对象
EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new_id(EVP_PKEY_RSA, NULL);
assert(ctx != NULL);
```



#### 2.2、EVP_PKEY_keygen_init

用于初始化密钥对生成操作的函数，用于**初始化设置密钥生成操作的参数和上下文ctx**

```cpp
int EVP_PKEY_keygen_init(EVP_PKEY_CTX *ctx);
```

参数解释：

- `ctx`：指向要初始化的密钥对上下文的指针。

返回值：

- 1：成功初始化密钥对生成操作。
- 0 或者 负数：初始化失败。

```cpp
    // 初始化ctx
    int ret = EVP_PKEY_keygen_init(ctx);
    assert(ret == 1);
```

#### 2.3、EVP_PKEY_CTX_set_rsa_keygen_bits

用于**设置生成的 RSA 密钥对的位数**

```cpp
int EVP_PKEY_CTX_set_rsa_keygen_bits(EVP_PKEY_CTX *ctx, int bits);
```

参数解释：

- `ctx`：指向要设置 RSA 密钥对位数的密钥对上下文的指针。
- `bits`：要生成的 RSA 密钥对的位数。

返回值:

- 1:成功设置 RSA 密钥生成位数。
- 0: 或者 负数：设置失败。

```cpp
// 密钥长度,单位为比特
enum KeyLength
{
BITS_1K = 1024,
BITS_2K = 2048,
BITS_3K = 3072,
BITS_4K = 4096
};

// 指定密钥对长度,bits是KeyLength类型
ret = EVP_PKEY_CTX_set_rsa_keygen_bits(ctx, bits);
assert(ret == 1);
```



#### 2.4、EVP_PKEY_generate

根据提供的密钥对上下文对象，**生成一个新的密钥对**,生成的密钥对保存在ppkey中

```cpp
int EVP_PKEY_generate(EVP_PKEY_CTX *ctx, EVP_PKEY **ppkey);
```

参数解释：

- `ctx`：指向已初始化的密钥对上下文的指针。
- `ppkey`：指向接收生成的密钥对的指针,生成的密钥对保存在ppkey中。

返回值：

- 1：成功生成密钥对。
- 0 或者 负数：生成失败。

```cpp
EVP_PKEY* m_privateKey = NULL;
// 生成密钥对
ret = EVP_PKEY_generate(ctx, &m_privateKey);
assert(ret == 1);
```

> 注意：ppkey可以使用私钥，这是因为私钥包含公钥，而公钥只包含公钥。同时，如果在函数中使用new创建一个EVP_PKEY*对象，没有回收会导致内存泄露。

#### 2.5、EVP_PKEY_CTX_free

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

#### 2.6、BIO_new_file

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
// 将私钥写入文件(私钥里面包含公钥)，pri是私钥文件名
BIO* bio = BIO_new_file(pri.data(), "wb");
ret = PEM_write_bio_PrivateKey(bio, m_privateKey, NULL, NULL, 0, NULL, NULL);
assert(ret == 1);
BIO_flush(bio);
BIO_free(bio);

// 将公钥写入文件，pub是公钥文件名
bio = BIO_new_file(pub.data(), "wb");
ret = PEM_write_bio_PUBKEY(bio, m_privateKey);
assert(ret == 1);
BIO_flush(bio);
BIO_free(bio);
```



#### 2.7、BIO_flush

刷新 `BIO` 对象，将内存中的数据写入磁盘中，跟**fflush**函数类似

```cpp
int BIO_flush(BIO *bio);
```

参数解释：

- `bio`：指向要刷新的 `BIO` 对象的指针。

返回值：

- 成功：返回 1。
- 失败：返回 0。

#### 2.8、BIO_free

释放 `BIO` 对象

```cpp
void BIO_free(BIO *bio);
```

参数解释：

- `bio`：指向要释放的 `BIO` 对象的指针。

#### 完整示例

```cpp
void RSACrypto::generateRSAKeyPair(KeyLength bits, const QByteArray& pub, const QByteArray& pri)
{
    // 创建密钥上下文对象
    EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new_id(EVP_PKEY_RSA, NULL);
    assert(ctx != NULL);

    // 初始化ctx
    int ret = EVP_PKEY_keygen_init(ctx);
    assert(ret == 1);

    // 指定密钥对长度
    ret = EVP_PKEY_CTX_set_rsa_keygen_bits(ctx, bits);
    assert(ret == 1);

    // 生成密钥对
    ret = EVP_PKEY_generate(ctx, &m_privateKey);
    assert(ret == 1);

    // 释放上下文
    EVP_PKEY_CTX_free(ctx);

    // 将私钥写入文件(私钥里面包含公钥)
    BIO* bio = BIO_new_file(pri.data(), "wb");
    ret = PEM_write_bio_PrivateKey(bio, m_privateKey, NULL, NULL, 0, NULL, NULL);
    assert(ret == 1);
    BIO_flush(bio);
    BIO_free(bio);

    // 将公钥写入文件
    bio = BIO_new_file(pub.data(), "wb");
    ret = PEM_write_bio_PUBKEY(bio, m_privateKey);
    assert(ret == 1);
    BIO_flush(bio);
    BIO_free(bio);
}
```