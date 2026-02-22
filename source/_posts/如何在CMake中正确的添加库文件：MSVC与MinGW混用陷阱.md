title: 如何在CMake中正确的添加库文件：MSVC与MinGW混用陷阱
date: 2025-03-14 08:57:00
categories: 开发调优
tags: [cmake,C++]
---
> 记一次在windows+cmake+MinGW环境下使用openssl添加库文件错误的经历

### 一、库文件介绍

OpenSSL下载路径：https://slproweb.com/products/Win32OpenSSL.html

![image-20250314170922728](https://images.guangyin.blog/2025/03/353441199ff5da2d4bff65cd69227af1.webp)

安装后的库文件是这样的

- bin目录

![image-20250314171205286](https://images.guangyin.blog/2025/03/643232ccca51770dffd9d36753dc74e1.webp)

- lib目录

![image-20250314171309001](https://images.guangyin.blog/2025/03/8436334c95aee648de59b060fb0cb4d7.webp)

可以看到，这是一个使用**MSVC**编译套件编译的库

### 二、遇到的问题

根据经验，添加库文件通常需要"掐头去尾"——即**去掉lib前缀和.lib后缀**。例如，对于**libcrypto.lib**，我尝试这样添加：

```cmake
target_link_libraries(${PROJECT_NAME} crypto)
```

结果报错：`cannot find -lcrypto`

后面我尝试指定完整文件名

```cmake
target_link_libraries(${PROJECT_NAME} libcrypto.lib)
```

依然报错：`cannot find -lcrypto`

### 三、问题分析

#### 3.1 不同系统的库命名约定

- **MSVC (Windows)**: 库通常命名为`crypto.lib`或`libcrypto.lib`
- **GCC/MinGW/Linux**: 库通常命名为`libcrypto.so`或`libcrypto.a`

#### 3.2、CMake的库名处理机制

CMake会根据使用的生成器和编译器自动处理库名转换:

1. **使用不带前缀和后缀的名称**(`crypto`):
    - MSVC生成器会查找`crypto.lib`
    - GCC/MinGW生成器会查找`libcrypto.a`或`libcrypto.dll.a`
2. **使用带lib前缀的名称**(`libcrypto`):
    - MinGW会查找`libcrypto.a`或`libcrypto.dll.a`
    - MSVC会查找`libcrypto.lib`
3. **使用完整文件名带扩展名**(`libcrypto.lib`):
    - MinGW会错误地查找`liblibcrypto.lib.a`或`liblibcrypto.lib.dll.a`

#### 3.3、问题根源

**跨工具链使用导致的命名不匹配**：我使用MinGW编译套件，但链接了MSVC构建的OpenSSL库。

1. 当使用`crypto`引用时：

    - MinGW尝试查找`libcrypto.a`或`libcrypto.dll.a`，但实际文件是`libcrypto.lib`

    - "掐头去尾"规则只适用于同一工具链

2. 当使用`libcrypto.lib`引用时：
    - MinGW尝试查找`liblibcrypto.lib.a`或`liblibcrypto.lib.dll.a`，这显然不存在

### 四、解决方案

1. 方案一：使用不带扩展名的库名

    ```cmake
    target_link_libraries(${PROJECT_NAME} Qt5::Core libcrypto)
    ```

    MinGW会正确地查找`libcrypto.a`或`libcrypto.dll.a`。

2. 方案二：使用绝对路径直接指定库文件

    ```cmake
    target_link_libraries(${PROJECT_NAME} ${OPENSSL_INSTALL_DIR}/lib/libcrypto.lib)
    ```

总结：**当使用与库构建时不同的编译器工具链时，库命名约定可能不匹配，需要特别注意库的引用方式。**
