title: aria2c安装和配置
date: 2025-11-24 14:08:48
categories: 搞七捻三
tags: [aria2c]
---
## 1. 安装 aria2

Ubuntu 官方仓库直接可安装：

```bash
sudo apt update
sudo apt install aria2
```

验证版本：

```bash
aria2c -v
```

------

## 2. 创建默认配置文件

aria2 支持使用配置文件自动加载参数，无需每次手动输入。

### 创建配置目录：

```bash
mkdir -p ~/.aria2
```

### 编辑配置文件：

```bash
nano ~/.aria2/aria2.conf
```

写入常用参数（示例推荐配置）：

```
# 基本下载配置
continue=true
file-allocation=none

# 多线程
split=16
max-connection-per-server=16
min-split-size=1M

# 重试与超时
max-tries=5
timeout=600

# 证书检查（可按需关闭）
check-certificate=false

# 下载目录（可选）
dir=/home/你的用户名/Downloads
```

这样以后只需执行：

```bash
aria2c http://example.com/file.zip
```

所有默认参数自动生效