title: redis安装和基本使用
date: 2025-03-19 11:58:00
categories: 数据库
tags: [redis]
---
### 一、安装redis

GitHub地址：https://github.com/redis/redis

下载压缩包：https://github.com/redis/redis/archive/refs/tags/7.4.2.tar.gz

```bash
tar -zxvf 7.4.2.tar.gz
cd redis-7.4.2/
make -j$(nproc)
sudo make install
```

- 测试

    - 启动服务器

    ```bash
    redis-server
    ```

    - 连接服务器

    ```bash
    redis-cli
    ```


### 二、安裝hiredis 

GitHub地址：https://github.com/redis/hiredis

下载压缩包：https://github.com/redis/hiredis/archive/refs/tags/v1.2.0.tar.gz

```bash
tar -zxvf v1.2.0.tar.gz
cd hiredis-1.2.0
make -j$(nproc)
sudo make install
```

### 三、安装redis plus plus

GitHub地址：https://github.com/sewenew/redis-plus-plus

下载压缩包：https://github.com/sewenew/redis-plus-plus/archive/refs/tags/1.3.13.tar.gz

```bash
tar -zxvf 1.3.13.tar.gz
cd redis-plus-plus-1.3.13
mkdir build && cd build
cmake -G "Unix Makefiles" ..
make -j$(nproc)
sudo make install
```

### 四、CMake使用

```cmake
#添加Redis++
include_directories(/usr/local/include/sw/redis++)
link_directories(/usr/local/lib)
target_link_libraries(${PROJECT_NAME} redis++ hiredis)
```

