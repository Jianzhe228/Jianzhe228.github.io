title: docker安装-国外服务器
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
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
```

### 3. 添加Docker官方GPG密钥

添加Docker的官方GPG密钥以确保下载的软件包是安全的：

```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
```

### 4. 添加Docker仓库

将Docker的APT仓库添加到系统中：

```bash
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
sudo apt install -y docker-ce docker-ce-cli containerd.io
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

### 10. 测试Docker

运行一个简单的Docker容器来测试安装是否成功：

```bash
docker run hello-world
```

如果一切正常，你应该会看到一条欢迎信息，表示Docker已经成功安装并运行。

> 如果报错：这个错误表明当前用户没有权限访问 Docker 守护进程。通常，Docker 需要 root 权限或用户必须属于 `docker` 组才能运行 Docker 命令
>
> ```
> ubuntu@ip-172-31-23-31:~$ sudo usermod -aG docker $USER
> ubuntu@ip-172-31-23-31:~$ docker run hello-world
> docker: permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Head "http://%2Fvar%2Frun%2Fdocker.sock/_ping": dial unix /var/run/docker.sock: connect: permission denied.
> See 'docker run --help'.
> ubuntu@ip-172-31-23-31:~$ 
> ```
> 可能是使用ssh连接服务器，重新登录以应用组更改即可