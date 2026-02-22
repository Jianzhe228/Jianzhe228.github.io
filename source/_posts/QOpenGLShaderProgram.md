title: QOpenGLShaderProgram
date: 2025-04-21 05:50:00
categories: Qt
tags: [Qt,opengl]
---
OpenGL默认设置着色器很繁琐，编译源码使用字符串硬编码的方式容易出错，如下面这种写法

```cpp
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
```

为了解决这个问题，可以使用Qt封装好的`OpenGLShaderProgram`和资源文件处理,相关代码如下

- shape.vertex

```cpp
#version 330 core
layout (location = 0) in vec3 aPos;
void main() {
   gl_Position = vec4(aPos.x, aPos.y, aPos.z, 1.0);
}
```

- shape.fragment

```cpp
#version 330 core
out vec4 FragColor;
void main() {
    FragColor = vec4(0.0, 0.7, 1.0, 0.8);
}
```

​    示例：

```cpp
//声明
QOpenGLShaderProgram m_shaderProgram; 

//创建着色器
void OpenGLShaderProgram::initShader()
{
    makeCurrent();
    // 链接着色器程序
    m_shaderProgram.addShaderFromSourceFile(QOpenGLShader::Vertex, ":/shaders/shape.vertex");
    m_shaderProgram.addShaderFromSourceFile(QOpenGLShader::Fragment, ":/shaders/shape.fragment");
    if (!m_shaderProgram.link())
    {
        qDebug() << "Shader program linking failed:" << m_shaderProgram.log();
        return;
    }
    doneCurrent();
}

//使用
m_shaderProgram.bind(); // 绑定着色器程序
```

1. QOpenGLShader::Vertex：创建一个顶点着色器
2. QOpenGLShader::Fragment：创建一个片段着色器
3. addShaderFromSourceFile：创建着色器，编译代码分别在**:/shaders/shape.vertex**和**:/shaders/shape.fragment**

