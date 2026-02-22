title: C++封装OpenSSL哈希类
date: 2025-03-13 10:18:10
categories: OpenSSL
tags: [C++,openssl]
---
### 一、 基本用法

```cpp
// 创建MD5哈希对象
CryptographicHash hash(CryptographicHash::HashType::Md5);

// 添加数据
hash.addData("Hello World");

// 获取十六进制结果
std::string hexResult = hash.result();
// 获取二进制结果
std::string binResult = hash.result(CryptographicHash::Type::Binary);
```

**必要头文件**

```cpp
#include <openssl/evp.h>
#include <openssl/md5.h>
#include <openssl/sha.h>
#include <map>
```

**通过枚举关联算法长度和实现**

```cpp
enum class HashType : char {
    Md5,
    Sha1,
    Sha224,
    Sha256,
    Sha384,
    Sha512,
    Sha3_224,
    Sha3_256,
    Sha3_384,
    Sha3_512,
};

using hashFunc = const EVP_MD* (*)();
const std::map<HashType, hashFunc> HashMethods = {
    {HashType::Md5, EVP_md5},
    {HashType::Sha1, EVP_sha1},
    {HashType::Sha224, EVP_sha224},
    {HashType::Sha256, EVP_sha256},
    {HashType::Sha384, EVP_sha384},
    {HashType::Sha512, EVP_sha512},
    {HashType::Sha3_224, EVP_sha3_224},
    {HashType::Sha3_256, EVP_sha3_256},
    {HashType::Sha3_384, EVP_sha3_384},
    {HashType::Sha3_512, EVP_sha3_512},
};

const std::map<HashType, int> HashLength
{
    {HashType::Md5,MD5_DIGEST_LENGTH},
    {HashType::Sha1,SHA_DIGEST_LENGTH},
    {HashType::Sha224,SHA224_DIGEST_LENGTH},
    {HashType::Sha256,SHA256_DIGEST_LENGTH},
    {HashType::Sha384,SHA384_DIGEST_LENGTH},
    {HashType::Sha512,SHA512_DIGEST_LENGTH},
    {HashType::Sha3_224,SHA224_DIGEST_LENGTH},
    {HashType::Sha3_256,SHA256_DIGEST_LENGTH},
    {HashType::Sha3_384,SHA384_DIGEST_LENGTH},
    {HashType::Sha3_512,SHA512_DIGEST_LENGTH},
};
```

### 二、核心实现步骤

#### 2.1、**EVP_MD_CTX_new**

创建并初始化一个哈希函数上下文 `EVP_MD_CTX` 对象

```cpp
EVP_MD_CTX *EVP_MD_CTX_new(void);
```

返回值：一个指向 `EVP_MD_CTX` 结构体对象的指针

`EVP_MD_CTX` 是 OpenSSL 中用于保存哈希函数上下文信息的结构体。它包含了执行哈希计算所需的各种状态、缓冲区和上下文信息。

调用 `EVP_MD_CTX_new` 函数会分配内存，并对 `EVP_MD_CTX` 结构体对象进行初始化。之后，可以将该对象传递给其他 OpenSSL 哈希函数相关的函数，以在其中进行进一步的处理和计算。

```cpp
m_ctx = EVP_MD_CTX_new();
assert(m_ctx);
```

#### 2.2、EVP_DigestInit_ex

用于初始化哈希（散列）函数的上下文

```cpp
int EVP_DigestInit_ex(EVP_MD_CTX *ctx, const EVP_MD *type, ENGINE *impl);
```

参数解释：

- `ctx`：指向要初始化的 `EVP_MD_CTX` 结构体指针，该结构体用于保存哈希函数的上下文信息。
- `type`：指向 `EVP_MD` 函数指针，表示要使用的哈希函数的类型。可以使用 OpenSSL 提供的各种哈希函数类型，如 SHA256、SHA512、MD5 等。
- `impl`：可选参数，指定在初始化哈希函数上下文时要使用的加密引擎（如果有）。

返回值：

- 1：成功
- 0：失败

```cpp
int ret = EVP_DigestInit_ex(m_ctx, HashMethods.at(hashType)(),NULL);
assert(ret == 1);
```

#### 2.3、EVP_DigestUpdate

用于更新哈希函数的上下文，`EVP_DigestUpdate` 函数将 `data` 指向的数据添加到哈希函数的上下文中，并在计算摘要时使用这些数据。可以多次调用此函数以处理连续的数据块。

```cpp
int EVP_DigestUpdate(EVP_MD_CTX *ctx, const void *data, size_t count);
```

参数解释：

- `ctx`：指向哈希函数的上下文对象的指针。
- `data`：指向要计算摘要的数据的指针。
- `count`：要处理的数据的字节数。

返回值：

- 1：成功。
- 0：失败。

```cpp
const int ret = EVP_DigestUpdate(m_ctx, data, length);
```

#### 2.4、EVP_DigestFinal_ex

用于计算哈希函数的最终摘要，并将结果存储在指定的md缓冲区中，s记录数据长度，md和s都是传入传出参数

```cpp
int EVP_DigestFinal_ex(EVP_MD_CTX *ctx, unsigned char *md, unsigned int *s);
```

参数解释：

- `ctx`：指向哈希函数的上下文对象的指针。
- `md`：指向存储摘要结果的缓冲区的指针。
- `s`：指向用于存储摘要结果长度的变量的指针。

返回值：

- 1：成功
- 0：失败

```cpp
unsigned int len = 0;
unsigned char md[HashLength.at(m_hashType)];
const int ret = EVP_DigestFinal_ex(m_ctx, md, &len);
```

在调用 `EVP_DigestFinal_ex` 函数之前，必须先调用 `EVP_DigestInit_ex` 和 `EVP_DigestUpdate` 函数，以便初始化哈希函数上下文并处理要计算摘要的数据。

#### 2.5、EVP_MD_CTX_free

用于释放哈希函数的上下文对象所占用的内存空间

```cpp
void EVP_MD_CTX_free(EVP_MD_CTX *ctx);
```

参数解释：

- `ctx`：指向哈希函数的上下文对象的指针。

```cpp
CryptographicHash::~CryptographicHash() {
    if (m_ctx) {
        EVP_MD_CTX_free(m_ctx);
    }
}
```

#### 完整示例：

- CryptographicHash.h

```cpp
#ifndef CRYPTOGRAPHICHASH_H
#define CRYPTOGRAPHICHASH_H

#include <map>
#include <string>
#include <openssl/evp.h>
#include <openssl/sha.h>
#include <openssl/md5.h>

enum class HashType : char {
    Md5,
    Sha1,
    Sha224,
    Sha256,
    Sha384,
    Sha512,
    Sha3_224,
    Sha3_256,
    Sha3_384,
    Sha3_512,
};

using hashFunc = const EVP_MD* (*)();
const std::map<HashType, hashFunc> HashMethods = {
    {HashType::Md5, EVP_md5},
    {HashType::Sha1, EVP_sha1},
    {HashType::Sha224, EVP_sha224},
    {HashType::Sha256, EVP_sha256},
    {HashType::Sha384, EVP_sha384},
    {HashType::Sha512, EVP_sha512},
    {HashType::Sha3_224, EVP_sha3_224},
    {HashType::Sha3_256, EVP_sha3_256},
    {HashType::Sha3_384, EVP_sha3_384},
    {HashType::Sha3_512, EVP_sha3_512},
};

const std::map<HashType, int> HashLength
{
    {HashType::Md5,MD5_DIGEST_LENGTH},
    {HashType::Sha1,SHA_DIGEST_LENGTH},
    {HashType::Sha224,SHA224_DIGEST_LENGTH},
    {HashType::Sha256,SHA256_DIGEST_LENGTH},
    {HashType::Sha384,SHA384_DIGEST_LENGTH},
    {HashType::Sha512,SHA512_DIGEST_LENGTH},
    {HashType::Sha3_224,SHA224_DIGEST_LENGTH},
    {HashType::Sha3_256,SHA256_DIGEST_LENGTH},
    {HashType::Sha3_384,SHA384_DIGEST_LENGTH},
    {HashType::Sha3_512,SHA512_DIGEST_LENGTH},
};

class CryptographicHash {
public:
    enum class Type : char { Binary, Hex };

    explicit CryptographicHash(HashType hashType);

    ~CryptographicHash();

    //添加数据
    void addData(const std::string &data) const;

    void addData(const char *data, int length) const;

    std::string result(Type type = Type::Hex) const;

private:
    EVP_MD_CTX *m_ctx;
    HashType m_hashType;
};


#endif //CRYPTOGRAPHICHASH_H

```

- CryptographicHash.cpp

```cpp
#include "CryptographicHash.h"

#include <cassert>

CryptographicHash::CryptographicHash(const HashType hashType) {
    m_hashType = hashType;
    m_ctx = EVP_MD_CTX_new();
    assert(m_ctx);

    int ret = EVP_DigestInit_ex(m_ctx, HashMethods.at(hashType)(),NULL);
    assert(ret == 1);
}

CryptographicHash::~CryptographicHash() {
    if (m_ctx) {
        EVP_MD_CTX_free(m_ctx);
    }
}

void CryptographicHash::addData(const std::string &data) const {
    addData(data.data(), data.size());
}

void CryptographicHash::addData(const char *data, const int length) const {
    const int ret = EVP_DigestUpdate(m_ctx, data, length);
    assert(ret == 1);
}

std::string CryptographicHash::result(const Type type) const {
    unsigned int len = 0;
    unsigned char md[HashLength.at(m_hashType)];
    const int ret = EVP_DigestFinal_ex(m_ctx, md, &len);
    assert(ret == 1);
    
    //在将二进制哈希值转换为十六进制字符串时，二进制数据的每个字节（8 位）都会扩展为 2 个十六进制字符（每个字符 4 位）。
    //md 是包含原始二进制摘要数据的数组，长度为 len 字节。将其转换为十六进制字符串时：
    //md 中每个字节的范围是 0 到 255（0x00 到 0xFF），用十六进制表示时，每个字节正好需要2个字符：
    //因此: 一个字节的最大值是 255，即十六进制的 FF，占两个字符。因此，它是 res[len*2]
    if (type == Type::Hex) {
        char res[len * 2];
        for (int i = 0; i < len; ++i) {
            sprintf(&res[i * 2], "%02x", md[i]);
        }
        return std::string(res, len * 2);
    }
    return std::string(reinterpret_cast<char *>(md), len);
}
```

