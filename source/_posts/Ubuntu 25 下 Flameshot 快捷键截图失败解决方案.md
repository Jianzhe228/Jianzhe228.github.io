title: Ubuntu 25 下 Flameshot 快捷键截图失败解决方案
date: 2026-02-08 06:59:32
categories: 搞七捻三
tags: [flameshot]
---
## 问题背景

我在 Ubuntu 25 上想实现这件事：

1. 截图后自动保存到文件
2. 同时复制到剪贴板，方便直接粘贴

命令行手动执行 `flameshot gui -p ~/Pictures/Screenshots -c` 时可用，但绑定快捷键后执行却报错：

`Flameshot Error: Unable to capture screen`

另外，Ubuntu 25 默认 Wayland，会话里基本不再走 X11 方案

## 环境

- 系统：Ubuntu 25
- 显示会话：Wayland
- 工具：Flameshot 12.1.0

## 结论

核心不是快捷键本身，而是 Wayland 截图通道（portal）和启动方式。

最终稳定方案：

- 不使用 `QT_QPA_PLATFORM=xcb`
- 使用脚本封装 Flameshot 命令
- 快捷键绑定脚本路径
- 重启 `xdg-desktop-portal` 相关服务

## 解决步骤

### 1. 安装/确认依赖

```bash
sudo apt install -y flameshot xdg-desktop-portal xdg-desktop-portal-gnome
```

### 2. 重启 portal 服务

```bash
pkill -x flameshot || true
systemctl --user restart xdg-desktop-portal xdg-desktop-portal-gnome
```

### 3. 创建截图脚本（Wayland）

```bash
mkdir -p ~/Pictures/Screenshots ~/bin
printf '%s\n' \
'#!/usr/bin/env bash' \
'/usr/bin/flameshot gui -p "$HOME/Pictures/Screenshots" -c' \
> ~/bin/flameshot-shot.sh
chmod +x ~/bin/flameshot-shot.sh
```

### 4. 先在终端验证脚本

```bash
~/bin/flameshot-shot.sh
```

如果这一步能正常截图，说明后端链路已通。

### 5. 绑定快捷键

在 `设置 -> 键盘 -> 自定义快捷键` 新增：

- 名称：`Flameshot`
- 命令：`/home/zjz/bin/flameshot-shot.sh`
- 快捷键：`Ctrl+Shift+Alt+S`
