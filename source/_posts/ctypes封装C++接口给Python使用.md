title: ctypes封装C++接口给Python使用
date: 2026-02-04 07:06:24
categories: 搞七捻三
tags: [C++,python]
---
### ctypes封装C++接口给Python使用

**一般步骤**
1. 设计 C API 边界，新增 `*.h/*.cpp`，用 `extern "C"` 暴露纯 C 接口。
2. C API 只暴露基础类型与不透明句柄，避免直接暴露 C++ 类型。
3. 约定错误处理，统一返回错误码，必要时提供 `get_last_error`。
4. 约定内存管理，C 层分配的内存由 C 层提供 `free` 释放函数。
5. 生成动态库，Linux/macOS 需要 `-fPIC` 与 `-shared`。
6. Python 侧用 `ctypes` 加载库，并为每个函数配置 `argtypes/restype`。

**最小示例**
目标：封装一个 C++ `Calculator`，支持 `add`、返回字符串、回调通知。

**文件 1：demo_c_api.h**

```c
#ifndef DEMO_C_API_H
#define DEMO_C_API_H

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
    #ifdef DEMO_C_EXPORTS
        #define DEMO_C_API __declspec(dllexport)
    #else
        #define DEMO_C_API __declspec(dllimport)
    #endif
#else
    #define DEMO_C_API __attribute__((visibility("default")))
#endif

typedef void* DemoHandle;
typedef void (*DemoMessageCallback)(const char* message, void* user_data);

DEMO_C_API DemoHandle demo_create(void);
DEMO_C_API void demo_destroy(DemoHandle handle);
DEMO_C_API int demo_add(DemoHandle handle, int a, int b);
DEMO_C_API char* demo_get_name(DemoHandle handle);
DEMO_C_API void demo_free_string(char* str);
DEMO_C_API void demo_set_callback(
    DemoHandle handle,
    DemoMessageCallback callback,
    void* user_data
);

#ifdef __cplusplus
}
#endif

#endif
```

**文件 2：demo_c_api.cpp**

```cpp
#include "demo_c_api.h"

#include <cstdlib>
#include <cstring>
#include <string>

class Calculator {
public:
    int add(int a, int b) {
        return a + b;
    }
};

static char* copy_string(const std::string& text) {
    char* result = static_cast<char*>(std::malloc(text.size() + 1));
    if (result) {
        std::memcpy(result, text.c_str(), text.size() + 1);
    }
    return result;
}

struct DemoWrapper {
    Calculator impl;
    DemoMessageCallback callback = nullptr;
    void* user_data = nullptr;
};

DemoHandle demo_create(void) {
    return new DemoWrapper();
}

void demo_destroy(DemoHandle handle) {
    if (!handle) {
        return;
    }
    auto* wrapper = static_cast<DemoWrapper*>(handle);
    delete wrapper;
}

int demo_add(DemoHandle handle, int a, int b) {
    if (!handle) {
        return 0;
    }
    auto* wrapper = static_cast<DemoWrapper*>(handle);
    int result = wrapper->impl.add(a, b);
    if (wrapper->callback) {
        std::string message = "add called";
        wrapper->callback(message.c_str(), wrapper->user_data);
    }
    return result;
}

char* demo_get_name(DemoHandle handle) {
    if (!handle) {
        return nullptr;
    }
    return copy_string("Calculator");
}

void demo_free_string(char* str) {
    if (str) {
        std::free(str);
    }
}

void demo_set_callback(
    DemoHandle handle,
    DemoMessageCallback callback,
    void* user_data
) {
    if (!handle) {
        return;
    }
    auto* wrapper = static_cast<DemoWrapper*>(handle);
    wrapper->callback = callback;
    wrapper->user_data = user_data;
}
```

**编译动态库（Linux 示例）**
```bash
g++ -std=c++17 -fPIC -shared demo_c_api.cpp -o libdemo.so
```

**文件 3：demo.py（直接 ctypes 调用 + 再封装一层，仅提供接口）**

```python
import ctypes
from pathlib import Path

_CALLBACK = ctypes.CFUNCTYPE(None, ctypes.c_char_p, ctypes.c_void_p)

class Calculator:
    def __init__(self):
        lib_path = (Path(__file__).parent / "libdemo.so").resolve()
        self._lib = ctypes.CDLL(str(lib_path))
        self._lib.demo_create.argtypes = []
        self._lib.demo_create.restype = ctypes.c_void_p
        self._lib.demo_destroy.argtypes = [ctypes.c_void_p]
        self._lib.demo_destroy.restype = None
        self._lib.demo_add.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int]
        self._lib.demo_add.restype = ctypes.c_int
        self._lib.demo_get_name.argtypes = [ctypes.c_void_p]
        self._lib.demo_get_name.restype = ctypes.c_void_p
        self._lib.demo_free_string.argtypes = [ctypes.c_void_p]
        self._lib.demo_free_string.restype = None
        self._lib.demo_set_callback.argtypes = [
            ctypes.c_void_p,
            _CALLBACK,
            ctypes.c_void_p,
        ]
        self._lib.demo_set_callback.restype = None
        self._handle = self._lib.demo_create()
        self._callback = None

    def add(self, a: int, b: int) -> int:
        if not self._handle:
            raise RuntimeError("Calculator 未初始化")
        return int(self._lib.demo_add(self._handle, a, b))

    def get_name(self) -> str:
        if not self._handle:
            raise RuntimeError("Calculator 未初始化")
        ptr = self._lib.demo_get_name(self._handle)
        if not ptr:
            return ""
        raw = ctypes.cast(ptr, ctypes.c_char_p).value or b""
        self._lib.demo_free_string(ptr)
        return raw.decode("utf-8", errors="ignore")

    def set_callback(self, callback) -> None:
        if not self._handle:
            raise RuntimeError("Calculator 未初始化")
        if callback is None:
            raise RuntimeError("回调不能为空")

        def _bridge(message_ptr, user_data):
            text = message_ptr.decode("utf-8", errors="ignore") if message_ptr else ""
            callback(text)

        self._callback = _CALLBACK(_bridge)
        self._lib.demo_set_callback(self._handle, self._callback, None)

    def close(self) -> None:
        if self._handle:
            self._lib.demo_destroy(self._handle)
            self._handle = None
            self._callback = None
```

**文件 4：test.py（使用 demo.py 提供的接口）**

```python
from demo import Calculator

def on_message(text: str) -> None:
    print("callback:", text)

calc = Calculator()
print("name:", calc.get_name())
calc.set_callback(on_message)
print("1 + 2 =", calc.add(1, 2))
calc.close()
```

