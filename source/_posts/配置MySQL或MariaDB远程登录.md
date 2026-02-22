title: 配置MySQL或MariaDB远程登录
date: 2025-03-06 09:13:00
categories: 数据库
tags: [MySQL,MariaDB]
---
### 一、放行端口

```bash
sudo ufw allow 3306
sudo ufw reload
```

> 如果是云服务器，需要在控制台放行端口

### 二、修改配置文件

#### 1、MySQL配置文件路径（ubuntu）

```bash
nano /etc/mysql/mysql.conf.d/mysqld.cnf
# 找到bind-address = 127.0.0.1并注释
```

#### 2、 MariaDB配置文件路径(centos)

```bash
nano /etc/my.cnf
# 在配置文件中找到[mysqld]部分，并添加或修改成以下行：
# [mysqld]
# bind-address=0.0.0.0
```

> 配置路径可能不同

### 三、重启MySQL

```bash
sudo systemctl restart mysql
```

### 四、添加远程登录用户

#### 1、检查用户

```sql
SELECT host FROM mysql.user WHERE User = 'root';
```

如果只看到带有 `localhost` 和 `127.0.0.1` 的结果，这将无法从外部连接。如果您看到其他 IP 地址，但没有您连接的地址，这也是无法连接的。

#### 2、添加用户

可以**允许指定ip地址**的用户以root用户身份登录

```sql
CREATE USER 'root'@'ip_address' IDENTIFIED BY 'some_pass';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'ip_address';
```

允许**任何IP地址**的用户以root用户身份登录

```sql
CREATE USER 'root'@'%' IDENTIFIED BY 'some_pass';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%';
```

#### 3、 刷新全新

```sql
FLUSH PRIVILEGES;
```

