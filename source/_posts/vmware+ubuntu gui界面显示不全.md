title: vmware+ubuntu gui界面显示不全
date: 2025-11-09 03:50:00
categories: 问题汇总
tags: [vmware,ubuntu]
---
- 环境：
  - VMware 虚拟机中安装 Ubuntu（桌面版）
- 现象：
  - 可以正常进入桌面
  - 但**有些软件的图形界面打不开 / 空白 / 不刷新 /控件显示不全**



解决步骤：

- 安装/确认 VMware Tools

  ```cpp
  sudo apt update
  sudo apt install -y open-vm-tools open-vm-tools-desktop
  sudo reboot
  ```

  如果没有解决，进行下一步

- 关闭3D 加速 / 3D 渲染

  在 **VMware 设置里关闭 加速3D图形**

  ```cpp
  虚拟机->设置->硬件->显示->取消勾选3D图形
  ```