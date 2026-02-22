title: ubuntu 免密操作
date: 2026-02-08 15:29:21
categories: 搞七捻三
tags: [ubuntu]
---
sudo免密

```bash
sudo visudo

# 文件末尾添加
YOUR_USERNAME ALL=(ALL) NOPASSWD: ALL
```



pkexec免密

要取消 `pkexec` 命令在 Linux 系统中的密码输入限制（实现免密执行特权命令），需要配置 PolicyKit 规则。这通常通过在 `/etc/polkit-1/rules.d/` 目录中创建一个 `.rules` 文件来实现，允许特定用户免密执行特定命令

```
sudo nano /etc/polkit-1/rules.d/nopasswd.rules

# 添加如下代码
polkit.addRule(function(action, subject) {
    if (action.id == "org.freedesktop.policykit.exec" && subject.user == "YOUR_USERNAME") {
        return polkit.Result.YES;
    }
});


```

