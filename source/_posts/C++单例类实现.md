title: C++单例类实现
date: 2025-03-20 12:48:00
categories: 开发调优
tags: [C++]
---
### 一、懒汉模式

> 懒汉模式存在线程安全问题

#### 1、双重检测锁(一坨)

```cpp
#ifndef DOUBLE_CHECKED_SINGLETON_H
#define DOUBLE_CHECKED_SINGLETON_H

#include <iostream>
#include <mutex>
#include <atomic>
#include <memory>

class DoubleCheckedSingleton {
public:
    // 禁用复制构造和赋值运算符
    DoubleCheckedSingleton(const DoubleCheckedSingleton&) = delete;
    DoubleCheckedSingleton& operator=(const DoubleCheckedSingleton&) = delete;

    // 获取单例实例
    static DoubleCheckedSingleton* getInstance() {
        DoubleCheckedSingleton* p = instance.load(std::memory_order_acquire);
        if (p == nullptr) { // 第一次检查（无锁）
            std::lock_guard<std::mutex> lock(mutex);
            p = instance.load(std::memory_order_relaxed);
            if (p == nullptr) { // 第二次检查（有锁）
                p = new DoubleCheckedSingleton();
                instance.store(p, std::memory_order_release);
            }
        }
        return p;
    }

    // 释放单例（在程序结束时调用）
    static void destroyInstance() {
        std::lock_guard<std::mutex> lock(mutex);
        if (instance != nullptr) {
            delete instance.load();
            instance = nullptr;
        }
    }

    // 析构函数
    ~DoubleCheckedSingleton() {
        std::cout << "双重检测锁单例被销毁" << std::endl;
    }

private:
    // 私有构造函数，防止外部实例化
    DoubleCheckedSingleton() = default;

    static std::atomic<DoubleCheckedSingleton*> instance;
    static std::mutex mutex;
};

// 静态成员变量初始化
std::atomic<DoubleCheckedSingleton*> DoubleCheckedSingleton::instance{nullptr};
std::mutex DoubleCheckedSingleton::mutex;

#endif // DOUBLE_CHECKED_SINGLETON_H
```

> 双重检测锁在C++中存在内存顺序问题。例如，`instance = new DoubleCheckedSingleton()`这行代码在编译器优化下可能会重排序为：
>
> 1. 分配内存
> 2. 将指针赋值给instance变量
> 3. 构造对象
>
> 如果执行顺序变为1→2→3，在进行到2时实例已经非空，但实例还未构建，如果此时有第三个线程想要获取实例，就会返回一个空的实例！

#### 2、静态局部变量（最推荐的方式）

```cpp
#ifndef STATIC_LOCAL_SINGLETON_H
#define STATIC_LOCAL_SINGLETON_H

#include <iostream>

class StaticLocalSingleton {
public:
    // 禁用复制构造和赋值运算符
    StaticLocalSingleton(const StaticLocalSingleton&) = delete;
    StaticLocalSingleton& operator=(const StaticLocalSingleton&) = delete;
    
    // 获取单例实例
    static StaticLocalSingleton& getInstance() {
        // C++11保证静态局部变量的初始化是线程安全的
        static StaticLocalSingleton instance;
        return instance;
    }
    
    // 析构函数
    ~StaticLocalSingleton() {
        std::cout << "静态局部变量单例被销毁" << std::endl;
    }

private:
    // 私有构造函数
    StaticLocalSingleton() = default;
};

#endif // STATIC_LOCAL_SINGLETON_H
```



### 二、饿汉模式

> 在程序加载时就创建，天然线程安全，无需加锁

#### 1、引用方式

```cpp
#ifndef EAGER_SINGLETON_H
#define EAGER_SINGLETON_H

#include <iostream>

class EagerSingleton {
public:
    // 禁用复制构造和赋值运算符
    EagerSingleton(const EagerSingleton&) = delete;
    EagerSingleton& operator=(const EagerSingleton&) = delete;
    
    // 获取单例实例
    static EagerSingleton& getInstance() {
        return instance;
    }
    
    // 析构函数
    ~EagerSingleton() {
        std::cout << "饿汉单例被销毁" << std::endl;
    }

private:
    // 私有构造函数
    EagerSingleton() = default;
    
    // 静态实例（在程序加载时就创建）先创建对象，不管用与不用
    static EagerSingleton instance;
};

// 静态成员变量初始化
EagerSingleton EagerSingleton::instance;

#endif // EAGER_SINGLETON_H
```

#### 2、指针方式

```cpp
#ifndef EAGER_SINGLETON_PTR_H
#define EAGER_SINGLETON_PTR_H

#include <iostream>

class EagerSingletonPtr {
public:
    // 禁用复制构造和赋值运算符
    EagerSingletonPtr(const EagerSingletonPtr&) = delete;
    EagerSingletonPtr& operator=(const EagerSingletonPtr&) = delete;
    
    // 获取单例实例
    static EagerSingletonPtr* getInstance() {
        return instance;
    }
    
    // 释放单例资源（解决内存泄漏问题）
    static void destroyInstance() {
        if (instance != nullptr) {
            delete instance;
            instance = nullptr;
        }
    }
    
    // 析构函数
    ~EagerSingletonPtr() {
        std::cout << "饿汉单例被销毁" << std::endl;
    }

private:
    // 私有构造函数
    EagerSingletonPtr() = default;
    
    // 静态实例（在程序加载时就创建）先创建对象，不管用与不用
    static EagerSingletonPtr* instance;
};

// 静态成员变量初始化
EagerSingletonPtr* EagerSingletonPtr::instance = new EagerSingletonPtr();

#endif // EAGER_SINGLETON_PTR_H
```

### 三、补充

C++单例类初始化顺序会导致一些问题，详细可以查看[这篇文章](https://www.228610.xyz/2025/03/20/C++单例类实现/)
