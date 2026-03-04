title: GNOME 顶部栏优化 - 解决内容重叠问题
date: 2026-03-04 22:20:49
categories: 搞七捻三
tags: [ubuntu]
---
## 问题

GNOME 顶部栏右侧内容太多（网速监控 + 托盘图标 + 系统图标），和中间的时钟重叠。

## 原因

GNOME 顶部栏分三个区域：左、中（时钟）、右。默认扩展都挤在右边。

涉及的扩展：
- `netspeedsimplified` - 网速/流量监控
- `ubuntu-appindicators` - 应用托盘图标（微信、QQ 等）

## 解决方案

将部分扩展从右侧移到左侧，利用左侧的空闲空间。

### 1. 网速监控移到左边

```bash
dconf write /org/gnome/shell/extensions/netspeedsimplified/wpos 1
```

`wpos` 可选值：`0` = 右，`1` = 左，`2` = 中

### 2. 托盘图标移到左边

```bash
dconf write /org/gnome/shell/extensions/appindicator/tray-pos "'left'"
```

可选值：`'left'`、`'right'`

### 其他可选优化

```bash
# 缩小托盘图标间距（默认 12）
dconf write /org/gnome/shell/extensions/appindicator/icon-spacing 6

# 网速监控竖排显示，节省横向空间
dconf write /org/gnome/shell/extensions/netspeedsimplified/isvertical true
```

## 恢复默认

```bash
dconf write /org/gnome/shell/extensions/netspeedsimplified/wpos 0
dconf write /org/gnome/shell/extensions/appindicator/tray-pos "'right'"
```

设置修改后即时生效，无需重启。也可以在"扩展"应用中点击对应扩展的齿轮图标进行图形化配置。
