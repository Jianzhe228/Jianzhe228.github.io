title: FRP内网穿透教程
date: 2025-03-06 13:23:00
categories: 搞七捻三
tags: [内网穿透,FRP]
---
### 一、准备工作

1. 正常运行的公网IP服务器
2. 域名（可选）

### 二、配置内网穿透

#### 1、公网云服务器

切换到root用户执行安装[kejilion](https://github.com/kejilion)大佬的脚本文件

```bash
bash <(curl -sL kejilion.sh)
```

> 脚本地址：https://github.com/kejilion/sh

- 选择**11**进入应用市场

![image-20250306201129922](https://images.guangyin.blog/2025/03/08428fa30525fb3623a32077b3a02378.webp)

- 选择**55**进入**FRP内网穿透（服务端）**

![image-20250306201417856](https://images.guangyin.blog/2025/03/5250e56f44cfe9bfc3c38b5246aa23d6.webp)

选择**1**安装FRP服务端，保存**客户端部署时需要用的参数**

![image-20250306201745610](https://images.guangyin.blog/2025/03/908c5cd5dafdb099913993d35e650460.webp)

#### 2、本地（WSL）

完成上述服务器端配置后，切换到本地，这里使用**WSL**为例

同样切换到root用户执行安装[kejilion](https://github.com/kejilion)大佬的脚本文件

```bash
bash <(curl -sL kejilion.sh)
```

- 选择11进入脚本市场，选择**56**进入**FRP内网穿透(客户端)**

![image-20250306202352350](https://images.guangyin.blog/2025/03/90411d280819d8fc67a6f303b2c92f00.webp)

- 然后选择**1**安装**FRP客户端**,根据提示填写信息,等待安装完成

![image-20250306202646846](https://images.guangyin.blog/2025/03/6a28ce4ee4b3fcf6cc4adfecf9369ef0.webp)

> - 外网对接IP就是公网云服务器的IP
> - token就是服务端生成的token

- 选择**4**添加一个对外服务

![image-20250306203429499](https://images.guangyin.blog/2025/03/58a012ea59cae90b79995c2a06a39986.webp)

> 1. 服务名称：随便填
> 2. 转发类型： 直接回车
> 3. 内网IP： 直接回车
> 4. 内网端口： 本地服务运行端口
> 5. 外网端口：外网服务器通过这个端口访问本地服务,可以相同，也可以不同，如果对外服务的是MySQL，且公网服务器也有MySQL,可以填写**3307**防止冲突

完成后会发现已经完成了一个映射，内网穿透已经可以使用，通过**公网IP+端口**即可访问本地服务

- 客户端

![image-20250306203949531](https://images.guangyin.blog/2025/03/6ef01487f0c695d8a9324b6b40790022.webp)

- 服务端，没有显示选择**00**刷新状态

![image-20250306205257292](https://images.guangyin.blog/2025/03/f56c9f71417d7fa1071f45fa5187ce1d.webp)

### 三、进阶

#### 1、添加自定义域名

在服务端选择**5**，添加一个内网服务域名访问

![image-20250306205713920](https://images.guangyin.blog/2025/03/235bf28aab4e677671c3fa7c3d7c00a1.webp)

> 注意，域名记得**解析并代理**服务器的**IP**地址

添加以后，我们就可以通过域名访问本地服务了

![image-20250306205955812](https://images.guangyin.blog/2025/03/bf20b7a74b3219426a140349a6cf9438.webp)

然后选择**8**阻止通过**IP+端口**的方式访问

![image-20250306212117235](https://images.guangyin.blog/2025/03/985f56ef4e99f841be40f76a31212fb1.webp)

>注意，服务端删除内网穿透时，记得先**选择6删除域名访问和选择7允许IP+端口访问**，防止下次使用时发生问题,最后，如果之前删除过服务，别忘记修改客户端的token!

完结撒花