title: socat 入门指南：快速搭建 TCP和UDP 中转服务
date: 2025-02-23 16:44:00
categories: 搞七捻三
tags: [socat,中转]
---
`Socat` 是一个强大的命令行工具，用于在两个数据流之间建立连接。它不仅可以用于代理流量，还可以转发任何类型的网络流量，包括 TCP、UDP、SSL 等。

## 安装 `socat`

```bash
apt install socat -y
```

## 启动中转服务

### 基本用法

`Socat` 的基本语法如下：

```bash
socat <协议>-LISTEN:<监听端口>,fork <协议>:<目的主机IP>:<端口>
```

例如，以下命令将监听本地的 UDP 端口 `59823`，并将所有接收到的数据转发到 `213.4.2.3` 的 `59823` 端口：

```bash
socat UDP4-LISTEN:59823,fork UDP:213.4.2.3:59823
```

- **`UDP4-LISTEN:59823`**：表示 `socat` 将在本地监听 UDP 端口 `59823`。
- **`fork`**：表示 `socat` 将为每个连接创建一个新的子进程，允许多个客户端同时连接。
- **`UDP:213.4.2.3:59823`**：表示 `socat` 将把所有接收到的数据转发到 `213.4.2.3` 的 `59823` 端口。

### 后台运行

默认情况下，`socat` 会阻塞当前终端会话。如果希望 `socat` 在后台运行，可以在命令末尾添加 `&` 符号：

```bash
socat UDP4-LISTEN:59823,fork UDP:213.4.2.3:59823 &
```

### 使用 `nohup` 防止进程终止

如果希望在关闭终端后 `socat` 仍然运行，可以使用 `nohup` 命令：

```bash
nohup socat UDP4-LISTEN:59823,fork UDP4:213.4.2.3:59823 >/dev/null 2>&1 &
```

- **`nohup`**：防止进程因终端关闭而终止。
- **`>/dev/null 2>&1`**：将输出重定向到 `/dev/null`，避免生成日志文件。

### 优化端口绑定

可以使用 `reuseaddr` 参数来优化端口绑定，防止端口被占用：

```bash
nohup socat UDP4-LISTEN:59823,reuseaddr,fork UDP4:213.4.2.3:59823 >/dev/null 2>&1 &
```

- **`reuseaddr`**：允许 `socat` 在端口被占用时重新绑定。

## 终止所有 `socat` 进程

如果需要终止所有 `socat` 进程，可以使用以下命令：

```bash
# 查找所有 socat 进程的 PID
pgrep socat

# 终止所有相关进程
sudo kill -9 $(pgrep socat)
```

## 使用 `systemd` 托管服务（推荐）

为了更方便地管理 `socat` 服务，可以使用 `systemd` 来托管服务。

### 创建 `systemd` 服务文件

创建文件 `/etc/systemd/system/socat-udp.service`，内容如下：

```ini
[Unit]
Description=Socat UDP Forwarding
After=network.target

[Service]
ExecStart=/usr/bin/socat UDP4-LISTEN:59823,reuseaddr UDP4:213.136.83.240:59823
Restart=on-failure
User=root

[Install]
WantedBy=multi-user.target
```

- **`ExecStart`**：指定 `socat` 启动命令。
- **`Restart=on-failure`**：在服务失败时自动重启。
- **`User=root`**：以 `root` 用户身份运行服务。

### 启用并启动服务

```bash
sudo systemctl daemon-reload
sudo systemctl start socat-udp
sudo systemctl enable socat-udp
```

- **`daemon-reload`**：重新加载 `systemd` 配置。
- **`start`**：启动服务。
- **`enable`**：设置服务开机自启。

### 检查服务状态

```bash
sudo systemctl status socat-udp
```

## 删除服务

如果需要删除 `socat` 服务，可以按照以下步骤操作：

### 停止并禁用服务

```bash
# 停止服务
sudo systemctl stop socat-udp

# 禁用开机自启
sudo systemctl disable socat-udp
```

### 删除服务文件

```bash
sudo rm /etc/systemd/system/socat-udp.service
```

### 重新加载 `systemd` 配置

```bash
sudo systemctl daemon-reload
```

### 验证服务是否已删除

```bash
# 检查服务状态（预期输出 "not found"）
systemctl status socat-udp

# 确认服务文件已删除
ls /etc/systemd/system/socat-udp.service
```

### 额外清理（可选）

1. 终止残留进程：

```bash
# 查找进程 PID
pgrep socat

# 终止进程
sudo kill -9 <PID>
```

2. 清理日志：

```bash
# 查看服务日志
journalctl -u socat-udp

# 清理日志（谨慎操作）
sudo journalctl --vacuum-time=1d  # 保留最近 1 天的日志
```

3. 删除专用用户/组（如有）：

```bash
sudo userdel <用户名>
sudo groupdel <组名>
```

---

## 使用场景：通过 `socat` 转发本地 SSH 流量

### 背景

假设你有一台远程服务器（IP 为 `203.0.113.1`），它运行着 SSH 服务，监听端口 `22`。然而，由于某些原因（比如防火墙限制），你无法直接通过 `203.0.113.1:22` 访问这台服务器。你有一台中转服务器（IP 为 `198.51.100.1`），它可以直接访问目标服务器。现在，你希望通过中转服务器将本地机器的 SSH 流量转发到目标服务器。

### 目标

- 在本地机器上，通过访问中转服务器的某个端口（例如 `2222`），间接连接到目标服务器的 SSH 服务（`203.0.113.1:22`）。

### 步骤

#### 1. 在中转服务器上安装 `socat`

首先，在中转服务器（`198.51.100.1`）上安装 `socat`：

```bash
sudo apt update
sudo apt install socat -y
```

#### 2. 在中转服务器上启动 `socat` 转发服务

在中转服务器上运行以下命令，将本地端口 `2222` 的流量转发到目标服务器的 `22` 端口：

```bash
socat TCP4-LISTEN:2222,fork TCP:203.0.113.1:22
```

- **`TCP4-LISTEN:2222`**：在中转服务器上监听 TCP 端口 `2222`。
- **`fork`**：允许多个客户端同时连接。
- **`TCP:203.0.113.1:22`**：将流量转发到目标服务器的 `22` 端口。

#### 3. 在本地机器上通过中转服务器连接目标服务器

现在，你可以在本地机器上通过中转服务器的 `2222` 端口连接到目标服务器的 SSH 服务：

```bash
ssh -p 2222 user@198.51.100.1
```

- **`-p 2222`**：指定连接中转服务器的 `2222` 端口。
- **`user@198.51.100.1`**：使用中转服务器的 IP 地址和用户名。

#### 4. 验证连接

如果一切正常，你会通过中转服务器成功连接到目标服务器的 SSH 服务。

---

### 关键名词解释

1. **`TCP4-LISTEN`**：

   - 表示 `socat` 监听一个 TCP 端口。
   - 例如：`TCP4-LISTEN:2222` 表示监听本地的 `2222` 端口。
2. **`fork`**：

   - 允许多个客户端同时连接到监听端口。
   - 如果没有 `fork`，`socat` 只能处理一个连接，后续连接会被拒绝。
3. **`TCP:<目标IP>:<目标端口>`**：

   - 表示将流量转发到指定的目标 IP 和端口。
   - 例如：`TCP:203.0.113.1:22` 表示将流量转发到 `203.0.113.1` 的 `22` 端口。
4. **`nohup`**：

   - 防止进程因终端关闭而终止。
   - 例如：`nohup socat ... &` 可以让 `socat` 在后台运行，即使关闭终端也不会停止。
5. **`reuseaddr`**：

   - 允许 `socat` 在端口被占用时重新绑定。
   - 例如：`TCP4-LISTEN:2222,reuseaddr` 可以避免端口冲突。

---

### 进阶：使用 `systemd` 托管 `socat` 服务

如果你希望 `socat` 服务在中转服务器上长期运行，可以使用 `systemd` 托管服务。

#### 1. 创建 `systemd` 服务文件

在中转服务器上创建文件 `/etc/systemd/system/socat-ssh.service`，内容如下：

```ini
[Unit]
Description=Socat SSH Forwarding
After=network.target

[Service]
ExecStart=/usr/bin/socat TCP-LISTEN:2222,reuseaddr,fork TCP:203.0.113.1:22
Restart=on-failure
User=root

[Install]
WantedBy=multi-user.target
```

#### 2. 启用并启动服务

运行以下命令启用并启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl start socat-ssh
sudo systemctl enable socat-ssh
```

#### 3. 检查服务状态

运行以下命令检查服务状态：

```bash
sudo systemctl status socat-ssh
```

## 总结

**`Socat`**非常适合简单的 TCP/UDP 流量转发和调试，如作为中转节点转发流量。担并不能担任反向代理，对于复杂Web 流量或高并发场景，socat并不适用，需要使用**`Nginx`**或**`Caddy`**。

相关链接：

1. [Caddy 基本使用指南](https://typecho.jianzhe.us.kg/index.php/archives/3/)
2. [Nginx 安装与基本使用指南](https://typecho.jianzhe.us.kg/index.php/archives/22/)