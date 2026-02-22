title: opengl基本概念与使用
date: 2025-04-20 07:42:00
categories: 搞七捻三
tags: [opengl]
---
### 1、VBO

Vertex Buffer Object (VBO) 是 OpenGL 中用于存储顶点数据的缓冲区对象，是一块驻留在 GPU 高速内存中的数据块。

#### **1.1、内存管理角度**

1. VBO 本质上是 GPU 内存上的一段线性空间
2. 通过 **glGenBuffers** 创建并获取唯一标识符
3. 通过 **glBindBuffer** 激活特定 VBO
4. 通过 **glBufferData** 将数据从 CPU 传输到 GPU

#### **1.2、数据传输流程**

```cpp
// 1. 生成缓冲区对象
glGenBuffers(1, &VBO);

// 2. 绑定到特定目标点
glBindBuffer(GL_ARRAY_BUFFER, VBO);

// 3. 分配内存并传输数据
glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
```

#### **1.3、数据布局**

1. VBO 中的数据是原始字节序列
2. 需要通过 glVertexAttribPointer 告诉 GPU 如何解释这些字节

```cpp
// 配置顶点属性（位置属性）
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
glEnableVertexAttribArray(0);
```

#### 1.4、优化策略

1. **GL_STATIC_DRAW**：数据几乎不会改变
2. **GL_DYNAMIC_DRAW**：数据经常改变
3. **GL_STREAM_DRAW**：每次绘制都会改变



### 2、VAO

Vertex Array Object (VAO) 是一个状态容器，它保存了一组顶点数据配置的完整状态。

#### 2.1、状态封装

1. VAO 不存储实际顶点数据
2. 它记录了与顶点处理相关的所有状态设置
3. 包括顶点属性配置、VBO 绑定和 EBO 绑定

#### 2.2、工作流程

```cpp
// 1. 创建VAO
glGenVertexArrays(1, &VAO);
glGenBuffers(1, &VBO);
glGenBuffers(1, &EBO);
// 2. 绑定VAO开始记录状态
glBindVertexArray(VAO);

// 3. 设置相关状态（所有这些都会被VAO记录）
glBindBuffer(GL_ARRAY_BUFFER, VBO);
glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices,
             GL_STATIC_DRAW);

glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
glEnableVertexAttribArray(0);

// 4. 当完成所有设置后，解绑VAO
glBindVertexArray(0);

// 5. 渲染时只需重新绑定VAO
glBindVertexArray(VAO);
glDrawArrays(...);  // 或 glDrawElements(...)
```



#### 2.3、状态恢复

**调用 glBindVertexArray(vao) 时：**

1. 所有启用/禁用的顶点属性 (glEnableVertexAttribArray/glDisableVertexAttribArray)
2. 所有顶点属性指针配置  (glVertexAttribPointer)
3. 当前绑定的 ARRAY_BUFFER (VBO绑定)
4. 当前绑定的 ELEMENT_ARRAY_BUFFER (EBO绑定)

**具体到代码**

在 paintGL() 中调用 glBindVertexArray(VAO) 时：

1. OpenGL 将 VAO 设置为当前活动的顶点数组对象
2. 恢复 VAO 记录的所有状态，包括：
    1. 启用顶点属性 0（通过之前的 glEnableVertexAttribArray(0) 设置）
    2. 恢复顶点属性指针配置（通过之前的 glVertexAttribPointer 设置）
    3. 恢复 EBO 绑定（自动绑定 EBO，这就是为什么不需要在 paintGL() 中重新绑定 EBO）
3. 这样，一行代码 glBindVertexArray(VAO) 就等效于以下多行代码：

```cpp
// 以下全部操作被 glBindVertexArray(VAO) 一行代码替代
glBindBuffer(GL_ARRAY_BUFFER, VBO);
glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
glEnableVertexAttribArray(0);
```



### 3、EBO

EBO（也称为 Index Buffer Object，IBO）是 OpenGL 中用于存储顶点索引的缓冲区对象。它的主要目的是优化渲染性能，通过重用顶点数据来减少内存使用和数据传输。



#### 3.1、EBO 工作原理

**1、索引渲染的基本概念：**

没有索引的情况下，如果绘制一个正方形，需要定义 6 个顶点（两个三角形），而**很多顶点会重复**。使用索引时，只需要 4 个顶点加上 6 个索引值。

**2、 EBO 工作流程：**

```cpp
// 定义顶点数据（存储在VBO中）
constexpr float vertices[] = {
    0.5f, 0.5f, 0.0f,   // 右上角 (0)
    0.5f, -0.5f, 0.0f,  // 右下角 (1)
    -0.5f, -0.5f, 0.0f, // 左下角 (2)
    -0.5f, 0.5f, 0.0f   // 左上角 (3)
};

// 定义索引数据（存储在EBO中） - 指明如何连接这些顶点
const unsigned int indices[] = {
    0, 1, // 右上到右下,使用顶点0和1绘制第一条边
    1, 2, // 右下到左下,使用顶点1和2绘制第一条边
    2, 3, // 左下到左上,使用顶点2和3绘制第一条边
    3, 0  // 左上到右上,使用顶点3和0绘制第一条边
};
```

**3.EBO 的生成和绑定：**

```cpp
// 生成 EBO
glGenBuffers(1, &EBO);

// 绑定 EBO
glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);

// 将索引数据传输到 EBO 中
glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);
```

**4、使用 EBO 进行渲染：**

```cpp
glDrawElements(GL_LINES, 8, GL_UNSIGNED_INT, NULL);
```

- GL_LINES: 绘制模式，表示绘制线段
- 8: 索引数量，因为要画 4 条线（正方形的边），每条线需要 2 个索引
- GL_UNSIGNED_INT: 索引数据的类型
- NULL: 索引数组的起始位置偏移量，NULL 表示从头开始
- **在渲染时使用 glDrawElements 而不是 glDrawArrays，这样 GPU 会按照索引数组中指定的顺序读取顶点并渲染**



#### 3.2、EBO与VBO的关系

- **数据传输流程**

```cpp
// 定义顶点数据（存储在VBO中）
constexpr float vertices[] = {
    0.5f, 0.5f, 0.0f,   // 右上角 (0)
    0.5f, -0.5f, 0.0f,  // 右下角 (1)
    -0.5f, -0.5f, 0.0f, // 左下角 (2)
    -0.5f, 0.5f, 0.0f   // 左上角 (3)
};

// 定义索引数据（存储在EBO中） - 指明如何连接这些顶点
const unsigned int indices[] = {
    0, 1, // 右上到右下,使用顶点0和1绘制第一条边
    1, 2, // 右下到左下,使用顶点1和2绘制第一条边
    2, 3, // 左下到左上,使用顶点2和3绘制第一条边
    3, 0  // 左上到右上,使用顶点3和0绘制第一条边
};

// 向GPU传输顶点数据
glBindBuffer(GL_ARRAY_BUFFER, VBO);
glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

// 向GPU传输索引数据
glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);
```

**VBO和EBO都是存储在GPU内存中的缓冲区对象**，当绘制调用发生时，GPU直接从这些缓冲区读取数据，无需从CPU内存传输

- **渲染流程：**

```cpp
// 使用索引绘制
glDrawElements(GL_LINES, 8, GL_UNSIGNED_INT, NULL);
```

 **glDrawElements 的工作方式：**

1. 查找当前绑定的 EBO 中的索引
2. 根据索引在当前绑定的 VBO 中获取对应的顶点数据，比如索引值"0"指向VBO中的第一个顶点(0.5f, 0.5f, 0.0f)
3. 使用这些顶点数据进行渲染



`EBO和VBO的关系就像"指挥"和"演员"，EBO告诉GPU应该按什么顺序使用VBO中的哪些顶点来绘制图形。EBO 依赖于 VBO，单独的 EBO 没有意义，EBO 中的索引值引用的是 VBO 中的顶点位置`

1. `不使用EBO时：glDrawArrays()（按顺序使用VBO中的顶点）`
2. `使用EBO时：glDrawElements()（按EBO中的索引顺序使用VBO中的顶点）`



#### 3.3、EBO 与 VAO 的关系

VAO (Vertex Array Object) 在EBO和VBO的关系中扮演"**记录员**"角色，**当 VAO 被绑定时，随后绑定的 EBO 会被"记住"。**

```cpp
// 绑定VAO开始记录
glBindVertexArray(VAO);

// VBO和属性配置被VAO记录
glBindBuffer(GL_ARRAY_BUFFER, VBO);
glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
glEnableVertexAttribArray(0);

// EBO绑定被VAO特殊记录
glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);

// 完成记录，解除VAO绑定,在使用时重新绑定即可
glBindVertexArray(0);
```

关键点：
1.	VAO会记住VBO绑定和顶点属性配置
2.	VAO会特殊记住EBO的绑定状态（这是VBO和EBO的一个重要区别）
3.	渲染时只需调用 **glBindVertexArray(VAO)**绑定VAO，不需要再次绑定VBO和EBO

### 4、着色器

#### 4.1、顶点着色器

顶点着色器是渲染管线的第一个可编程阶段，负责处理每一个顶点。

##### 4.1.1、工作原理

输入：

1. 原始顶点数据（从 VBO 中获取）
2. 顶点属性（位置、颜色、法线、纹理坐标等）
3. 变换矩阵（模型、视图、投影等）

处理流程：

1. 对每个顶点分别执行一次
2. 至少需要计算顶点的裁剪空间坐标（gl_Position）
3. 可以计算并传递其他数据给后续阶段

输出：

1. 必须：裁剪空间中的位置（gl_Position）
2. 可选：传递给片段着色器的数据（颜色、纹理坐标等）

具体到代码：

```cpp
#version 330 core
layout (location = 0) in vec3 aPos;
void main() {
   gl_Position = vec4(aPos.x, aPos.y, aPos.z, 1.0);
}
```

1. version 330 core：指定 GLSL 版本 3.3，使用核心模式
2. layout (location = 0) in vec3 aPos：声明一个输入顶点属性，位于位置 0，类型为 vec3
3. gl_Position = vec4(aPos.x, aPos.y, aPos.z, 1.0)：设置顶点的裁剪空间坐标

这个顶点着色器非常简单，仅将输入顶点位置直接传递到裁剪空间，没有应用任何变换（如模型视图投影变换）



#### 4.2、片段着色器

片段着色器是渲染管线的最后一个可编程阶段，负责计算每个片段（可理解为潜在的像素）的最终颜色。

##### 4.2.1、工作原理

输入：

1. 光栅化阶段生成的片段
2. 由顶点着色器传递的插值数据
3. 纹理、uniform 变量等

处理流程：

1. 对每个片段分别执行一次
2. 计算片段的最终颜色
3. 可以进行纹理采样、光照计算、特效处理等

输出：

1. 片段的颜色值（通常写入到帧缓冲区）
2. 可选：深度值、模板值等

具体到代码

```cpp
#version 330 core
out vec4 FragColor;
void main() {
   FragColor = vec4(0.0, 0.7, 1.0, 0.8); // 淡蓝色
}
```

1. version 330 core：指定 GLSL 版本 3.3，使用核心模式
2. out vec4 FragColor：声明一个输出变量，类型为 vec4，表示片段的颜色
3. FragColor = vec4(0.0, 0.7, 1.0, 0.8)：设置片段的颜色为淡蓝色，带有 80% 的不透明度

这个片段着色器非常简单，它为所有片段分配相同的淡蓝色。

#### 4.3、着色器创建

```cpp
// ---- 2. 创建着色器程序 ----
// 编译顶点着色器
const GLuint vertexShader = glCreateShader(GL_VERTEX_SHADER);
glShaderSource(vertexShader, 1, &vertexShaderSource, NULL);
glCompileShader(vertexShader);

// 检查顶点着色器编译错误
GLint success;
glGetShaderiv(vertexShader, GL_COMPILE_STATUS, &success);
if (!success)
{
    char infoLog[512];
    glGetShaderInfoLog(vertexShader, 512, NULL, infoLog);
    qDebug() << "顶点着色器编译失败：" << infoLog;
}

// 编译片段着色器
const GLuint fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
glShaderSource(fragmentShader, 1, &fragmentShaderSource, NULL);
glCompileShader(fragmentShader);

// 检查片段着色器编译错误
glGetShaderiv(fragmentShader, GL_COMPILE_STATUS, &success);
if (!success)
{
    char infoLog[512];
    glGetShaderInfoLog(fragmentShader, 512, NULL, infoLog);
    qDebug() << "片段着色器编译失败：" << infoLog;
}

// 链接着色器程序
shaderProgram = glCreateProgram();
glAttachShader(shaderProgram, vertexShader);
glAttachShader(shaderProgram, fragmentShader);
glLinkProgram(shaderProgram);

// 检查链接错误
glGetProgramiv(shaderProgram, GL_LINK_STATUS, &success);
if (!success)
{
    char infoLog[512];
    glGetProgramInfoLog(shaderProgram, 512, NULL, infoLog);
    qDebug() << "着色器程序链接失败：" << infoLog;
}

// 删除临时着色器对象
glDeleteShader(vertexShader);
glDeleteShader(fragmentShader);
```



#### 4.4、着色器与VBO关系

```cpp
glGenBuffers(1, &VBO);
glBindBuffer(GL_ARRAY_BUFFER, VBO);
glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
```

此时数据已在 GPU 内存中，但着色器仍然不知道如何解释这些数据。

**顶点属性配置 - 关键连接点**

```cpp
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
glEnableVertexAttribArray(0);
```

1. **0**：指定我们配置的是位置为 0 的顶点属性，对应着色器中的 layout (location = 0) in vec3 aPos
2. **3**：每个顶点属性由 3 个值组成（x, y, z 坐标），对应 vec3 类型
3. **GL_FLOAT**：数据类型为浮点数
4. **GL_FALSE**：不进行标准化
5. **3 * sizeof(float)**：步长，下一个顶点的相同属性相隔多少字节
6. **(void*)0**：该属性在每个顶点数据中的偏移量

这个调用的含义是：`"告诉 GPU，将 VBO 中每隔 12 个字节（3个float）的 3 个浮点数解释为位置属性，并连接到着色器的 location 0 输入"。`



#### 4.5、着色器使用VBO 

发出绘制命令，触发顶点着色器和片段着色器的执行：

```cpp
glUseProgram(shaderProgram);  // 激活着色器程序
glBindVertexArray(VAO);       // 恢复所有顶点属性配置
glDrawElements(GL_LINES, 8, GL_UNSIGNED_INT, NULL);
```

当顶点着色器执行时：
1.	GPU 硬件从当前 VBO 读取一组顶点数据
2.	根据 **glVertexAttribPointer** 的配置，确定哪些字节对应哪个属性
3.	将这些字节转换为着色器中声明的相应类型（如 vec3）
4.	将转换后的值赋给着色器中的对应输入变量（如 aPos）
5.	顶点着色器代码运行，使用这些输入变量

#### 4.6、多个顶点属性的情况

如果顶点有多个属性，流程会更复杂：

```cpp
// 顶点数据包含位置和颜色
float vertices[] = {
    // 位置             // 颜色
    0.5f,  0.5f, 0.0f,  1.0f, 0.0f, 0.0f,  // 右上，红色
    0.5f, -0.5f, 0.0f,  0.0f, 1.0f, 0.0f,  // 右下，绿色
    // ...更多顶点
};

// 顶点着色器
const char* vertexShaderSource = "#version 330 core\n"
    "layout (location = 0) in vec3 aPos;\n"
    "layout (location = 1) in vec3 aColor;\n"
    "out vec3 vertexColor;\n"
    "void main() {\n"
    "   gl_Position = vec4(aPos, 1.0);\n"
    "   vertexColor = aColor;\n"
    "}\0";

// 配置两个顶点属性
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)0);
glEnableVertexAttribArray(0);
glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)(3 * sizeof(float)));
glEnableVertexAttribArray(1);
```

1. 第一个 glVertexAttribPointer 告诉 OpenGL 如何解析位置数据：步长为 6 个浮点数，偏移量为 0
2. 第二个 glVertexAttribPointer 告诉 OpenGL 如何解析颜色数据：步长为 6 个浮点数，偏移量为 3 个浮点数
3. VAO 会记录这两个属性的配置

#### 4.7、大致流程

`CPU上的顶点数据 → VBO → 顶点属性配置 → VAO记录 → 着色器接收 → 渲染输出`

关键点：
1.	glBufferData：CPU数据 → GPU内存
2.	glVertexAttribPointer：原始字节 → 有意义的顶点属性
3.	glEnableVertexAttribArray：启用该属性以便着色器访问
4.	layout (location = X) in TYPE name：在着色器中声明输入变量
5.	glBindVertexArray：一次性恢复所有状态配置
6.	glUseProgram：指定使用哪个着色器程序

### 5、示例

使用到的组件：**core;gui;widgets;opengl;openglwidgets;**

- main.cpp

```cpp
#include "OpenGLTest.h"
#include <QApplication>
#include <QPushButton>
#include <QVBoxLayout>
#include <QWidget>

int main(int argc, char *argv[]) {
  QApplication a(argc, argv);

  // 创建主窗口
  QWidget mainWindow;
  QVBoxLayout *layout = new QVBoxLayout(&mainWindow);

  // 创建 OpenGLTest 实例
  OpenGLTest *glWidget = new OpenGLTest(&mainWindow);
  layout->addWidget(glWidget);

  // 创建按钮
  QPushButton *triangleButton = new QPushButton("绘制三角形", &mainWindow);
  QPushButton *quadsButton = new QPushButton("绘制四边形", &mainWindow);

  // 设置按钮点击事件
  QObject::connect(triangleButton, &QPushButton::clicked, glWidget,
                   &OpenGLTest::onDrawTriangleClicked);
  QObject::connect(quadsButton, &QPushButton::clicked, glWidget,
                   &OpenGLTest::onDrawQuadsClicked);

  // 添加按钮到布局
  layout->addWidget(triangleButton);
  layout->addWidget(quadsButton);

  // 显示主窗口
  mainWindow.setWindowTitle("OpenGL 测试");
  mainWindow.resize(800, 600);
  mainWindow.show();

  return QApplication::exec();
}
```

- OpenGLTest.h

```cpp
#pragma once

#include "ui_OpenGLTest.h"
#include <QOpenGLWidget>
#include <QOpenGLFunctions_3_3_Core>

class OpenGLTest : public QOpenGLWidget, protected QOpenGLFunctions_3_3_Core
{
    Q_OBJECT

public:
    explicit OpenGLTest(QWidget* parent = nullptr);
    ~OpenGLTest() override;

    //绘制三角形
    void drawTriangle();
    //绘制四边形
    void drawQuads();

public slots:
    void onDrawTriangleClicked();
    void onDrawQuadsClicked();

protected:
    void initializeGL() override; // 初始化OpenGL
    void resizeGL(int w, int h) override; // 窗口大小变化
    void paintGL() override; // 绘制

  private:
    //初始化VBO,VAO,EBO
    void initBufferObject();
    // 初始化着色器
    void initShader();

private:
    GLuint m_VAO, m_VBO, m_EBO; // OpenGL对象ID
    GLuint m_shaderProgram; // 着色器程序
    QVector<float> m_vertices = {}; //VBO顶点数据
    QVector<unsigned int> m_indices = {}; //EBO索引数据

private:
    Ui::OpenGLTestClass ui;
};

```

- OpenGLTest.cpp

```cpp
#include "OpenGLTest.h"
#include <QDebug>

// 顶点着色器源码
auto vertexShaderSource =
    "#version 330 core\n"
    "layout (location = 0) in vec3 aPos;\n"
    "void main() {\n"
    "   gl_Position = vec4(aPos.x, aPos.y, aPos.z, 1.0);\n"
    "}\0";

// 片段着色器源码
auto fragmentShaderSource =
    "#version 330 core\n"
    "out vec4 FragColor;\n"
    "void main() {\n"
    "   FragColor = vec4(0.0, 0.7, 1.0, 0.8);\n" // 淡蓝色
    "}\0";

// 构造函数
OpenGLTest::OpenGLTest(QWidget* parent) : QOpenGLWidget(parent)
{
}

// 析构函数：释放OpenGL对象
OpenGLTest::~OpenGLTest()
{
    // 释放所有OpenGL资源
    glDeleteVertexArrays(1, &m_VAO);
    glDeleteBuffers(1, &m_VBO);
    glDeleteBuffers(1, &m_EBO);
    glDeleteProgram(m_shaderProgram);
}

void OpenGLTest::initShader()
{
    // 编译顶点着色器
    const GLuint vertexShader = glCreateShader(GL_VERTEX_SHADER);
    glShaderSource(vertexShader, 1, &vertexShaderSource, NULL);
    glCompileShader(vertexShader);

    // 检查顶点着色器编译错误
    GLint success;
    glGetShaderiv(vertexShader, GL_COMPILE_STATUS, &success);
    if (!success)
    {
        char infoLog[512];
        glGetShaderInfoLog(vertexShader, 512, NULL, infoLog);
        qDebug() << "顶点着色器编译失败：" << infoLog;
    }

    // 编译片段着色器
    const GLuint fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
    glShaderSource(fragmentShader, 1, &fragmentShaderSource, NULL);
    glCompileShader(fragmentShader);

    // 检查片段着色器编译错误
    glGetShaderiv(fragmentShader, GL_COMPILE_STATUS, &success);
    if (!success)
    {
        char infoLog[512];
        glGetShaderInfoLog(fragmentShader, 512, NULL, infoLog);
        qDebug() << "片段着色器编译失败：" << infoLog;
    }

    // 链接着色器程序
    m_shaderProgram = glCreateProgram();
    glAttachShader(m_shaderProgram, vertexShader);
    glAttachShader(m_shaderProgram, fragmentShader);
    glLinkProgram(m_shaderProgram);

    // 检查链接错误
    glGetProgramiv(m_shaderProgram, GL_LINK_STATUS, &success);
    if (!success)
    {
        char infoLog[512];
        glGetProgramInfoLog(m_shaderProgram, 512, NULL, infoLog);
        qDebug() << "着色器程序链接失败：" << infoLog;
    }

    // 删除临时着色器对象
    if (success)
    {
        glDeleteShader(vertexShader);
        glDeleteShader(fragmentShader);
    }
}

void OpenGLTest::initBufferObject()
{
    glGenVertexArrays(1, &m_VAO);
    glGenBuffers(1, &m_VBO);
    glGenBuffers(1, &m_EBO);
    // 初始绑定VAO
    glBindVertexArray(m_VAO);
    glBindBuffer(GL_ARRAY_BUFFER, m_VBO);
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, m_EBO);

    // 设置顶点属性 (即使没有数据，也要配置布局)
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
    glEnableVertexAttribArray(0);

    // 解绑
    glBindVertexArray(0);
}

void OpenGLTest::initializeGL()
{
    // 初始化OpenGL函数
    initializeOpenGLFunctions();
    //初始化着色器对象
    initShader();
    //初始化对象
    initBufferObject();
    // 设置清屏颜色
    glClearColor(0.1f, 0.1f, 0.1f, 1.0f);
}

void OpenGLTest::resizeGL(const int w, const int h)
{
    glViewport(0, 0, w, h); // 设置视口大小
}

void OpenGLTest::paintGL()
{
    glClear(GL_COLOR_BUFFER_BIT);
    glUseProgram(m_shaderProgram);
    glBindVertexArray(m_VAO);
    glLineWidth(2.0f); // 设置线宽
    glDrawElements(GL_LINES, m_indices.size(), GL_UNSIGNED_INT, NULL);
}

void OpenGLTest::drawTriangle()
{
    // 三角形顶点数据
    m_vertices = {
        0.0f, 0.5f, 0.0f, // 顶点
        -0.5f, -0.5f, 0.0f, // 左下
        0.5f, -0.5f, 0.0f // 右下
    };


    // 三角形索引
    m_indices = {
        0, 1,
        1, 2,
        2, 0
    };

    // 更新缓冲区数据
    glBindVertexArray(m_VAO);

    // 更新顶点数据
    glBindBuffer(GL_ARRAY_BUFFER, m_VBO);
    glBufferData(GL_ARRAY_BUFFER, m_vertices.size() * sizeof(float),
                 m_vertices.constData(), GL_STATIC_DRAW);

    // 更新索引数据
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, m_EBO);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER,
                 m_indices.size() * sizeof(unsigned int), m_indices.constData(),
                 GL_STATIC_DRAW);

    // 解绑VAO
    glBindVertexArray(0);
    // 完成绘制后刷新
    update();
}

void OpenGLTest::drawQuads()
{
    // 四边形顶点数据
    m_vertices = {
        0.5f, 0.5f, 0.0f, // 右上
        0.5f, -0.5f, 0.0f, // 右下
        -0.5f, -0.5f, 0.0f, // 左下
        -0.5f, 0.5f, 0.0f // 左上
    };

    // 四边形索引（使用两个三角形组成）
    m_indices = {
        0, 1, // 右上到右下
        1, 2, // 右下到左下
        2, 3, // 左下到左上
        3, 0 // 左上到右上
    };

    // 更新缓冲区数据
    glBindVertexArray(m_VAO);

    // 更新顶点数据
    glBindBuffer(GL_ARRAY_BUFFER, m_VBO);
    glBufferData(GL_ARRAY_BUFFER, m_vertices.size() * sizeof(float),
                 m_vertices.constData(), GL_STATIC_DRAW);

    // 更新索引数据
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, m_EBO);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER,
                 m_indices.size() * sizeof(unsigned int), m_indices.constData(),
                 GL_STATIC_DRAW);

    // 解绑VAO
    glBindVertexArray(0);

    // 完成绘制后刷新
    update();
}

void OpenGLTest::onDrawTriangleClicked()
{
    drawTriangle();
}

void OpenGLTest::onDrawQuadsClicked()
{
    drawQuads();
}

```

### 6、存在的问题

在上述示例用，如果将initBufferObject修改为如下写法就无法绘制图片

```cpp
void OpenGLTest::initBufferObject()
{
    glGenVertexArrays(1, &m_VAO);
    glGenBuffers(1, &m_VBO);
    glGenBuffers(1, &m_EBO);

    // 初始绑定VAO
    //glBindVertexArray(m_VAO);
    //glBindBuffer(GL_ARRAY_BUFFER, m_VBO);
    //glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, m_EBO);
    
    //// 设置顶点属性 (即使没有数据，也要配置布局)
    //glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
    //glEnableVertexAttribArray(0);
    
    //// 解绑
    //glBindVertexArray(0);
}
```

一直不明白为什么，在drawTriangle和drawQuads函数中有注释部分的代码，但为什么无法绘制图片呢？为什么需要在初始化时就需要完成全部绑定？移到后面再绑定为什么不行？

当然，如果改为上述代码，drawTriangle和drawQuads函数需要加上如下代码

```cpp
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
glEnableVertexAttribArray(0);
```



### 7、解决方案

-----

发现觉得方案了！！！

原因是：在 Qt 中，如果不在标准的 `initializeGL()`, `paintGL()`, 或 `resizeGL()` 方法中执行 OpenGL 操作时（比如在 `drawTriangle()` 和 `drawQuads()` 中），Qt 不会自动管理 OpenGL 上下文。

所以**我们需要手动管理OpenGL的上下文环境！！！需要用到两个函数：makeCurrent()` 和 `doneCurrent()**

所以需要在**initBufferObject**，**initShader**，**~OpenGLTest**，**drawTriangle**和**drawQuads**等地方手动设置makeCurrent() 和doneCurrent()，**将opengl操作的代码放在这两个函数中间**

修改后的完整代码如下：

```cpp
#include "OpenGLTest.h"
#include <QDebug>

// 顶点着色器源码
auto vertexShaderSource =
    "#version 330 core\n"
    "layout (location = 0) in vec3 aPos;\n"
    "void main() {\n"
    "   gl_Position = vec4(aPos.x, aPos.y, aPos.z, 1.0);\n"
    "}\0";

// 片段着色器源码
auto fragmentShaderSource =
    "#version 330 core\n"
    "out vec4 FragColor;\n"
    "void main() {\n"
    "   FragColor = vec4(0.0, 0.7, 1.0, 0.8);\n" // 淡蓝色
    "}\0";

// 构造函数
OpenGLTest::OpenGLTest(QWidget* parent) : QOpenGLWidget(parent)
{
}

// 析构函数：释放OpenGL对象
OpenGLTest::~OpenGLTest()
{
    //设置当前状态
    makeCurrent();
    // 释放所有OpenGL资源
    glDeleteVertexArrays(1, &m_VAO);
    glDeleteBuffers(1, &m_VBO);
    glDeleteBuffers(1, &m_EBO);
    glDeleteProgram(m_shaderProgram);
    //退出当前状态
    doneCurrent();
}

void OpenGLTest::initShader()
{
    makeCurrent();

    // 编译顶点着色器
    const GLuint vertexShader = glCreateShader(GL_VERTEX_SHADER);
    glShaderSource(vertexShader, 1, &vertexShaderSource, NULL);
    glCompileShader(vertexShader);

    // 检查顶点着色器编译错误
    GLint success;
    glGetShaderiv(vertexShader, GL_COMPILE_STATUS, &success);
    if (!success)
    {
        char infoLog[512];
        glGetShaderInfoLog(vertexShader, 512, NULL, infoLog);
        qDebug() << "顶点着色器编译失败：" << infoLog;
    }

    // 编译片段着色器
    const GLuint fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
    glShaderSource(fragmentShader, 1, &fragmentShaderSource, NULL);
    glCompileShader(fragmentShader);

    // 检查片段着色器编译错误
    glGetShaderiv(fragmentShader, GL_COMPILE_STATUS, &success);
    if (!success)
    {
        char infoLog[512];
        glGetShaderInfoLog(fragmentShader, 512, NULL, infoLog);
        qDebug() << "片段着色器编译失败：" << infoLog;
    }

    // 链接着色器程序
    m_shaderProgram = glCreateProgram();
    glAttachShader(m_shaderProgram, vertexShader);
    glAttachShader(m_shaderProgram, fragmentShader);
    glLinkProgram(m_shaderProgram);

    // 检查链接错误
    glGetProgramiv(m_shaderProgram, GL_LINK_STATUS, &success);
    if (!success)
    {
        char infoLog[512];
        glGetProgramInfoLog(m_shaderProgram, 512, NULL, infoLog);
        qDebug() << "着色器程序链接失败：" << infoLog;
    }

    // 删除临时着色器对象
    if (success)
    {
        glDeleteShader(vertexShader);
        glDeleteShader(fragmentShader);
    }

    doneCurrent();
}

void OpenGLTest::initBufferObject()
{
    makeCurrent();

    glGenVertexArrays(1, &m_VAO);
    glGenBuffers(1, &m_VBO);
    glGenBuffers(1, &m_EBO);

    doneCurrent();
}

void OpenGLTest::initializeGL()
{
    // 初始化OpenGL函数
    initializeOpenGLFunctions();
    //初始化着色器对象
    initShader();
    //初始化对象
    initBufferObject();
    // 设置清屏颜色
    glClearColor(0.1f, 0.1f, 0.1f, 1.0f);
}

void OpenGLTest::resizeGL(const int w, const int h)
{
    glViewport(0, 0, w, h); // 设置视口大小
}

void OpenGLTest::paintGL()
{
    glClear(GL_COLOR_BUFFER_BIT);
    glUseProgram(m_shaderProgram);
    glBindVertexArray(m_VAO);
    glLineWidth(2.0f); // 设置线宽
    glDrawElements(GL_LINES, m_indices.size(), GL_UNSIGNED_INT, NULL);
}

void OpenGLTest::drawTriangle()
{
    makeCurrent();
    // 三角形顶点数据
    m_vertices = {
        0.0f, 0.5f, 0.0f, // 顶点
        -0.5f, -0.5f, 0.0f, // 左下
        0.5f, -0.5f, 0.0f // 右下
    };

    // 三角形索引
    m_indices = {
        0, 1,
        1, 2,
        2, 0
    };

    // 更新缓冲区数据
    glBindVertexArray(m_VAO);

    // 更新顶点数据
    glBindBuffer(GL_ARRAY_BUFFER, m_VBO);
    glBufferData(GL_ARRAY_BUFFER, m_vertices.size() * sizeof(float),
                 m_vertices.constData(), GL_STATIC_DRAW);

    // 更新索引数据
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, m_EBO);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER,
                 m_indices.size() * sizeof(unsigned int), m_indices.constData(),
                 GL_STATIC_DRAW);

    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float),
                          (void*)0);
    glEnableVertexAttribArray(0);

    // 解绑VAO
    glBindVertexArray(0);
    // 完成绘制后刷新
    doneCurrent();
    update();
}

void OpenGLTest::drawQuads()
{
    makeCurrent();
    // 四边形顶点数据
    m_vertices = {
        0.5f, 0.5f, 0.0f, // 右上
        0.5f, -0.5f, 0.0f, // 右下
        -0.5f, -0.5f, 0.0f, // 左下
        -0.5f, 0.5f, 0.0f // 左上
    };

    // 四边形索引（使用两个三角形组成）
    m_indices = {
        0, 1, // 右上到右下
        1, 2, // 右下到左下
        2, 3, // 左下到左上
        3, 0 // 左上到右上
    };

    // 更新缓冲区数据
    glBindVertexArray(m_VAO);

    // 更新顶点数据
    glBindBuffer(GL_ARRAY_BUFFER, m_VBO);
    glBufferData(GL_ARRAY_BUFFER, m_vertices.size() * sizeof(float),
                 m_vertices.constData(), GL_STATIC_DRAW);

    // 更新索引数据
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, m_EBO);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER,
                 m_indices.size() * sizeof(unsigned int), m_indices.constData(),
                 GL_STATIC_DRAW);

    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float),
                          (void*)0);
    glEnableVertexAttribArray(0);

    // 解绑VAO
    glBindVertexArray(0);

    doneCurrent();
    // 完成绘制后刷新
    update();
}

void OpenGLTest::onDrawTriangleClicked()
{
    drawTriangle();
}

void OpenGLTest::onDrawQuadsClicked()
{
    drawQuads();
}

```

