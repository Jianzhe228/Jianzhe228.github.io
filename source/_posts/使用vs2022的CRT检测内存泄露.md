title: 使用vs2022的CRT检测内存泄露
date: 2025-10-29 07:02:17
categories: 开发调优
tags: [C++,CRT]
---
在main.cpp中添加如下内容，需要确保`_CRTDBG_MAP_ALLOC`宏放在最前面

```cpp
#define _CRTDBG_MAP_ALLOC
#include <cstdlib>
#include <crtdbg.h>
#include <iostream>

#ifdef _DEBUG
    #define DBG_NEW new ( _NORMAL_BLOCK , __FILE__ , __LINE__ )
    #define new DBG_NEW
#endif
```

在main函数开始处添加

```cpp
// 打开自动在程序退出时检测泄漏并输出报告
_CrtSetDbgFlag(_CRTDBG_ALLOC_MEM_DF | _CRTDBG_LEAK_CHECK_DF);
```

完整例子，使用debug运行

```cpp
#define _CRTDBG_MAP_ALLOC
#include <cstdlib>
#include <crtdbg.h>
#include <iostream>

#ifdef _DEBUG
    #define DBG_NEW new ( _NORMAL_BLOCK , __FILE__ , __LINE__ )
    #define new DBG_NEW
#endif

int main()
{
    _CrtSetDbgFlag(_CRTDBG_ALLOC_MEM_DF | _CRTDBG_LEAK_CHECK_DF);
    int* p = new int[100]; // 故意制造泄漏
    return 0;
}
```

输出示例：

![image-20251019164600710](https://images.guangyin.blog/2025/10/343812feba9057cba443749e27cceafa.png)

输出显示问题出在memoryleak.cpp文件第14行，泄露大小为400 bytes，如果需要在泄露处中断，可以添加

```cpp
 _CrtSetBreakAlloc(编号);
```

里面的编号就是图片中的160，程序运行到内存泄露处会中断程序