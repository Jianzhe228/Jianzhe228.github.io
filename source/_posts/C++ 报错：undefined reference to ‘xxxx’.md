title: C++ 报错：undefined reference to ‘xxxx’
date: 2025-03-14 06:14:00
categories: C-篇
tags: [C++]
---
### undefined reference to ‘xxx’函数

```bash
#情况1,库链接顺序不正确导致，明显特征是报错的函数是我们自己实现的函数，而不是底层函数
[build] D:/a-mycode/C++/DDZ-NET/client-ddz/window/login.cpp:186: undefined reference to `DataManager::getInstance()'
[build] D:/a-mycode/C++/DDZ-NET/client-ddz/window/login.cpp:187: undefined reference to `DataManager::setIp(QByteArray const&)'
#情况2，没有找到动态库文件，明显特征是报错的函数是底层函数，而不是我们自己实现的函数
[build] tcp/libtcp.a(TcpSocket.cpp.obj): In function `TcpSocket::TcpSocket(QObject*)':
[build] D:/a-mycode/C++/DDZ-NET/client-ddz/tcp/TcpSocket.cpp:11: undefined reference to `__imp_WSAStartup'
```

**原因是库文件找不到,**排查方向：

1. 确保不是因为函数没有实现导致的

2. 确保target_link_libraries函数设置的要链接的对象`<target>`

3. 确保库链接顺序正确，需要在target_link_libraries修改摆放位置，左边库的依赖右边库

    > 例如，A库中用到了B库中的函数，这时就是A库依赖于B库，A库应该在左边，B库在A库右边，如果B库在A库左边，就会报**undefined reference to** 错误，而且有个**明显特征是报错的函数是我们自己实现的函数，而不是底层函数**

4. 确保在target_link_libraries已经添加了导入库

5. 确保target_link_libraries的**lib**库或**dll.a**导入库文件能被找到，使用绝对路径试试

6. 确保dll或so动态库文件能找到，试试添加到环境变量或添加到build目录下(与exe文件同级目录)