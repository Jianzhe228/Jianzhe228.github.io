title: vmware输入卡顿问题
date: 2025-12-16 01:46:01
categories: 搞七捻三
tags: [vmware]
---
1. 减少虚拟机 cpu 核心数

2. 减少内存分配

3. 在C:\Users\username\Documents\Virtual Machines目录下，找到对应的虚拟机，修改.vmx文件，在末尾添加：

   ```
   keyboard.vusb.enable = "TRUE"
   ```

4. 关闭3D加速