title: docker安装-国内服务器
date: 2025-02-23 16:42:00
categories: 搞七捻三
tags: [docker]
---
### 1. 更新系统包

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. 安装依赖包

```bash
apt install curl vim wget gnupg dpkg apt-transport-https lsb-release ca-certificates
```

### 3. 添加Docker官方GPG密钥

添加阿里云的GPG密钥

```bash
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
```

或者添加官方的GPG密钥

```
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
```

### 4. 添加Docker仓库

将阿里云的APT仓库添加到系统中：

```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

或者官方的APT仓库

```
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 5. 更新APT包索引

更新APT包索引以包含Docker仓库中的包：

```bash
sudo apt update
```

### 6. 安装Docker

安装Docker CE（社区版）：

```bash
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### 7. 启动并启用Docker服务

启动Docker服务并设置为开机自启：

```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### 8. 验证安装

验证Docker是否安装成功：

```bash
sudo docker --version
```

你应该会看到类似以下的输出：

```
Docker version 20.10.12, build e91ed57
```

### 9. 添加用户到Docker组（可选）

为了避免每次使用Docker时都需要`sudo`，可以将当前用户添加到`docker`组：

```bash
sudo usermod -aG docker $USER
```

然后，注销并重新登录以使更改生效。

### 10.更换 DNS 服务器

编辑 `/etc/resolv.conf`，添加可靠 DNS:

```bash
nameserver 8.8.8.8
nameserver 114.114.114.114
```

### 11.配置代理

- 创建代理配置文件

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo nano /etc/systemd/system/docker.service.d/http-proxy.conf
```

添加内容（注意协议为 `http://`）：注意`HTTPS_PROXY`也是http,没有s

```bash
[Service]
Environment="HTTP_PROXY=http://127.0.0.1:7897"
Environment="HTTPS_PROXY=http://127.0.0.1:7897"
```

- 重启 Docker 服务

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

- **验证配置生效**

```bash
systemctl show docker --property Environment
# 预期输出：
# Environment=HTTP_PROXY=http://127.0.0.1:7897 HTTPS_PROXY=http://127.0.0.1:7897
```

### 12. 测试Docker

运行一个简单的Docker容器来测试安装是否成功：

```bash
docker run hello-world
```

如果一切正常，你应该会看到一条欢迎信息，表示Docker已经成功安装并运行。

> 如果报错：这个错误表明当前用户没有权限访问 Docker 守护进程。通常，Docker 需要 root 权限或用户必须属于 `docker` 组才能运行 Docker 命令
>
> ```bash
> ubuntu@ip-172-31-23-31:~$ sudo usermod -aG docker $USER
> ubuntu@ip-172-31-23-31:~$ docker run hello-world
> docker: permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Head "http://%2Fvar%2Frun%2Fdocker.sock/_ping": dial unix /var/run/docker.sock: connect: permission denied.
> See 'docker run --help'.
> ubuntu@ip-172-31-23-31:~$ 
> ```
> 可能是使用ssh连接服务器，重新登录以应用组更改即可