title: windows搭建CMake+Qt环境
date: 2025-02-23 16:44:00
categories: Qt
tags: [cmake,Qt]
---
### 一、安装Qt：

1. 官网链接：https://download.qt.io/archive/online_installers/
2. 使用镜像：`.\qt-unified-windows-x64-4.6.1-online --mirror https://mirrors.ustc.edu.cn/qtproject`

注意，windows下建议使用MSVC编译套件，因为发现有些库只能MSVC才能使用，如QtWebEngine

![image-20250419201547803](https://images.228610.xyz/2025/04/8f6bc69708ec86179fa5c303a15c770e.webp)

### 二、配置环境

以Qt 5.15.2为例，其他同理

#### 1.添加环境变量

- D:\Qt\5.15.2\mingw81_64\bin
- D:\Qt\5.15.2\mingw81_64\lib

将以上路径添加到环境变量中，防止找不到库文件

也可以添加下面两个，方便vscode找到编译套件

- D:\Qt\Tools\mingw810_64\bin
- D:\Qt\Tools\mingw810_64\lib

#### 2.添加编译套件

##### 1、clion配置

![PixPin_2025-02-23_14-23-51](https://images.228610.xyz/2025/02/6761cf5120f80e68107683f01a2c4ca2.webp)

##### 2、vscode配置

![PixPin_2025-02-27_20-37-34](https://images.228610.xyz/2025/02/dbe92310731bedd5e56b84f9e778d408.webp)

##### 3、vs2022配置

以Qt 6.5.3为例，其他同理

安装插件：**Qt VS Tools**

配置插件：添加编译套件

![image-20250419201103520](https://images.228610.xyz/2025/04/7eef66d5815303b35c9cc61fd9e4c8c8.webp)

### 三、添加外部工具和插件

#### 1、clion添加外部工具

![PixPin_2025-02-27_20-40-48](https://images.228610.xyz/2025/02/40e86daf3677bc7ec21141ad65e908af.webp)

- **qt-designer**：
    - Program: `D:\Qt\5.15.2\mingw81_64\bin\designer.exe`
    - Arguments:`$FileName$`
    - Working directory:`$ProjectFileDir$`
    - 点击高级选项，勾选：`Synchronize files after execution`和`Open console for tool output`
- **qt-uic**
    - Program: `D:\Qt\5.15.2\mingw81_64\bin\uic.exe`
    - Arguments:`$FileName$ -o ui_$FileNameWithoutExtension$.h`
    - Working directory:`$FileDir$`
    - 高级选项同上
- **qt-Assistant**
    - Program: `D:\Qt\5.15.2\mingw81_64\bin\assistant.exe`
    - Arguments:`不填`
    - Working directory:`D:\Qt\5.15.2\mingw81_64\bin`
    - 高级选项：不做勾选

#### 2、vscode安装插件

- `Qt tools` 作者：tonka3000，右键`ui`文件可选择打开`qt-designer`

#### 3、vs2022添加外部工具

右键点击ui文件，选择**Open with…**,然后点击add添加designer外部工具，**argument不用填，选择designer路径添加即可**，然后**点击Set as Default**设置为默认打开方式，以后双击ui文件就能使用Qt Designer打开了

![image-20250420211911113](https://images.228610.xyz/2025/04/fa3ff287e8fb6723c75f49b2a623e512.webp)

### 四、cmake使用

#### 1.项目结构

```bash
qt-game-example/
├── bin/                     # 构建输出目录（可执行文件）
├── CMakeLists.txt           # 顶层CMake配置文件
├── main.cpp                 # 程序入口文件
├── resources/               # 资源文件目录
│   ├── res.qrc              # Qt资源文件（包含图片、音乐等）
│   ├── images/              # 图片资源
│   │   └── example.png
│   └── music/               # 音乐资源
│       └── background.mp3
├── core/                    # 核心逻辑模块
│   ├── include/             # 头文件
│   │   ├── CoreLogic.h
│   │   └── DataManager.h
│   ├── CoreLogic.cpp
│   ├── DataManager.cpp
│   └── CMakeLists.txt       # core模块的CMake配置文件
├── ui/                      # 用户界面模块
│   ├── include/             # 头文件
│   │   ├── MainWindow.h
│   │   └── WidgetUtils.h
│   ├── forms/               # Qt UI文件
│   │   └── mainwindow.ui    # Qt Designer生成的UI文件
│   ├── MainWindow.cpp
│   ├── WidgetUtils.cpp
│   └── CMakeLists.txt       # ui模块的CMake配置文件
├── CMakeCache.txt           # CMake缓存（由构建生成）
└── cmake-build-debug/       # 构建目录（由CMake生成）
```

#### 2.示例CMakeLists.txt文件

以下是基于上述结构生成的CMakeLists.txt文件，包含顶层和子模块的配置。

##### **1. 顶层** CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.28)
project(qt-game-example)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_AUTOMOC ON)    # 自动处理Qt元对象（Q_OBJECT等）
set(CMAKE_AUTORCC ON)    # 自动处理Qt资源文件
set(CMAKE_AUTOUIC ON)    # 自动处理Qt UI文件
set(CMAKE_PREFIX_PATH "D:/Qt/5.15.2/mingw81_64")  # Qt安装路径（根据你的环境调整）
set(QRC_SOURCE_FILES ${PROJECT_SOURCE_DIR}/resources/res.qrc)#添加资源文件

#如果 .ui 文件不在源文件目录中，CMake 无法找到它们，就会报错或忽略，CMAKE_AUTOUIC_SEARCH_PATHS 是一个列表变量，
#指定额外的目录路径，告诉 CMake 在这些目录中搜索 .ui 文件，它解决了 .ui 文件与源文件不在同一目录时的查找问题。
set(CMAKE_AUTOUIC_SEARCH_PATHS ${PROJECT_SOURCE_DIR}/ui/forms)

set(EXECUTABLE_OUTPUT_PATH ${PROJECT_SOURCE_DIR}/bin)  # 可执行文件输出目录

# 查找Qt组件
find_package(Qt5 COMPONENTS
    Core
    Gui
    Widgets
    REQUIRED
)

include_directories(
        ${PROJECT_SOURCE_DIR}/core/include
        ${PROJECT_SOURCE_DIR}/ui/include
)


# 添加子目录
add_subdirectory(core)
add_subdirectory(ui)

# 添加可执行文件
add_executable(${PROJECT_NAME} main.cpp ${QRC_SOURCE_FILES})

# 链接库
target_link_libraries(${PROJECT_NAME}
    PRIVATE
    core
    ui
    Qt5::Core
    Qt5::Gui
    Qt5::Widgets
)
```

**2.** core/CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.28)
project(core)

#收集头文件
file(GLOB HEADER_SOURCE_FILES ${CMAKE_CURRENT_SOURCE_DIR}/include/*.h)
# 收集源文件
aux_source_directory(${CMAKE_CURRENT_SOURCE_DIR} SRC_LIST)

# 创建库
add_library(${PROJECT_NAME} ${SRC_LIST} ${HEADER_SOURCE_FILES})

# 链接Qt核心库
target_link_libraries(${PROJECT_NAME} PRIVATE Qt5::Core)
```



##### **3.** ui/CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.28)
project(ui)

# 收集UI文件
file(GLOB UI_SOURCE_FILES ${CMAKE_CURRENT_SOURCE_DIR}/forms/*.ui)
# 收集头文件
file(GLOB HEADER_SOURCE_FILES ${CMAKE_CURRENT_SOURCE_DIR}/include/*.h)
# 收集源文件
aux_source_directory(${CMAKE_CURRENT_SOURCE_DIR} SRC_LIST)

# 创建库
add_library(${PROJECT_NAME} ${SRC_LIST} ${UI_SOURCE_FILES} ${HEADER_SOURCE_FILES})

# 链接Qt库
target_link_libraries(${PROJECT_NAME} PRIVATE Qt5::Core Qt5::Widgets)
```

### 五、vs2022额外注意

vs2022在创建带UI的类时，UI文件编译后的类命名可能与其他软件命名的不太一样，如下面的UI类名为`TestClass`

```cpp
#pragma once

#include <QMainWindow>
#include "ui_Test.h"

class Test : public QMainWindow
{
	Q_OBJECT

public:
	Test(QWidget *parent = nullptr);
	~Test();

private:
	Ui::TestClass ui;
};
```

如这里，UI文件的类名在后面添加了`Class`，而且，成员函数的声明方式也不同，这里**没有使用指针声明类成员**，跟其他软件的不一样，如`Qt Creator`,可以看到，UI类名字与类名相同都是`Test`，类成员声明方式是指针，如果没有注意，迁移项目到vs2022可能会导致一些错误。

```cpp
#ifndef TEST_H
#define TEST_H

#include <QDialog>

namespace Ui
{
class Test;
}

class Test : public QDialog
{
    Q_OBJECT

public:
    explicit Test(QWidget* parent = nullptr);
    ~Test();

private:
    Ui::Test* ui;
};

#endif // TEST_H

```

在默认创建的CMakeLists.txt文件也有一些区别，vs2022没有直接添加下面配置

```cmake
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)
```

而是通过一个qt.cmake文件引入

```cpp
#CMakeLists.txt内部调用qt.cmake中的配置
qt_standard_project_setup()

#qt.cmake
if(QT_VERSION VERSION_LESS 6.3)
    macro(qt_standard_project_setup)
        set(CMAKE_AUTOMOC ON)
        set(CMAKE_AUTOUIC ON)
    endmacro()
endif()

if(QT_VERSION VERSION_LESS 6.0)
    macro(qt_add_executable name)
         if(ANDROID)
            add_library(name SHARED ${ARGN})
        else()
            add_executable(${ARGV})
        endif()
    endmacro()
endif()

```

生成的二进制文件命令也不是`add_executable`，而是`qt_add_executable`

```cmake
qt_add_executable(${PROJECT_NAME} ${PROJECT_SOURCES})
```



#### MSBuild构建项目时添加Qt其他模块

**项目属性>Qt Project Settings>Qt Modules>Select Mudules**

![image-20250419212814240](https://images.228610.xyz/2025/04/5cd7e10137df941665a211fef20a6d7b.webp)

勾选需要的模块，然后点击OK,确定退出项目属性编辑，这样就能添加Qt的其他模块了

![image-20250419212848376](https://images.228610.xyz/2025/04/56b1d3d1c55a1691c4481854707682f7.webp)
