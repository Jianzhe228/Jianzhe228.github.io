title: Qt自定义日志输出
date: 2025-03-10 03:43:00
categories: Qt
tags: []
---
### 一、注册自定义日志类

在main.cpp中注册日志类

```cpp
qInstallMessageHandler(Logger::customMessageHandler);
```

### 二、创建自定义日志类

#### 2.1 样式一：无颜色高亮

```cpp
#include "Logger.h"
#include <QDateTime>
#include <QFileInfo>
#include <cstdio>

namespace Logger
{

void customMessageHandler(QtMsgType type, const QMessageLogContext& context, const QString& msg)
{
    QString timeText = QDateTime::currentDateTime().toString("yyyy-MM-dd hh:mm:ss");
    QString file = QFileInfo(context.file ? context.file : "no-file").fileName();
    QString function = context.function ? context.function : "no-function";

    QString formattedMessage = QString("%1 [%2] (%3:%4, %5): %6")
                                   .arg(timeText)
                                   .arg(typeToString(type))
                                   .arg(file)
                                   .arg(context.line)
                                   .arg(function)
                                   .arg(msg);

    fprintf(stderr, "%s\n", formattedMessage.toLocal8Bit().constData());
}

QString typeToString(QtMsgType type)
{
    switch (type)
    {
    case QtDebugMsg:
        return "Debug";
    case QtInfoMsg:
        return "Info";
    case QtWarningMsg:
        return "Warning";
    case QtCriticalMsg:
        return "Critical";
    default:
        return "Unknown";
    }
}

} // namespace Logger
```

效果图：

![image-20250310115157637](https://images.228610.xyz/2025/03/2287b25acb6e7d62555a6b4e5f82404f.webp)

#### 2.2 样式二：有颜色高亮

```cpp
#include "Logger.h"
#include <QDateTime>
#include <QFileInfo>
#include <Windows.h>
#include <cstdio>

namespace Logger
{

void customMessageHandler(QtMsgType type, const QMessageLogContext& context, const QString& msg)
{
    QString timeText = QDateTime::currentDateTime().toString("yyyy-MM-dd hh:mm:ss");
    QString file = QFileInfo(context.file ? context.file : "no-file").fileName();
    QString function = context.function ? context.function : "no-function";

    QString typeStr = typeToString(type);

    HANDLE hConsole = GetStdHandle(STD_ERROR_HANDLE);

    CONSOLE_SCREEN_BUFFER_INFO consoleInfo;
    GetConsoleScreenBufferInfo(hConsole, &consoleInfo);
    WORD originalAttrs = consoleInfo.wAttributes;

    QString firstPart = QString("%1 ").arg(timeText);
    fprintf(stderr, "%s", firstPart.toLocal8Bit().constData());

    WORD colorAttrs = 0;
    switch (type)
    {
    case QtDebugMsg:
        colorAttrs = FOREGROUND_BLUE | FOREGROUND_INTENSITY; // Bright blue
        break;
    case QtInfoMsg:
        colorAttrs = FOREGROUND_GREEN | FOREGROUND_INTENSITY; // Bright green
        break;
    case QtWarningMsg:
        colorAttrs = FOREGROUND_RED | FOREGROUND_GREEN | FOREGROUND_INTENSITY; // Bright yellow
        break;
    case QtCriticalMsg:
        colorAttrs = FOREGROUND_RED | FOREGROUND_INTENSITY; // Bright red
        break;
    default:
        colorAttrs = originalAttrs;
    }
    SetConsoleTextAttribute(hConsole, colorAttrs);

    QString coloredPart = QString("[%1]").arg(typeStr);
    fprintf(stderr, "%s", coloredPart.toLocal8Bit().constData());

    SetConsoleTextAttribute(hConsole, originalAttrs);

    QString lastPart =
        QString(" (%1:%2, %3): %4\n").arg(file).arg(context.line).arg(function).arg(msg);
    fprintf(stderr, "%s", lastPart.toLocal8Bit().constData());

    HANDLE hStdIn = GetStdHandle(STD_INPUT_HANDLE);
    if (hStdIn != INVALID_HANDLE_VALUE)
    {
        SetConsoleTextAttribute(hStdIn, originalAttrs);
    }

    HANDLE hStdOut = GetStdHandle(STD_OUTPUT_HANDLE);
    if (hStdOut != INVALID_HANDLE_VALUE)
    {
        SetConsoleTextAttribute(hStdOut, originalAttrs);
    }
}

QString typeToString(QtMsgType type)
{
    switch (type)
    {
    case QtDebugMsg:
        return "Debug";
    case QtInfoMsg:
        return "Info";
    case QtWarningMsg:
        return "Warning";
    case QtCriticalMsg:
        return "Critical";
    default:
        return "Unknown";
    }
}

} // namespace Logger
```

效果图

![image-20250310115026790](https://images.228610.xyz/2025/03/dce9e0cb4bcc8b029e9b752836d1ba4d.webp)

