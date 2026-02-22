title: vcpkg 安装和使用
date: 2025-10-28 13:48:00
categories: 开发调优
tags: [C++,vcpkg]
---
## 一、vcpkg 简介

**vcpkg** 是微软开发的 C++ 包管理器，用于简化 C++ 库的获取、编译和集成过程。它包含超过 2000 个开源库的精选注册表，这些库经过 vcpkg 的持续集成管道验证，确保可以协同工作。

## 二、安装和设置

### 1. 克隆 vcpkg 仓库
```bash
git clone https://github.com/microsoft/vcpkg.git
cd vcpkg
```

vcpkg 仓库包含：
- 获取 vcpkg 可执行文件的脚本
- 由 vcpkg 社区维护的精选开源库注册表
- 构建和安装库所需的配方和元数据（不包含库源代码）

### 2. 运行引导脚本
```bash
# Windows (PowerShell)
.\bootstrap-vcpkg.bat

# Linux/macOS
./bootstrap-vcpkg.sh
```

引导脚本会：
- 执行先决条件检查
- 下载 vcpkg 可执行文件

### 3. 设置环境变量
```bash
# PowerShell
$env:VCPKG_ROOT="C:\path\to\vcpkg"
$env:PATH="$env:VCPKG_ROOT;$env:PATH"

# CMD
set "VCPKG_ROOT=C:\path\to\vcpkg"
set PATH=%VCPKG_ROOT%;%PATH%
```

**作用：**
- `VCPKG_ROOT`：帮助 Visual Studio 定位 vcpkg 实例
- 添加到 `PATH`：确保可以直接从命令行运行 vcpkg 命令
- 执行：`vcpkg integrate install`

## 三、核心文件详解

### 1. **vcpkg.json（清单文件）**

这是项目的依赖清单文件，定义项目所需的包。

```json
{
    "dependencies": [
        "fmt"
    ]
}
```

**作用：**
- 声明项目依赖的库
- vcpkg 读取此文件以了解需要安装哪些依赖项
- 与 CMake 集成，为项目提供所需的依赖项
- 应纳入版本控制
- 运行`vcpkg install`会根据vcpkg.json安装依赖

**创建方法：**
```bash
vcpkg new --application        # 创建清单文件
vcpkg add port fmt             # 添加依赖包
```

### 2. **vcpkg-configuration.json（配置文件）**

```json
{
  "default-registry": {
    "kind": "git",
    "baseline": "...",
    "repository": "..."
  }
}
```

**作用：**
- 引入基线（baseline），对项目依赖项设置最低版本约束
- 确保不同开发环境之间的版本一致性
- 建议纳入版本控制
- 通常由 `vcpkg new` 自动生成，一般不需手动修改

### 3. **CMakePresets.json（CMake 预设文件）**

```json
{
  "version": 3,
  "configurePresets": [
    {
      "name": "windows-base",
      "hidden": true,
      "generator": "Ninja",
      "binaryDir": "${sourceDir}/out/build/${presetName}",
      "installDir": "${sourceDir}/out/install/${presetName}",
      "cacheVariables": {
        "CMAKE_C_COMPILER": "cl.exe",
        "CMAKE_CXX_COMPILER": "cl.exe",
        "CMAKE_TOOLCHAIN_FILE": "$env{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake" //添加CMAKE_TOOLCHAIN_FILE
      },
      "condition": {
        "type": "equals",
        "lhs": "${hostSystemName}",
        "rhs": "Windows"
      }
    },
    {
      "name": "x64-debug",
      "displayName": "x64 Debug",
      "inherits": "windows-base",
      "architecture": {
        "value": "x64",
        "strategy": "external"
      },
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug"
      }
    },
    {
      "name": "x64-release",
      "displayName": "x64 Release",
      "inherits": "x64-debug",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Release"
      }
    },
    {
      "name": "linux-debug",
      "displayName": "Linux Debug",
      "generator": "Ninja",
      "binaryDir": "${sourceDir}/out/build/${presetName}",
      "installDir": "${sourceDir}/out/install/${presetName}",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug",
        "CMAKE_TOOLCHAIN_FILE": "$env{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake"//添加CMAKE_TOOLCHAIN_FILE
      },
      "condition": {
        "type": "equals",
        "lhs": "${hostSystemName}",
        "rhs": "Linux"
      },
      "vendor": {
        "microsoft.com/VisualStudioRemoteSettings/CMake/1.0": {
          "sourceDir": "$env{HOME}/.vs/$ms{projectDirName}"
        }
      }
    },
    {
      "name": "macos-debug",
      "displayName": "macOS Debug",
      "generator": "Ninja",
      "binaryDir": "${sourceDir}/out/build/${presetName}",
      "installDir": "${sourceDir}/out/install/${presetName}",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug",
        "CMAKE_TOOLCHAIN_FILE": "$env{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake"//添加CMAKE_TOOLCHAIN_FILE
      },
      "condition": {
        "type": "equals",
        "lhs": "${hostSystemName}",
        "rhs": "Darwin"
      },
      "vendor": {
        "microsoft.com/VisualStudioRemoteSettings/CMake/1.0": {
          "sourceDir": "$env{HOME}/.vs/$ms{projectDirName}"
        }
      }
    }
  ]
}

```

**作用：**
- 配置 CMake 使用 vcpkg 的工具链文件
- 设置 `CMAKE_TOOLCHAIN_FILE` 指向 vcpkg 的自定义工具链
- 使 CMake 能够自动链接 vcpkg 安装的库
- 定义构建预设（生成器、输出目录等）
- 应纳入版本控制，团队共享

**关键配置：**
- `CMAKE_TOOLCHAIN_FILE`：vcpkg 与 CMake 集成的核心
- 路径：`$env{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake`

### 4. **CMakeUserPresets.json（用户级预设文件 可选）**

```json
{
  "version": 2,
  "configurePresets": [
    {
      "name": "default",
      "inherits": "vcpkg",
      "environment": {
        "VCPKG_ROOT": "<path to vcpkg>"
      }
    }
  ]
}
```

**作用：**
- 设置用户特定的配置（如本地 vcpkg 路径）
- 继承 `CMakePresets.json` 中的预设
- **不应纳入版本控制**（因为包含特定于用户的路径）
- 一般不需要配置，只需要在环境变量中配置好`VCPKG_ROOT`+CMakePresets.json指定`CMAKE_TOOLCHAIN_FILE`即可

### 5. **CMakeLists.txt（CMake 构建脚本）**

```cmake
cmake_minimum_required(VERSION 3.10)

project(HelloWorld)

find_package(fmt CONFIG REQUIRED)

add_executable(HelloWorld helloworld.cpp)

target_link_libraries(HelloWorld PRIVATE fmt::fmt)
```

**各行作用：**
- `cmake_minimum_required(VERSION 3.10)`：指定 CMake 最低版本要求
- `project(HelloWorld)`：设置项目名称
- `find_package(fmt CONFIG REQUIRED)`：查找 fmt 库的 CMake 配置文件
  - `CONFIG`：使用库的 CMake 配置模式
  - `REQUIRED`：未找到时生成错误
- `add_executable(HelloWorld helloworld.cpp)`：创建可执行目标
- `target_link_libraries(HelloWorld PRIVATE fmt::fmt)`：链接 fmt 库
  - `PRIVATE`：依赖仅用于构建，不传播到其他项目

## 四、工作流程

### 1. 初始化项目
```bash
vcpkg new --application           # 创建 vcpkg.json 和 vcpkg-configuration.json
vcpkg add port fmt                # 添加依赖
```

### 2. 配置 CMake
- 创建/修改 `CMakePresets.json`
- 创建 `CMakeUserPresets.json`（设置本地路径）
- 编写 `CMakeLists.txt`

### 3. 构建和运行
```bash
cmake --preset=default            # 配置项目
cmake --build build               # 构建项目
./build/HelloWorld                # 运行程序
```

在 Visual Studio 中：
- 使用 "Build > Build All" 构建
- 使用 "Debug > Start" 运行

## 五、vcpkg 工作原理

### 清单模式（Manifest Mode）
- vcpkg 读取 `vcpkg.json` 自动安装依赖
- 依赖安装到项目本地（而非全局）
- 更适合现代 C++ 项目管理

### CMake 集成
1. vcpkg 提供自定义工具链文件
2. CMake 通过工具链文件找到 vcpkg 安装的库
3. `find_package()` 自动定位库的配置文件
4. 自动配置包含路径和链接库

## 六、最佳实践

1. **版本控制**
   - ✅ 纳入：`vcpkg.json`、`vcpkg-configuration.json`、`CMakePresets.json`
   - ❌ 不纳入：`CMakeUserPresets.json`、`build/` 目录

2. **环境变量**
   - 设置 `VCPKG_ROOT` 环境变量（永久性设置更佳）
   - 添加到 PATH 以便命令行使用

3. **依赖管理**
   - 使用清单模式而非全局安装
   - 定期更新基线以获取安全更新

4. **跨平台开发**
   - vcpkg 支持 Windows、Linux、macOS
   - 使用相同的清单文件在不同平台工作

## 七、常用命令

```bash
vcpkg new --application           # 初始化项目
vcpkg add port <package>          # 添加依赖
vcpkg remove port <package>       # 移除依赖
vcpkg search <keyword>            # 搜索可用包
vcpkg list                        # 列出已安装的包
vcpkg update                      # 更新 vcpkg 本身
```



## 八、使用优化

### linux优化

保存为 `setup_vcpkg_opt.sh`：

```
#!/bin/bash
set -e

# ========== 配置参数 ==========
CACHE_DIR="/root/.vcpkg-cache"
BASHRC="/root/.bashrc"

echo "? 配置 vcpkg 优化环境 (缓存 + Ninja + 并行 + apt)"

# ========== 1. 安装系统依赖（用 apt，避免 vcpkg 重编译基础库） ==========
echo "? 使用 apt 安装构建工具和常见依赖..."
sudo apt update -y
sudo apt install -y \
    build-essential \
    ninja-build \
    cmake \
    pkg-config \
    git \
    curl \
    unzip \
    zip \
    tar \
    libssl-dev \
    libcurl4-openssl-dev \
    zlib1g-dev \
    libsqlite3-dev

# ========== 2. 配置 vcpkg 缓存 ==========
echo "? 配置缓存目录: $CACHE_DIR"
mkdir -p $CACHE_DIR
chmod -R 777 $CACHE_DIR

if ! grep -q "VCPKG_BINARY_SOURCES" $BASHRC; then
    echo "export VCPKG_BINARY_SOURCES=\"clear;files,$CACHE_DIR,readwrite\"" >> $BASHRC
fi

# ========== 3. 启用 Ninja 构建 ==========
if ! grep -q "VCPKG_USE_NINJA" $BASHRC; then
    echo "export VCPKG_USE_NINJA=1" >> $BASHRC
fi

# ========== 4. 启用并行编译 ==========
if ! grep -q "VCPKG_MAX_CONCURRENCY" $BASHRC; then
    echo "export VCPKG_MAX_CONCURRENCY=\$(nproc)" >> $BASHRC
fi

# ========== 5. 立即生效 ==========
export VCPKG_BINARY_SOURCES="clear;files,$CACHE_DIR,readwrite"
export VCPKG_USE_NINJA=1
export VCPKG_MAX_CONCURRENCY=$(nproc)

# ========== 6. 提示结果 ==========
echo "✅ 已配置 vcpkg 缓存: $CACHE_DIR"
echo "✅ Ninja 已通过 apt 安装并启用"
echo "✅ VCPKG_MAX_CONCURRENCY=$(nproc) (CPU核心数)"
echo "? 所有配置已写入 $BASHRC，下次登录自动生效"
```

```
source ~/.bashrc
```

![image-20251010154330419](https://images.228610.xyz/2025/10/cc0c80555581deccb1935d801d0dfc81.png)

```
export PATH=$VCPKG_ROOT:$PATH
export VCPKG_USE_NINJA=1
export VCPKG_MAX_CONCURRENCY=$(nproc)
export VCPKG_BINARY_SOURCES="clear;files,/root/.vcpkg-cache,readwrite"
export CMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake
```
添加`CMAKE_PREFIX_PATH`

```
mkdir -p ~/.config/cmake
nano ~/.config/cmake/init.cmake
```



### windows优化

1. 在环境变量中添加path
2. 添加`VCPKG_BINARY_SOURCES`，内容为 `clear;files,C:\Users\Jianzhe\tools\vcpkg\.vcpkg-cache,readwrite`
3. 添加`VCPKG_MAX_CONCURRENCY`，内容为`核心数量，如16`
4. 添加`VCPKG_USE_NINJA`，内容为 `1`
