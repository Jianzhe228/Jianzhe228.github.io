title: C++ 报错：cannot found -lxxx
date: 2025-03-14 07:25:00
categories: C-篇
tags: [C++]
---
### cannot found -lxxx动态库

找不到动态库文件，排查方向

1. 在当前CMakeLists.txt文件下使用**link_directories**指定动态库路径

    ```cmake
    set(PROTOBUF_PATH "D:/protobuf-cpp-3.21.12")
    link_directories(${PROTOBUF_PATH}/lib)
    ```

2. 如果还是找不到，将**link_directories**的实现添加到顶层CMakeLists.txt文件中

    > 原因：你在子目录serialize中添加的上述的动态库路径，但还是报错，可能是**其他同级子目录或者上层目录**使用了serialize目录的相关代码，因此其他目录也需要链接该动态库，但是由于CMake添加的**link_directories**只在该目录及其子目录下生效，在其他同级目录和上层目录是不生效的，所以其他目录也会报出错误：**cannot found -lxxx**

3. 确保库文件名正确，详细信息可以查看这篇文章：[如何在CMake中正确的添加库文件：MSVC与MinGW混用陷阱](https://www.228610.xyz/2025/03/14/如何在CMake中正确的添加库文件：MSVC与MinGW混用陷阱/)
