title: C++生成随机数
date: 2025-03-28 06:29:00
categories: 开发调优
tags: [C++]
---
### 一、random_device

创建随机设备对象,通过本设备的随机数生成器生成随机种子，而不是使用时间生产随机种子

```cpp
std::random_device rd;
```

### 二、mt19937

创建随机数引擎对象，参数是创建的随机设备对象random_device，随机设备对象重载了`()`,rd()在这里是可调用对象

```cpp
std::mt19937 gen(rd());
```

### 三、uniform_int_distribution

 创建随机数分布对象-均匀分布，参数是范围，最小值和最大值的范围，范围是闭区间

```cpp
 std::uniform_int_distribution<int> dis(min,max);
```

### 四、生成随机数

```cpp
  int randomNumber = dis(gen);
```

### 完整代码

生成一个随机数数组

```cpp
std::vector<int> generateRandomArray(int size)
{
    std::vector<int> arr;
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<int> dis(0, 10000);
    for (size_t i = 0; i < size; i++)
    {
        arr.push_back(dis(gen));
    }
    return arr;
}
```

