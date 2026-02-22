title: OpenGL 着色器编译
date: 2025-04-21 06:21:00
categories: 搞七捻三
tags: [opengl]
---
### 一、基本了解

GLSL: OpenGL Shading language

GLSL着色器程序通常包含：

1. 版本声明：#version 330 core
2. 输入/输出变量
3. 主函数：void main() { ... }



### 二、数据类型

#### 2.1、基本类型：

1. float：浮点数
2. int：整数
3. bool：布尔值
4. void：无返回值



#### 2.2、容器类型：

1. **vecn**：vec2, vec3, vec4：浮点向量（2/3/4分量）
2. **ivecn:** ivec2, ivec3, ivec4：整数向量
3. **bvecn:** bvec2, bvec3, bvec4：布尔向量

**后面的n表示几个的意思，如ivecn,后面的n表示有n个正数类型**



#### 2.3、矩阵类型：

**matn:** mat2, mat3, mat4

分别表示：2x2, 3x3, 4x4矩阵



#### 2.4、变量修饰符

1. in：输入变量（顶点着色器从应用程序接收数据）
2. out：输出变量（传递到下一个着色阶段）
3. uniform：从应用程序传入的全局常量
4. layout(location = X)：指定变量布局和位置

#### 2.5、内置变量

顶点着色器：
	gl_Position：输出顶点位置
片段着色器：
	gl_FragCoord：片段坐标

​	输出通常自定义，如out vec4 FragColor

使用示例：

- 顶点着色器

```cpp
#version 330 core                   // GLSL版本声明
layout (location = 0) in vec3 aPos; // 接收顶点位置数据
out vec4 vertexColor;//传递给后边的片段着色器
void main() {
   gl_Position = vec4(aPos.x, aPos.y, aPos.z, 1.0); // 设置顶点位置
   vertexColor = vec4(0.5, 0.5, 0, 1);
}
```

**layout(location = 0)**:**显式指定顶点属性的位置索引,将着色器中的输入变量与OpenGL中的顶点属性绑定起来。一般来说，一个属性对应一个layout**

OpenGL使用位置索引（location）来标识顶点属性。每个顶点属性（如位置、颜色、法线等）都需要一个唯一的索引值。

1. X 是一个整数，表示顶点属性的位置索引
2. 通过显式指定位置索引，可以避免OpenGL自动分配索引时的混淆，并确保应用程序和着色器之间的绑定一致。

aPos 是一个输入变量，表示顶点的三维位置。layout(location = 0) 将 aPos 绑定到位置索引 0。

我们在这里将location指定为0，那么在代码层面

```cpp
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
glEnableVertexAttribArray(0);
```

glVertexAttribPointer 的第一个参数 0 对应 GLSL 中的 layout(location = 0)。表示顶点缓冲区中的数据将被传递到 GLSL 中的 aPos 变量。

多属性场景，前三个表示坐标，后三个表示颜色

```cpp
//顶点着色器
#version 330 core
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aColor;
out vec3 ourColor;
void main() {
   gl_Position = vec4(aPos.x, aPos.y, aPos.z, 1.0);
   ourColor = aColor;
}

//片段着色器
#version 330 core
out vec4 FragColor;
in vec3 ourColor;
void main() {
   FragColor = vec4(ourColor, 1.0f);
}

// 三角形顶点数据
m_vertices = {
    0.0f, 0.5f, 0.0f, 1.0f, 0.0f, 0.0f, // 顶点
    -0.5f, -0.5f, 0.0f, 0.0f, 1.0f, 0.0f, // 左下
    0.5f, -0.5f, 0.0f, 0.0f, 0.0f, 1.0f // 右下
};

//一个属性对应一个layout, 注意步长和偏移，步长均为6，但颜色要偏移 3 * sizeof(float)    
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)0);
glEnableVertexAttribArray(0);

glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)(3 * sizeof(float)));
glEnableVertexAttribArray(1);
```

由于glVertexAttribPointer和glEnableVertexAttribArray这样指定容易出现问题，所以可以通过 **glBindAttribLocation** 或 **glGetAttribLocation** 手动查询和绑定位置索引。防止出错

```cpp
// 查询着色器中的位置属性
m_shaderProgram.bind();
const GLint posLocation = m_shaderProgram.attributeLocation("aPos");
glVertexAttribPointer(posLocation, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
glEnableVertexAttribArray(posLocation);

// 设置着色器中的位置属性
//注意，如果编译源码中已经设置了location，建议使用上面查询的方式，否则posLocation与源码不一致会导致无法绘制
const GLint posLocation = 0;
m_shaderProgram.bind();
m_shaderProgram.bindAttributeLocation("aPos", posLocation);
glVertexAttribPointer(posLocation, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float),
                      (void *)0);
glEnableVertexAttribArray(posLocation);
```



- 片段着色器

```cpp
#version 330 core         // GLSL版本声明
out vec4 FragColor;       // 定义输出颜色
in vec4 vertexColor;
void main() {
    FragColor = vertexColor; // 颜色设置为顶点着色器传下来的值
    //FragColor = vec4(vertexColor.xyz,1.0); xyz取vertexColor前三个值，xxy为前两个取第一个值，第三个取第二个值，类推
}
```

**注意，传递参数时，需要确保类型和名字一致！！！**，如顶点着色器传出的vertexColor要与片段着色器接收的vertexColor名字一致，都要叫做vertexColor，同时类型也需要一致，均为vec4

### 三、 常用函数

1. 数学函数：sin, cos, pow, sqrt, mix, clamp
2. 向量操作：点积.，叉积cross()
3. 纹理采样：texture(sampler, texCoord)



### 四、uniform使用示例

通过定时器+uniform，将图形每隔1秒向右移动

- 顶点着色器

```cpp
#version 330 core
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aColor;
out vec3 ourColor;
uniform float offset;
void main() {
   gl_Position = vec4(aPos.x + offset, aPos.y, aPos.z, 1.0);
   ourColor = aColor;
}
```

- 片段着色器

```cpp
#version 330 core
out vec4 FragColor;
in vec3 ourColor;
void main() {
   FragColor = vec4(ourColor, 1.0f);
}
```

- moreAttributes.cpp

```cpp
#include "MoreAttributes.h"
#include <QDebug>
// 构造函数
MoreAttributes::MoreAttributes(QWidget* parent)
    : QOpenGLWidget(parent)
{
    m_timer = new QTimer(this);
    connect(m_timer, &QTimer::timeout, this, [&]()
    {
        makeCurrent();
        // 每秒让图形向右偏移offset距离
        static float offset = 0.0f;
        offset += 0.01f;
        // 让图形向右偏移
        m_shaderProgram.bind();
        m_shaderProgram.setUniformValue("offset", offset);
        doneCurrent();
        update();
    });
    m_timer->start(1000); // 1秒
}

// 析构函数：释放OpenGL对象
MoreAttributes::~MoreAttributes()
{
    makeCurrent();
    // 释放所有OpenGL资源
    glDeleteVertexArrays(1, &m_VAO);
    glDeleteBuffers(1, &m_VBO);
    glDeleteBuffers(1, &m_EBO);
    doneCurrent();
}

void MoreAttributes::initShader()
{
    makeCurrent();
    // 链接着色器程序
    m_shaderProgram.addShaderFromSourceFile(QOpenGLShader::Vertex,
                                            ":/shaders/shape.vertex");
    m_shaderProgram.addShaderFromSourceFile(QOpenGLShader::Fragment,
                                            ":/shaders/shape.fragment");
    if (!m_shaderProgram.link())
    {
        qDebug() << "Shader program linking failed:" << m_shaderProgram.log();
        return;
    }
    doneCurrent();
}

void MoreAttributes::initBufferObject()
{
    makeCurrent();

    glGenVertexArrays(1, &m_VAO);
    glGenBuffers(1, &m_VBO);
    glGenBuffers(1, &m_EBO);

    doneCurrent();
}

void MoreAttributes::initializeGL()
{
    // 初始化OpenGL函数
    initializeOpenGLFunctions();
    // 初始化着色器对象
    initShader();
    // 初始化对象
    initBufferObject();
    // 设置清屏颜色
    glClearColor(0.1f, 0.1f, 0.1f, 1.0f);
}

void MoreAttributes::resizeGL(const int w, const int h)
{
    glViewport(0, 0, w, h); // 设置视口大小
}

void MoreAttributes::paintGL()
{
    glClear(GL_COLOR_BUFFER_BIT);
    m_shaderProgram.bind(); // 绑定着色器程序
    glBindVertexArray(m_VAO);
    glLineWidth(2.0f); // 设置线宽
    glDrawElements(GL_LINES, m_indices.size(), GL_UNSIGNED_INT, NULL);
}

void MoreAttributes::drawTriangle()
{
    makeCurrent();
    // 三角形顶点数据
    m_vertices = {
        0.0f, 0.5f, 0.0f, 1.0f, 0.0f, 0.0f, // 顶点
        -0.5f, -0.5f, 0.0f, 0.0f, 1.0f, 0.0f, // 左下
        0.5f, -0.5f, 0.0f, 0.0f, 0.0f, 1.0f // 右下
    };

    // 三角形索引
    m_indices = {0, 1, 1, 2, 2, 0};

    // 更新缓冲区数据
    glBindVertexArray(m_VAO);

    // 更新顶点数据
    glBindBuffer(GL_ARRAY_BUFFER, m_VBO);
    glBufferData(GL_ARRAY_BUFFER, m_vertices.size() * sizeof(float),
                 m_vertices.constData(), GL_STATIC_DRAW);

    // 更新索引数据
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, m_EBO);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, m_indices.size() * sizeof(unsigned int),
                 m_indices.constData(), GL_STATIC_DRAW);

    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)0);
    glEnableVertexAttribArray(0);

    glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)(3 * sizeof(float)));
    glEnableVertexAttribArray(1);

    // 解绑VAO
    glBindVertexArray(0);
    // 完成绘制后刷新
    doneCurrent();
    update();
}

void MoreAttributes::drawQuads()
{
    makeCurrent();
    // 四边形顶点数据
    m_vertices = {
        0.5f, 0.5f, 0.0f, 1.0f, 0.0f, 0.0f, // 右上
        0.5f, -0.5f, 0.0f, 0.0f, 1.0f, 0.0f, // 右下
        -0.5f, -0.5f, 0.0f, 0.0f, 0.0f, 1.0f, // 左下
        -0.5f, 0.5f, 0.0f, 0.0f, 0.5f, 0.5f, // 左上
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
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, m_indices.size() * sizeof(unsigned int),
                 m_indices.constData(), GL_STATIC_DRAW);

    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)0);
    glEnableVertexAttribArray(0);

    glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)(3 * sizeof(float)));
    glEnableVertexAttribArray(1);
    // 解绑VAO
    glBindVertexArray(0);

    doneCurrent();
    // 完成绘制后刷新
    update();
}

void MoreAttributes::onDrawTriangleClicked() { drawTriangle(); }

void MoreAttributes::onDrawQuadsClicked() { drawQuads(); }

```

- moreAttributes.h

```cpp
#pragma once

#include "ui_MoreAttributes.h"
#include <QOpenGLFunctions_3_3_Core>
#include <QOpenGLShaderProgram>
#include <QOpenGLWidget>
#include <QTimer>
class MoreAttributes : public QOpenGLWidget,
                       protected QOpenGLFunctions_3_3_Core
{
    Q_OBJECT

public:
    explicit MoreAttributes(QWidget* parent = nullptr);
    ~MoreAttributes() override;

    // 绘制三角形
    void drawTriangle();
    // 绘制四边形
    void drawQuads();

public slots:
    void onDrawTriangleClicked();
    void onDrawQuadsClicked();

protected:
    void initializeGL() override; // 初始化OpenGL
    void resizeGL(int w, int h) override; // 窗口大小变化
    void paintGL() override; // 绘制

private:
    // 初始化VBO,VAO,EBO
    void initBufferObject();
    // 初始化着色器
    void initShader();

private:
    GLuint m_VAO, m_VBO, m_EBO; // OpenGL对象ID
    QOpenGLShaderProgram m_shaderProgram; // 着色器程序
    QVector<float> m_vertices = {}; // VBO顶点数据
    QVector<unsigned int> m_indices = {}; // EBO索引数据
    QTimer* m_timer = nullptr;

private:
    Ui::MoreAttributesClass ui;
};

```

- main.cpp

```cpp
#include "MoreAttributes.h"
#include <QApplication>
#include <QPushButton>
#include <QVBoxLayout>
#include <QWidget>

int main(int argc, char *argv[]) {
  QApplication a(argc, argv);

  // 创建主窗口
  QWidget mainWindow;
  auto layout = new QVBoxLayout(&mainWindow);

  // 创建 MoreAttributes 实例
  auto glWidget = new MoreAttributes(&mainWindow);
  layout->addWidget(glWidget);

  // 创建按钮
  auto triangleButton = new QPushButton("绘制三角形", &mainWindow);
  auto quadsButton = new QPushButton("绘制四边形", &mainWindow);

  // 设置按钮点击事件
  QObject::connect(triangleButton, &QPushButton::clicked, glWidget,
                   &MoreAttributes::onDrawTriangleClicked);
  QObject::connect(quadsButton, &QPushButton::clicked, glWidget,
                   &MoreAttributes::onDrawQuadsClicked);

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

