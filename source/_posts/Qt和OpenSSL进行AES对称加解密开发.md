title: Qt和OpenSSL进行AES对称加解密开发
date: 2025-03-10 05:20:00
categories: OpenSSL
tags: [Qt,openssl]
---
## 一、对称加密

### 1、基本用法

```cpp
// 创建密钥(大小必须与算法匹配)
QByteArray key(32, 'K');  // 32字节密钥用于256位加密

// 创建加密器
AESCrypto crypto(AESCrypto::Algorithm::AES_CBC_256, key);

// 加密数据
QByteArray plainText = "要加密的数据";
QByteArray encrypted = crypto.encrypt(plainText);

// 解密数据
QByteArray decrypted = crypto.decrypt(encrypted);
```

**必要头文件**

```cpp
#include <QByteArray>
#include <QCryptographicHash>
#include <openssl/evp.h>
#include <openssl/aes.h>
```

### 2、密钥长度要求

- AES_xxx_128: 16字节密钥
- AES_xxx_192: 24字节密钥
- AES_xxx_256: 32字节密钥

### 3、支持的加密模式

- **ECB**: 最简单但最不安全，不需要IV (Electronic CodeBook)
- **CBC**: 常用安全模式，需要IV (Cipher Block Chaining)
- **CFB**: 流密码模式，需要IV (Cipher FeedBack)
- **OFB**: 流密码模式，需要IV (Output FeedBack)
- **CTR**: 计数器模式，需要IV (CounTeR)

### 4、基本5步骤

#### 4.1、**EVP_CIPHER_CTX_new**

该函数用于创建一个新的对称加密算法上下文对象（**EVP_CIPHER_CTX**结构体），并返回指向该对象的指针。对称加密算法上下文对象包含了进行加密和解密所需的状态和数据结构

```cpp
EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
```

#### 4.2、 **EVP_CipherInit_ex**

用于初始化加密或解密操作的上下文

```cpp
int EVP_CipherInit_ex(EVP_CIPHER_CTX *ctx, const EVP_CIPHER *cipher,
                   ENGINE *impl, const unsigned char *key,
                   const unsigned char *iv, int enc);
```

- cipher: 加密算法，这是一个函数指针，指向加密算法的实现,可以使用 `EVP_aes_256_cbc()` 或其他支持的算法
- impl: 引擎，默认为nullptr
- key: 对称加密算法所使用的密钥
- iv:初始向量，用于加密算法，分组密码算法加密都需要初始向量来进行第一次加密（ECB模式不需要，但ECB不安全）
- enc: 加密或解密, 1表示加密，0表示解密

返回值的含义如下：

- 如果函数执行成功，则返回1
- 如果发生错误，则返回0

```cpp
//定义函数指针
using algorithmFunc = const EVP_CIPHER* (*)();

//加密算法类型
enum class Algorithm
{
    // 16字节
    AES_ECB_128,
    AES_CBC_128,
    AES_CFB_128,
    AES_OFB_128,
    AES_CTR_128,
    // 24字节
    AES_ECB_192,
    AES_CBC_192,
    AES_CFB_192,
    AES_OFB_192,
    AES_CTR_192,
    // 32字节
    AES_ECB_256,
    AES_CBC_256,
    AES_CFB_256,
    AES_OFB_256,
    AES_CTR_256
};

// 加解密
enum class CryptoType
{
    DECRYPTO,
    ENCRYPTO
};

// 使用map将Algorithm中的加密算法和对应的函数指针进行关联
const QMap<Algorithm, algorithmFunc> m_algorithms = 
{
    // 16字节
    {Algorithm::AES_ECB_128, EVP_aes_128_ecb},
    {Algorithm::AES_CBC_128, EVP_aes_128_cbc},
    {Algorithm::AES_CFB_128, EVP_aes_128_cfb128},
    {Algorithm::AES_OFB_128, EVP_aes_128_ofb},
    {Algorithm::AES_CTR_128, EVP_aes_128_ctr},
    // 24字节
    {Algorithm::AES_ECB_192, EVP_aes_192_ecb},
    {Algorithm::AES_CBC_192, EVP_aes_192_cbc},
    {Algorithm::AES_CFB_192, EVP_aes_192_cfb128},
    {Algorithm::AES_OFB_192, EVP_aes_192_ofb},
    {Algorithm::AES_CTR_192, EVP_aes_192_ctr},
    // 32字节
    {Algorithm::AES_ECB_256, EVP_aes_256_ecb},
    {Algorithm::AES_CBC_256, EVP_aes_256_cbc},
    {Algorithm::AES_CFB_256, EVP_aes_256_cfb128},
    {Algorithm::AES_OFB_256, EVP_aes_256_ofb},
    {Algorithm::AES_CTR_256, EVP_aes_256_ctr}
};

void AESCrypto::generateIvec(unsigned char* ivec)
{
    // NOTE Qt通过QCryptographicHash类提供了对数据进行哈希计算的功能
    // 创建一个QCryptographicHash对象，指定哈希算法为MD5
    QCryptographicHash hash(QCryptographicHash::Md5);
    // 对对称密钥进行哈希计算
    hash.addData(m_key);
    // result()返回一个QByteArray对象，包含了哈希计算的结果
    std::string res = hash.result().toStdString();
    // 将哈希值转换为初始向量
    for (int i = 0; i < AES_BLOCK_SIZE; ++i)
    {
        ivec[i] = res.at(i);
    }
}

//初始向量(IV)生成
unsigned char ivec[AES_BLOCK_SIZE];
generateIvec(ivec);

int ret = EVP_CipherInit_ex(ctx,
                                m_algorithms.value(m_algorithmType)(),
                                nullptr,
                                reinterpret_cast<unsigned char*>(m_key.data()),
                                ivec,
                                cryptoType == CryptoType::ENCRYPTO ? 1 : 0);
```



#### 4.3、**EVP_CipherUpdate**

用于对数据进行分块处理，并在每个块的加密或解密过程中更新输出缓冲区

```cpp
int EVP_CipherUpdate(EVP_CIPHER_CTX *ctx,
                     unsigned char *out,
                     int *outl,
                     const unsigned char *in,
                     int inl);
```

- out: 输出缓冲区
- outl: 整数指针，用于接收写入输出缓冲区的数据长度
- in: 待处理的数据（用于加密的明文和用于解密的密文）
- inl: 待处理的数据长度

```cpp
// 设置填充模式,准备存储数据的缓冲区
int length = data.size() + 1; // +1是为了存储结束符
if (length % AES_BLOCK_SIZE)
{
    // 如果数据长度不是16的倍数，则需要进行填充
    // length/AES_BLOCK_SIZE: 计算出完整的分组数，+1是多出来需要填充的分组
    length = (length / AES_BLOCK_SIZE + 1) * AES_BLOCK_SIZE;
}
unsigned char* out = new unsigned char[length];
int outLength, totalLength = 0;

ret = EVP_CipherUpdate(
    ctx, out, &outLength, reinterpret_cast<const unsigned char*>(data.data()), data.size());
totalLength += outLength;
```

#### 4.4、EVP_CipherFinal_ex

该函数处理最后一个数据块，并输出加密或解密的最终结果

```cpp
int EVP_CipherFinal_ex(EVP_CIPHER_CTX *ctx,
                        unsigned char *outm,
                        int *outl);
```

- outm: 输出缓冲区
- outl: 整数指针，用于接收写入输出缓冲区的数据长度

```cpp
ret = EVP_CipherFinal_ex(ctx, out + outLength, &outLength);
```

#### 4.5、  EVP_CIPHER_CTX_free

该函数释放由 `EVP_CIPHER_CTX_new` 函数创建的上下文

```cpp
void EVP_CIPHER_CTX_free(EVP_CIPHER_CTX *ctx);
```



### 5、完整示例

- AESCrypto.h

```cpp
#ifndef AESCRYPTO_H
#define AESCRYPTO_H

#include <QByteArray>
#include <QMap>
#include <QObject>
#include <openssl/evp.h>

// 数据加解密类
class AESCrypto : public QObject
{
    Q_OBJECT
public:
    // 加密算法类型
    enum class Algorithm
    {
        // 16字节
        AES_ECB_128,
        AES_CBC_128,
        AES_CFB_128,
        AES_OFB_128,
        AES_CTR_128,
        // 24字节
        AES_ECB_192,
        AES_CBC_192,
        AES_CFB_192,
        AES_OFB_192,
        AES_CTR_192,
        // 32字节
        AES_ECB_256,
        AES_CBC_256,
        AES_CFB_256,
        AES_OFB_256,
        AES_CTR_256
    };

    // 加解密
    enum class CryptoType
    {
        DECRYPTO,
        ENCRYPTO
    };

    // 定义函数指针，using 别名 = 返回类型 (*)(参数列表);
    using algorithmFunc = const EVP_CIPHER* (*)();

    AESCrypto(Algorithm algorithm, const QByteArray& key, QObject* parent = nullptr);
    ~AESCrypto();

    // 加密-返回加密后的数据
    QByteArray encrypt(const QByteArray& data);
    // 解密-返回解密后的数据
    QByteArray decrypt(const QByteArray& data);

private:
    // 数据加解密处理
    QByteArray processCrypto(const QByteArray& data, CryptoType cryptoType);
    // 生成初始化向量，用于加密算法
    void generateIvec(unsigned char* ivec);
    // 使用map将Algorithm中的加密算法和对应的函数指针进行关联
    const QMap<Algorithm, algorithmFunc> m_algorithms = 
    {
        // 16字节
        {Algorithm::AES_ECB_128, EVP_aes_128_ecb},
        {Algorithm::AES_CBC_128, EVP_aes_128_cbc},
        {Algorithm::AES_CFB_128, EVP_aes_128_cfb128},
        {Algorithm::AES_OFB_128, EVP_aes_128_ofb},
        {Algorithm::AES_CTR_128, EVP_aes_128_ctr},
        // 24字节
        {Algorithm::AES_ECB_192, EVP_aes_192_ecb},
        {Algorithm::AES_CBC_192, EVP_aes_192_cbc},
        {Algorithm::AES_CFB_192, EVP_aes_192_cfb128},
        {Algorithm::AES_OFB_192, EVP_aes_192_ofb},
        {Algorithm::AES_CTR_192, EVP_aes_192_ctr},
        // 32字节
        {Algorithm::AES_ECB_256, EVP_aes_256_ecb},
        {Algorithm::AES_CBC_256, EVP_aes_256_cbc},
        {Algorithm::AES_CFB_256, EVP_aes_256_cfb128},
        {Algorithm::AES_OFB_256, EVP_aes_256_ofb},
        {Algorithm::AES_CTR_256, EVP_aes_256_ctr}
    };

private:
    Algorithm m_algorithmType; // 加密算法类型
    QByteArray m_key;          // 对称密钥
};

#endif
```

- AESCrypto.cpp

```cpp
#include "AESCrypto.h"
#include "include/AESCrypto.h"
#include "openssl/evp.h"
#include <QCryptographicHash>
#include <cassert>
#include <openssl/aes.h>

AESCrypto::AESCrypto(Algorithm algorithm, const QByteArray& key, QObject* parent) : QObject(parent)
{
    switch (algorithm)
    {
    case Algorithm::AES_CBC_128:
    case Algorithm::AES_ECB_128:
    case Algorithm::AES_OFB_128:
    case Algorithm::AES_CFB_128:
    case Algorithm::AES_CTR_128:
        assert(key.size() == 16);
        break;
    case Algorithm::AES_CBC_192:
    case Algorithm::AES_ECB_192:
    case Algorithm::AES_OFB_192:
    case Algorithm::AES_CFB_192:
    case Algorithm::AES_CTR_192:
        assert(key.size() == 24);
        break;
    case Algorithm::AES_CBC_256:
    case Algorithm::AES_ECB_256:
    case Algorithm::AES_OFB_256:
    case Algorithm::AES_CFB_256:
    case Algorithm::AES_CTR_256:
        assert(key.size() == 32);
        break;
    }

    m_algorithmType = algorithm;
    m_key = key;
}

AESCrypto::~AESCrypto()
{
}

QByteArray AESCrypto::encrypt(const QByteArray& data)
{
    return processCrypto(data, CryptoType::ENCRYPTO);
}

QByteArray AESCrypto::decrypt(const QByteArray& data)
{
    return processCrypto(data, CryptoType::DECRYPTO);
}

QByteArray AESCrypto::processCrypto(const QByteArray& data, CryptoType cryptoType)
{
    // 通过函数生成时需要确保加密和解密生成的密钥一致
    // AES_BLOCK_SIZE: 为AES加密算法的分组长度，16字节
    unsigned char ivec[AES_BLOCK_SIZE];
    generateIvec(ivec);
    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    assert(ctx);

    int ret = EVP_CipherInit_ex(ctx,
                                m_algorithms.value(m_algorithmType)(),
                                nullptr,
                                reinterpret_cast<unsigned char*>(m_key.data()),
                                ivec,
                                cryptoType == CryptoType::ENCRYPTO ? 1 : 0);
    assert(ret);

    // 设置填充模式,准备存储数据的缓冲区
    int length = data.size() + 1; // +1是为了存储结束符
    if (length % AES_BLOCK_SIZE)
    {
        // 如果数据长度不是16的倍数，则需要进行填充
        // length/AES_BLOCK_SIZE: 计算出完整的分组数，+1是多出来需要填充的分组
        length = (length / AES_BLOCK_SIZE + 1) * AES_BLOCK_SIZE;
    }
    unsigned char* out = new unsigned char[length];
    int outLength, totalLength = 0;

    ret = EVP_CipherUpdate(
        ctx, out, &outLength, reinterpret_cast<const unsigned char*>(data.data()), data.size());
    totalLength += outLength;
    assert(ret);

    ret = EVP_CipherFinal_ex(ctx, out + outLength, &outLength);
    totalLength += outLength;
    assert(ret);

    QByteArray outData(reinterpret_cast<char*>(out), totalLength);
    delete[] out;
    EVP_CIPHER_CTX_free(ctx); // 释放上下文
    return outData;
}

// 生成初始向量,对对称密钥进行哈希计算，将哈希值作为初始向量，
// 只要加密算法一致，加解密时使用的初始向量就会一致
void AESCrypto::generateIvec(unsigned char* ivec)
{
    // NOTE Qt通过QCryptographicHash类提供了对数据进行哈希计算的功能
    // 创建一个QCryptographicHash对象，指定哈希算法为MD5
    QCryptographicHash hash(QCryptographicHash::Md5);
    // 对对称密钥进行哈希计算
    hash.addData(m_key);
    // result()返回一个QByteArray对象，包含了哈希计算的结果
    std::string res = hash.result().toStdString();
    // 将哈希值转换为初始向量
    for (int i = 0; i < AES_BLOCK_SIZE; ++i)
    {
        ivec[i] = res.at(i);
    }
}

```

- main.cpp

```cpp
#include <QApplication>
#include <QDebug>
#include "login.h"
#include "AESCrypto.h"

void testAESCrypto() {
	// 测试AES加密解密
	QByteArray key = "1234567890123456";
	AESCrypto aes(AESCrypto::Algorithm::AES_ECB_128, key);
	QByteArray data = aes.encrypt("测试加密算法");
	QByteArray text = aes.decrypt(data);
	qDebug() << "解密后数据:" << text.data();
}

int main(int argc, char *argv[]) {
	QApplication a(argc, argv);
	Login login;
	login.show();
	testAESCrypto();

	return QApplication::exec();
}
```