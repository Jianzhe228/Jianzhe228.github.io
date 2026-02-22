title: Ubuntu 移除 Firefox Snap 并安装 Firefox 官方 .deb 版本
date: 2025-11-24 14:09:55
categories: 搞七捻三
tags: [ubuntu,firefox]
---
## 一、移除 Ubuntu 自带的 Firefox Snap 占位包

Ubuntu 默认提供的 Firefox 是 Snap 版本，并且 apt 安装的 firefox 只是一个“占位包”，会强制安装 Snap 版本。

首先清理系统中所有 Firefox：

1. 移除 snap 包

```
sudo snap remove firefox
```

1. 移除 Ubuntu 自带的 firefox 占位包

```
sudo apt purge firefox
```

1. 确认系统中没有任何 firefox 包

```
dpkg -l | grep firefox
```

如果没有输出，表示已彻底移除。

------

## 二、添加 Mozilla 官方 APT 仓库

Mozilla 为 Ubuntu 用户提供了真正的原生 .deb 安装方式，通过官方 APT 仓库获得更新。

1. 创建 keyrings 目录

```
sudo install -d -m 0755 /etc/apt/keyrings
```

1. 下载 Mozilla 官方仓库签名 key（ASCII）

```
sudo wget -O /etc/apt/keyrings/packages.mozilla.org.asc https://packages.mozilla.org/apt/repo-signing-key.gpg
```

1. 将 ASCII key 转换为 apt 可用的 binary key

```
sudo gpg --dearmor -o /etc/apt/keyrings/packages.mozilla.org.gpg /etc/apt/keyrings/packages.mozilla.org.asc
sudo chmod 644 /etc/apt/keyrings/packages.mozilla.org.gpg
```

1. 添加 Mozilla 官方 APT 源

```
echo "deb [signed-by=/etc/apt/keyrings/packages.mozilla.org.gpg] https://packages.mozilla.org/apt mozilla main" \
| sudo tee /etc/apt/sources.list.d/mozilla.list
```

------

## 三、避免 Ubuntu 主仓库再次安装 Snap 占位包（APT Pinning）

为了阻止 Ubuntu 的 firefox Snap 占位包再次安装，需要给 APT 设置优先级。

1. 创建优先级规则文件

```
sudo nano /etc/apt/preferences.d/mozilla-firefox
```

1. 写入以下内容

```
Package: firefox
Pin: origin packages.mozilla.org
Pin-Priority: 700

Package: firefox
Pin: origin mirrors.aliyun.com
Pin-Priority: -1

Package: firefox
Pin: origin archive.ubuntu.com
Pin-Priority: -1
```

保存退出。

这样 apt 就会优先使用 Mozilla 仓库，并拒绝 Ubuntu 仓库的 Snap 占位包。

------

## 四、更新软件源

```
sudo apt update
```

如果此时没有看到 Firefox 相关错误，说明 Mozilla 仓库已经成功启用。

------

## 五、安装正式的 Firefox .deb 版本

```
sudo apt install firefox
```

此时安装的 Firefox 即为来自 Mozilla 官方 APT 仓库的原生 .deb 版本。

------

## 六、验证安装结果

1. 检查 Firefox 的路径

```
which firefox
```

应该输出：

```
/usr/bin/firefox
```

如果输出的是 `/snap/bin/firefox`，则表示仍在使用 Snap，需要清理后重新安装。

1. 再次确认 dpkg 列表

```
dpkg -l | grep firefox
```

应该能看到 Mozilla 提供的版本，而不是 “snap1” 结尾的 Ubuntu 占位包。