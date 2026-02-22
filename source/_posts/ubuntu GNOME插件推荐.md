title: ubuntu GNOME插件推荐
date: 2025-11-24 14:26:11
categories: 搞七捻三
tags: [ubuntu]
---
安装GNOME 插件管理工具

```
sudo apt install gnome-shell-extension-manager
```

GNOME插件推荐

1. Caffeine ： 点击图标即可控制电脑不休眠

2. Clipboard Indicator : 剪切板工具

3. Compiz alike magic lamp effect : 最小化动画效果

4. Dash to Dock ： dock 栏工具

   - 让 Ubuntu Dock 支持点击最小化／恢复

   ```
   gsettings set org.gnome.shell.extensions.dash-to-dock click-action 'minimize'
   ```

   - 回复原状

   ```
   gsettings reset org.gnome.shell.extensions.dash-to-dock click-action
   ```

5. Blur my shell 美化工具



Tweaks 工具

支持设置终端剧中显示，双击窗口放大或缩小

```
sudo apt install gnome-tweaks
```

