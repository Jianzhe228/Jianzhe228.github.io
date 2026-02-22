title: C++ 报错：fstream打开相对路径文件发生错误
date: 2025-03-18 15:15:00
categories: C-篇
tags: [C++]
---
问题：C++使用**fstream**打开相对路径文件发生错误，只能使用绝对路径，下面是项目结构

![image-20250318231044365](https://images.228610.xyz/2025/03/32e45bb0c32c9e47366727a6031a1d06.webp)

如上图，原以为相对路径是相对于二进制文件(**server-ddz.exe**)的路径，所以使用相对路径`../config/config.json`，但是经过测试，还是相对路径不正确的问题。

下面的代码是查看程序运行时的路径

```cpp
char buffer[256];
char* val = getcwd(buffer, sizeof(buffer));
if (val)
{
    std::cout << buffer << std::endl;
}
```

经过测试，发现运行时的路径是这样的：**/home/jianzhe/code/server-ddz**,并不在bin目录，所以导致相对路径错误。

正确的相对路径应该是：**config/config.json**

