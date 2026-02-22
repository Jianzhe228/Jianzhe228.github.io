title: C++ 报错：‘xxx’ does not name a type
date: 2025-03-16 08:14:00
categories: C-篇
tags: [C++]
---
### ‘xxx’ does not name a type

原因是由于**头文件互相包含**（循环依赖）导致的

```cpp
/mnt/d/a-mycode/C++/DDZ-NET/server-ddz/tcp/include/TcpConnection.h:31:5: error: ‘Communication’ does not name a type
   31 |     Communication* m_reply = nullptr;
      |     ^~~~~~~~~~~~~
```

首先我们需要知道为什么会有头文件互相包含这种错误，假如我们有两个类，类A和类B,在类A的头文件中包含类B的头文件，这意味着，类B是先于类A出现的，即类B需要先于类A被定义。如果类B也包含了类A的头文件，这就出现问题了，因为类A要求类B先出现，而类B又要求类A先出现，这就出现了循环，使编译器无法正确解析类型定义。

**具体原因**是：C++预处理器会将头文件内容直接插入到包含它的文件中，当存在循环依赖时，编译器会在某一点找不到完整的类型定义

解决方案：删除其中一个头文件，防止头文件互相包含
