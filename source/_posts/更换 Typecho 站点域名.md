title: 更换 Typecho 站点域名
date: 2025-03-06 09:53:49
categories: 搞七捻三
tags: []
---
### 一、修改数据库

```bash
# 登录数据库
mysql -u root -p

# 选择数据库
use typecho;

# 更新网站地址
UPDATE typecho_options SET siteUrl = 'https://example.com'
UPDATE typecho_users SET url = 'https://example.com'
```

### 二、修改 Nginx 配置文件

```bash
nano /etc/nginx/sites-available/typecho
nano /etc/nginx/nginx.conf
```

> 注意一下几点：
>
> 1. `server_name` 改为新域名
> 2. typecho根路径
> 3. SSL证书路径

### 三、检查 config.inc.php 文件

```bash
nano /var/www/html/config.inc.php
```

确保没有硬编码的旧域名。

### 四、重启 Nginx

```bash
nginx -t
systemctl restart nginx
```

### 五、刷新网站缓存

```bash
rm -rf /var/www/html/usr/cache/*
```

最后，别忘了更新域名的 DNS 解析记录，将新域名指向你的服务器 IP。



参考：[更换 Typecho 站点域名](https://ecouu.com/archives/42/)