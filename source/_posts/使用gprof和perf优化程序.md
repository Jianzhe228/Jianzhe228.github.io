title: 使用gprof和perf优化程序
date: 2025-04-03 10:01:50
categories: 开发调优
tags: [C++]
---
### 一、gprof

- 测试用例

```cpp
#include <iostream>
#include <vector>
#include <chrono>
#include <thread>

// 递归阶乘函数
unsigned long long factorial(unsigned int n) {
    if (n <= 1)
        return 1;
    return n * factorial(n - 1);
}

// 递归斐波那契函数（故意设计为低效实现）
unsigned long long fibonacci(unsigned int n) {
    if (n <= 1)
        return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// 矩阵乘法函数
void matrix_multiply(const std::vector<std::vector<double>>& A,
                     const std::vector<std::vector<double>>& B,
                     std::vector<std::vector<double>>& C) {
    int n = A.size();
    
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            C[i][j] = 0;
            for (int k = 0; k < n; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
}

// 创建填充特定值的矩阵
std::vector<std::vector<double>> create_matrix(int size, double value) {
    std::vector<std::vector<double>> matrix(size, std::vector<double>(size, value));
    return matrix;
}

// 执行多项计算任务的函数
void do_work() {
    // 计算阶乘
    for (int i = 1; i <= 20; i++) {
        unsigned long long result = factorial(i);
    }
    
    // 计算斐波那契数列（数值不太大，避免过长运行时间）
    for (int i = 1; i <= 30; i++) {
        unsigned long long result = fibonacci(i);
    }
    
    // 矩阵运算
    int matrix_size = 100;
    auto A = create_matrix(matrix_size, 1.2);
    auto B = create_matrix(matrix_size, 0.8);
    auto C = create_matrix(matrix_size, 0.0);
    
    matrix_multiply(A, B, C);
    
    // 添加一些人为延迟
    std::this_thread::sleep_for(std::chrono::milliseconds(10));
}

// 另一个函数，用于展示调用图
void another_function() {
    // 进行一些计算
    double sum = 0.0;
    for (int i = 0; i < 1000000; i++) {
        sum += i * 0.01;
    }
    
    // 调用do_work
    do_work();
}

int main() {
    std::cout << "Starting gprof example program\n";
    
    // 多次调用函数
    for (int i = 0; i < 5; i++) {
        do_work();
        another_function();
    }
    
    std::cout << "Program completed\n";
    return 0;
}
```

- 生成分析：

```cpp
g++ -pg gprof.cpp -o test
./test //生成gmon.out文件
gprof build/app gmon.out > analysis.txt
```

![image-20250403173859610](https://images.guangyin.blog/2025/04/720821249aeae22ee0f7477a14aa4b5f.webp)

关键参数：

- **%time**:该函数（包括其调用的子函数）占总程序运行时间的百分比。百分比越高的函数越值得优先优化。
- **cumulative seconds**:该函数及其所有子函数的总耗时
- **self seconds**:函数自身代码的直接耗时（不包含子函数的耗时）。若 `self seconds` 高，说明函数内部逻辑复杂或计算密集。
- **calls**:函数在程序运行期间被调用的总次数。
- **self ms/call**：单次调用该函数自身的平均耗时（不包括子函数）,衡量函数单次执行的效率，适用于优化高频调用的函数。
- **total ms/call**：单次调用该函数及其所有子函数的平均耗时。反映函数及其子函数的整体开销,用于分析调用链的总体成本。
- **name**：函数在代码中的名称（或符号）

通过 `%time` 和 `cumulative seconds` 找到耗时最长的代码路径。优先优化 `%time` 高且 `self seconds` 大的函数，或高频调用（`calls` 多）但 `self ms/call` 高的函数。

如图中所示：

- `matrix_multiply()`：占总执行时间的42.86%，被调用510次，每次调用花费约0.24毫秒
- `std::vector<std::vector<double>, std::allocator<...>>`相关操作：约占17.86%的时间
- `create_matrix(int, double)`：占10.71%的时间，被调用30次，每次调用约1毫秒

优化建议：

1. 高性能线性代数库替代自定义的`matrix_multiply`
2. `create_matrix`函数被调用次数不多但耗时较高，检查是否可以重用矩阵而非频繁创建
3. 避免使用嵌套`std::vector`表示矩阵，会导致内存碎片和缓存不友好，使用专门的矩阵类或使用连续内存布局



### 二、perf

#### 2.1、安装perf

```cpp
sudo apt install linux-tools-common linux-tools-generic linux-tools-`uname -r`
perf --version
```

#### 2.2、使用

```cpp
g++ -g pref.cpp -o app
perf record -g ./app
perf report --call-graph
```

如果遇到如下问题：

```cpp
Error:
Access to performance monitoring and observability operations is limited.
Consider adjusting /proc/sys/kernel/perf_event_paranoid setting to open
access to performance monitoring and observability operations for processes
without CAP_PERFMON, CAP_SYS_PTRACE or CAP_SYS_ADMIN Linux capability.
More information can be found at 'Perf events and tool security' document:
https://www.kernel.org/doc/html/latest/admin-guide/perf-security.html
perf_event_paranoid setting is 4:
  -1: Allow use of (almost) all events by all users
      Ignore mlock limit after perf_event_mlock_kb without CAP_IPC_LOCK
>= 0: Disallow raw and ftrace function tracepoint access
>= 1: Disallow CPU event access
>= 2: Disallow kernel profiling
To make the adjusted perf_event_paranoid setting permanent preserve it
in /etc/sysctl.conf (e.g. kernel.perf_event_paranoid = <setting>)
```

可以使用如下方法：

```cpp
sudo sh -c 'echo -1 > /proc/sys/kernel/perf_event_paranoid'
cat /proc/sys/kernel/perf_event_paranoid
sudo sh -c 'echo "kernel.perf_event_paranoid = -1" >> /etc/sysctl.conf'
sudo sysctl -p
```

