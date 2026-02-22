title: "[转载] Typecho博客迁移完整指南"
date: 2025-03-06 09:33:00
categories: 搞七捻三
tags: [typecho]
---
> From: Rational
> Author: Rational
> 原文链接：[Typecho博客迁移完整指南](https://ecouu.com/archives/43/)

## 一、数据备份

### 1. 数据库备份

```bash
mysqldump -u root -p typecho > typecho_backup.sql
```

- `mysqldump` 只会导出数据库的结构和数据内容，不会包含数据库的用户名和密码信息。也就是说，备份文件 `typecho_backup.sql` 中不会保存与数据库连接相关的用户名和密码。所以后文需要`CREATE USER`

### 2. 网站文件备份

```bash
cd /var/www/html
tar -zcvf typecho_files.tar.gz *
```

## 二、数据迁移

### 1. 传输文件（二选一）

```bash
# 方式一：直接从源服务器到目标服务器
scp -r /var/www/html/* username@new_server:/var/www/html/
scp typecho_backup.sql username@new_server:/root/

# 方式二：通过本地中转
# 先下载到本地
scp username@old_server:/var/www/html/typecho_files.tar.gz ./
scp username@old_server:/path/to/typecho_backup.sql ./
# 再上传到新服务器
scp typecho_files.tar.gz username@new_server:/var/www/html/
scp typecho_backup.sql username@new_server:/root/
```

### 2. 恢复数据

#### 2.1 文件恢复

```bash
cd /var/www/html
tar -zxvf typecho_files.tar.gz
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html
chmod -R 777 /var/www/html/usr/uploads
```

#### 2.2 数据库恢复

登录MySQL-创建数据库-创建用户密码-赋予权限-刷新-退出

```bash
mysql -u root -p

CREATE DATABASE typecho;
CREATE USER 'typecho'@'localhost' IDENTIFIED BY '密码';
GRANT ALL PRIVILEGES ON typecho.* TO 'typecho'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> 创建的数据库名和用户名密码可以为新的。例如数据库名改为`typechho1`，那么下一步的`typecho`需改为`typecho1`。同时`config.inc.php`中也需要更改相应的参数。

- 导入数据

    ```bash
    mysql -u root -p typecho < /root/typecho_backup.sql
    ```

## 三、配置调整

### 1. 修改配置文件

```bash
nano /var/www/html/config.inc.php
```

需检查：

- 数据库连接信息
- 网站URL
- 网站路径

### 2. 清理缓存

```bash
rm -rf /var/www/html/usr/cache/*
```

### 3. 重启服务

```bash
systemctl restart nginx
systemctl restart php7.4-fpm
```

> php7.4-fpm版本需要自行检查

## 四、故障排查

### 1. 查看日志

```bash
# Nginx日志
tail -f /var/log/nginx/error.log

# PHP日志
tail -f /var/log/php7.4-fpm.log
```

### 2. 常见问题解决

- 数据库连接错误：检查 config.inc.php 配置

- 图片显示异常：检查 uploads 目录权限

- 后台登录问题：
    查看数据库中的用户表：

    ```sql
    SELECT * FROM typecho_users;
    ```

    修改管理员url：

    ```
    UPDATE typecho_users SET url = 'https://新域名' WHERE uid = 1;
    ```

    重置管理员密码：

    ```sql
    UPDATE typecho_users SET password = MD5('新密码') WHERE uid = 1;
    ```

    修改管理员用户名：

    ```
    UPDATE typecho_users SET name = '新管理员用户名' WHERE name = 'admin';
    ```

## 五、注意事项

1. 迁移前停用插件
2. 确保PHP版本兼容
3. 保留原站备份
4. 测试所有功能：
    - 前台访问
    - 后台登录
    - 文章显示
    - 图片加载
    - 评论功能