title: Caddy 安装与基本使用指南
date: 2025-02-23 16:41:00
categories: 开发调优
tags: [反向代理,caddy]
---
# Caddy 反向代理配置与基础使用指南

Caddy 是一个用 Go 语言编写的开源 Web 服务器，以简单易用、自动 HTTPS 和强大的插件系统著称。其配置文件 `Caddyfile` 简洁明了，能自动处理 HTTPS 证书的申请和续期。如果不了解反向代理是什么，可以参考[这篇文章](https://guangyin.blog/index.php/archives/3/)。

---

## 1. 安装 Caddy

### 1.1 官方安装方法

具体安装方式参考：[Caddy 安装指南](https://caddyserver.com/docs/install)。

### 1.2 在 Linux 上安装

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### 1.3 在 macOS 上安装

```bash
brew install caddy
```

### 1.4 在 Windows 上安装

从 [Caddy 官网](https://caddyserver.com/download) 下载二进制文件，解压后运行。

### 1.5 启动与验证

启动 Caddy 并设置开机自启：

```bash
sudo systemctl start caddy
sudo systemctl enable caddy
```

访问 `http://你的服务器IP`，若看到欢迎页面，安装成功。

---

## 2. Caddy 配置文件结构

Caddy 使用 `Caddyfile` 作为配置文件，默认位于 `/etc/caddy/Caddyfile` 或项目目录中。示例：

```bash
example.com {
    root * /var/www/html
    file_server
}
```

---

## 3. 反向代理配置示例

### 3.1 场景

将 `example.com` 的请求代理到 `localhost:8080`，并启用 HTTPS。

### 3.2 配置

```bash
example.com {
    reverse_proxy localhost:8080
}
```

### 3.3 工作原理

- **自动 HTTPS**：Caddy 通过 Let's Encrypt 申请证书，默认将 HTTP 重定向到 HTTPS。
- **反向代理**：请求转发到 `localhost:8080`。

---

## 4. 其他使用场景

### 4.1 静态文件服务

```bash
example.com {
    root * /var/www/html
    file_server
}
```

- `root`：指定文件目录。
- `file_server`：启用文件服务。

### 4.2 负载均衡

```bash
example.com {
    reverse_proxy /api/* {
        to localhost:8080 localhost:8081
    }
}
```

- `/api/*`：匹配路径。
- `to`：多后端负载均衡。

### 4.3 日志配置

```bash
example.com {
    log {
        output file /var/log/caddy/access.log
        format json
    }
}
```

- `format json`：日志格式现代化。

---

## 5. 测试和重载配置

验证配置：

```bash
caddy validate
```

重载配置：

```bash
caddy reload
```

---

## 6. 更多资源

- 官方文档：[Caddy 官方文档](https://caddyserver.com/docs/)
- 社区支持：[Caddy 论坛](https://caddy.community/)