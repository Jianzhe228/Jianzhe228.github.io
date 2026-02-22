title: chsrc 全平台通用换源工具
date: 2025-03-06 13:35:00
categories: 资源荟萃
tags: [镜像源]
---
chsrc全平台通用换源工具，能够为常用的工具快速设置镜像源

下载链接：https://github.com/RubyMetric/chsrc/releases/tag/v0.1.9

基本使用：
1. 帮助文档
```bash
chsrc --help
```

2. 查看可用镜像源
```bash
chsrc list
```

3. 对镜像源测速
```bash
chsrc measure mvn
```
4. 自动设置最快的镜像源
```bash
chsrc set mvn
```