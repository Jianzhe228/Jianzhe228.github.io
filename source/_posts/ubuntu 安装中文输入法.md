title: ubuntu 安装中文输入法
date: 2025-11-24 14:23:00
categories: 搞七捻三
tags: [ubuntu]
---
### 方案一

安装中文语言包

```
sudo apt update
sudo apt install language-pack-zh-hans
```

安装 Fcitx5 输入法框架

```
sudo apt install fcitx5 fcitx5-chinese-addons fcitx5-config-qt fcitx5-configtool
```

手动启动：

```
fcitx5-configtool
```

手动创建 fcitx5 自启动文件

```
sudo nano /etc/xdg/autostart/fcitx5.desktop
```

写入

```
[Desktop Entry]
Type=Application
Exec=fcitx5
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=Fcitx 5
Comment=Start Fcitx 5 input method framework
```



### 方案二

1. 安装 IBus 和拼音引擎

```bash
sudo apt update
sudo apt install -y ibus ibus-libpinyin
im-config -n ibus
ibus restart
```

2. 设置 -> 键盘 -> 输入源 -> + -> Chinese -> Intelligent Pinyin (libpinyin)



### 拓展-语音输入

开源项目

**[VocoType-linux](https://github.com/LeonardNJU/VocoType-linux)**：高性能 Linux 离线中文语音输入法，基于 Ali FunASR(VocoType-cli). ~0.1s 瞬时上屏，输入法级稳定性， 极高中文准确率、低资源占用(CPU Only).支持 IBus / Fcitx5

对着文档就能安装，只需要安装语音输入法就行，里边的中文输入法不太行

```bash
git clone https://github.com/LeonardNJU/VocoType-linux.git
cd vocotype-cli
./scripts/install-ibus.sh
ibus restart
```

