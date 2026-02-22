title: Qt和OpenSSL进行RSA非对称加解密开发(总)
date: 2025-03-11 10:46:00
categories: OpenSSL
tags: [Qt,openssl]
---
>文章有很多相同函数的解释，建议直接跳到需要学习的目录
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

### 三、读取或释放密钥对

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

### 四、数据加解密

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



### 五、数字签名和校验

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

