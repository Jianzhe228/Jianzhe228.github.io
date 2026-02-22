title: ubuntu彻底卸载MySQL
date: 2025-03-16 06:20:00
categories: 搞七捻三
tags: [MySQL]
---
### **1. 停止MySQL服务**
```bash
sudo systemctl stop mysql
```

### **2. 卸载MySQL软件包**
删除所有MySQL相关的软件包（根据你的安装版本调整包名）：
```bash
sudo apt purge mysql-server mysql-client mysql-common mysql-server-core-* mysql-client-core-*
```

### **3. 删除残留文件和目录**
手动删除MySQL的配置、数据和日志文件：
```bash
sudo rm -rf /etc/mysql /var/lib/mysql /var/log/mysql
```

### **4. 清理依赖和缓存**
```bash
sudo apt autoremove  # 删除不再需要的依赖包
sudo apt autoclean   # 清理软件包缓存
```

### **5. 检查是否彻底删除**
验证是否还有残留的MySQL文件：
```bash
dpkg -l | grep mysql  # 检查是否有未卸载的包
```
如果仍有残留，手动删除相关文件

### **验证卸载是否成功**
运行 `mysql` 命令：
```bash
mysql
```
提示 `Command 'mysql' not found`，则表示卸载成功。
