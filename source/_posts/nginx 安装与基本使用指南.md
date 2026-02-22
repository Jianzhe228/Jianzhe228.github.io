title: nginx 安装与基本使用指南
date: 2025-02-23 16:43:00
categories: 开发调优
tags: [反向代理,nginx]
---
# Nginx 反向代理配置与基础使用指南

Nginx 是一个高性能的 Web 服务器和反向代理服务器，广泛用于处理高并发请求、负载均衡和静态文件服务。如果不了解反向代理是什么，可以参考[这篇文章](https://www.228610.xyz/2025/02/23/%E4%BD%BF%E7%94%A8%E5%8F%8D%E5%90%91%E4%BB%A3%E7%90%86%E7%9A%84%E7%90%86%E8%A7%A3/)。

---

## 1. 安装 Nginx

### 1.1 在 Ubuntu/Debian 上安装

```bash
sudo apt update && sudo apt install nginx
```

### 1.2 启动与验证

启动 Nginx 并设置开机自启：

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

访问 `http://你的服务器IP`，若看到 Nginx 欢迎页面，说明安装成功。确保 80 端口未被占用。

---

## 2. Nginx 配置文件结构

- **主配置文件**：`/etc/nginx/nginx.conf`（全局设置，通常无需修改）。
- **站点配置文件**：`/etc/nginx/sites-available/`（配置文件存放处）和 `/etc/nginx/sites-enabled/`（启用的配置文件软链接）或 `/etc/nginx/conf.d/`（直接启用的配置文件）。

---

## 3. 典型使用场景

### 3.1 静态文件服务

**场景**：通过 `example.com` 提供静态文件（如 HTML、CSS）。

**配置**：

```nginx
server {
    listen 80;
    server_name example.com;
    
    location / {
        root /var/www/html;
        index index.html index.htm;
        try_files $uri $uri/ =404;
    }
}
```

**关键字解释**：
- `listen 80;`：监听 80 端口（HTTP 默认端口）。
- `server_name example.com;`：处理该域名的请求。
- `root /var/www/html;`：静态文件目录。
- `index index.html index.htm;`：默认访问的文件顺序。
- `try_files`：按顺序尝试查找文件，若都不存在则返回404。

### 3.2 反向代理

**场景**：将 `example.com` 的请求转发到 `localhost:8080`。

**配置**：

```nginx
server {
    listen 80;
    server_name example.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 添加超时配置
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

**关键字解释**：
- `proxy_pass`：将请求转发到指定地址。
- `proxy_set_header`：传递客户端信息（如真实 IP 和协议）。
- 超时配置：防止长时间连接占用资源。

### 3.3 HTTP 重定向到 HTTPS

**场景**：强制所有 HTTP 请求跳转到 HTTPS。

**配置**：

```nginx
server {
    listen 80;
    server_name example.com;
    
    # 添加 $request_uri 确保路径和参数被保留
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com;
    
    ssl_certificate /etc/nginx/ssl/example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;
    
    # 添加 SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**关键字解释**：
- `return 301`：永久重定向到 HTTPS。
- `listen 443 ssl;`：启用 HTTPS。
- `ssl_certificate` 和 `ssl_certificate_key`：指定证书和私钥路径。
- `ssl_protocols` 和 `ssl_ciphers`：指定加密协议和算法，提高安全性。

### 3.4 负载均衡

**场景**：将请求分发到多个后端服务器。

**配置**：

```nginx
upstream backend {
    # 添加负载均衡算法
    least_conn;
    server 192.168.1.101:8080 max_fails=3 fail_timeout=30s;
    server 192.168.1.102:8080 max_fails=3 fail_timeout=30s;
    server 192.168.1.103:8080 max_fails=3 fail_timeout=30s;
    
    # 添加备用服务器
    server 192.168.1.104:8080 backup;
}

server {
    listen 80;
    server_name example.com;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 添加健康检查间隔
        health_check interval=10 fails=3 passes=2;
    }
}
```

**关键字解释**：
- `upstream`：定义后端服务器组。
- `least_conn`：使用最少连接数算法分配请求。
- `max_fails` 和 `fail_timeout`：定义失败条件和超时时间。
- `backup`：备用服务器，仅在主服务器不可用时使用。
- `health_check`：定期检查后端服务器健康状态。



### 3.5 路径匹配与请求转发

**场景**：根据不同路径转发到不同服务。

**配置**：

```nginx
nginxCopyserver {
    listen 80;
    server_name example.com;
    
    # API 请求转发
    location /api/ {
        proxy_pass http://localhost:8080/;
        # 注意：proxy_pass 末尾有 / 会去除 location 匹配部分
    }
    
    # 静态资源处理
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        root /var/www/static;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
    
    # 默认路由
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

**关键字解释**：

- `location /api/`：匹配 `/api/` 开头的路径。
- `location ~*`：使用正则表达式匹配，不区分大小写。
- `expires` 和 `add_header`：设置缓存控制。



### 3.6 日志查看

```nginx
server {
    listen 80;
    server_name example.com;
    
    # 自定义访问日志格式
    access_log /var/log/nginx/example.com.access.log;
    error_log /var/log/nginx/example.com.error.log warn;
    
    location / {
        proxy_pass http://localhost:8080;
    }
}
```

- **访问日志**：`/var/log/nginx/access.log` 或自定义路径
- **错误日志**：`/var/log/nginx/error.log` 或自定义路径

实时查看：

```bash
tail -f /var/log/nginx/access.log
```

---

## 4. 测试和重载配置

验证配置是否正确：

```bash
sudo nginx -t
```

重载配置：

```bash
sudo systemctl reload nginx
```

