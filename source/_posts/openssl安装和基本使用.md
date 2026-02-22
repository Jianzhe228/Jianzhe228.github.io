title: openssl安装和基本使用
date: 2025-03-08 16:40:00
categories: OpenSSL
tags: [openssl]
---
### 一、windows安装

- Windows 可以直接下载已经编译好的库：https://slproweb.com/products/Win32OpenSSL.html

    安装后将bin和lib添加到环境变量
    
    ![image-20250314170922728](https://images.guangyin.blog/2025/03/353441199ff5da2d4bff65cd69227af1.webp)

### 二、linux安装

源码地址：https://github.com/openssl/openssl

```shell
# 从 github 仓库下载
$ git clone https://github.com/openssl/openssl.git
```

安装 （安装过程可参考官方提供的文档 https://github.com/openssl/openssl/blob/master/NOTES-UNIX.md）

```shell
# 解压缩 (非git下载)
$ unzip openssl-master.zip 
# 进入解压目录
$ cd openssl-master
# 构建并安装
# 检查安装环境, 生成 makefile
$ ./Configure --prefix=/usr/local/ssl     \
              --openssldir=/usr/local/ssl \
              '-Wl,-rpath,$(LIBRPATH)'              
$ make -j$(nproc)
$ sudo make install
```

安装完成之后，可执行程序被安装到了`/usr/local/ssl/bin`目录中:

```shell
$ ls /usr/local/ssl/bin/
c_rehash  openssl
```

为了能够全局访问`openssl`，可以创建一个软连接（快捷方式）：

```shell
$ sudo ln -s /usr/local/ssl/bin/openssl /usr/bin/openssl
```

测试

```shell
$ openssl version
OpenSSL 3.2.0-dev  (Library: OpenSSL 3.2.0-dev )
```

如果`openssl`能够正常工作，我们就可以看到它的版本号了。

### 三、配置CMake

#### 1、windows

```cmake
set(OPENSSL_PATH "D:/OpenSSL-Win64")
include_directories(${OPENSSL_PATH}/include)
link_directories(${OPENSSL_PATH}/lib/VC/x64/MD)
target_link_libraries(${PROJECT_NAME} libcrypto)
```

#### 2、linux

```cmake
set(OPENSSL_PATH /usr/local/ssl)
include_directories(${OPENSSL_PATH}/include)
link_directories(${OPENSSL_PATH}/lib64)
target_link_libraries(${PROJECT_NAME} crypto)
```

