title: "[转载] 在 1Panel 下搭建 MyNodeQuery 实时监控 VPS"
date: 2025-02-23 16:40:00
categories: 搞七捻三
tags: [探针,MyNodeQuery,1panel]
---
> From: misaka.es
> Author: misaka
> 原文链接：[在 1Panel 下搭建 MyNodeQuery 实时监控 VPS](https://misaka.es/archives/29.html)

---

MyNodeQuery 是一款简洁好用的探针，支持 Telegram 节点离线通知、自定义 Ping 节点、还有网速、流量报表等功能。它的功能和易用性没有哪吒探针和 Server Status 做的好，项目也并未开源，但这个项目的网络监控做得很好，可以自定义 ping 的地址，方便实时查看国内三网到 VPS 的网络延迟和波动。

项目地址：https://hub.docker.com/r/jaydenlee2019/mynodequery

1Panel 是近两年新兴的一款 Web 管理面板，它基于 Docker，易于安装，可以方便直观并快捷的搭建网站环境和管理 Docker 项目。

项目地址：https://github.com/1Panel-dev/1Panel

## 安装 1Panel

Ubuntu:

```bash
curl -sSL https://resource.fit2cloud.com/1panel/package/quick_start.sh -o quick_start.sh && sudo bash quick_start.sh
```

Debian:

```bash
curl -sSL https://resource.fit2cloud.com/1panel/package/quick_start.sh -o quick_start.sh && bash quick_start.sh
```

安装成功后，控制台会打印面板访问信息，可通过浏览器访问 1Panel：

http://目标服务器 IP 地址:目标端口/安全入口

如果使用的是云服务器，请至安全组开放目标端口。

ssh 登录 1Panel 服务器后，执行 1pctl user-info 命令可获取安全入口（entrance）。

## 1Panel 下安装 MyNodeQuery

1Panel 安装好后进入后台，点击左侧菜单——主机——文件——根目录—— opt 进入，点击创建文件夹，新建 MyNodeQuery 文件夹。

进入刚刚创建的 MyNodeQuery 文件夹，点击创建文件，创建 `docker-compose.yml` 和 `appsettings.json` 两个文件。

打开 `docker-compose.yml` 文件添加如下内容并保存：

```yml
version: '3.3'
services:
  mynodequery:
    container_name: mynodequery
    ports:
      - '5000:5000'
    volumes:
      - './appsettings.json:/app/appsettings.json'
    image: 'jaydenlee2019/mynodequery:latest'

  mynodequerydb:
    image: 'docker.io/mysql:5.7' #使用的镜像
    restart: always
    container_name: mynodequery-mysql  #容器名
    command: mysqld --default-authentication-plugin=mysql_native_password
    volumes:
      - ./data:/var/lib/mysql  #挂载目录，持久化存储
    # ports:
    #   - '3306:3306'
    environment:
      TZ: Asia/Shanghai
      MYSQL_ROOT_PASSWORD: "mynodequery"   #设置root用户的密码
      MYSQL_DATABASE: "mynodequery"
      MYSQL_USER: "mynodequery"
      MYSQL_PASSWOR: "mynodequery"   #设置mysql用户的密码
```

打开 `appsettings.json` 文件添加如下内容并保存：

```json
{
  "Logging": {
      "LogLevel": {
          "Default": "Information",
          "Microsoft": "Warning",
          "Microsoft.Hosting.Lifetime": "Information"
      }
  },
  "MySql": {
      "ConnectionString": ""
  },
  "AllowedHosts": "*",
  "Installed": "false",
  "ReadNodeIpHeaderKey": "X-Real-IP"
 }
```

点击 `左侧菜单——容器——编排——创建编排`，在右侧的弹出界面中点击路径选择，路径选择刚刚创建的 `docker-compose.yml` ：

`主菜单 > opt > MyNodeQuery > docker-compose.yml` 确认，再点击右下角的确认按钮等待安装完成。

此时 MyNodeQuery 已经安装完成。

## 域名反向代理设置

如果你有一个域名，需要将域名指向探针面板，那么用 1Panel 也可以方便的设置反向代理。

首先，需要在你的域名服务商处，将域名（此处以 vps.12345.com 为例）指向安装 MyNodeQuery 的服务器 IP地址。

然后打开 1Panel 左侧的菜单——网站——创建网站，在右侧的弹出面板选择“反向代理”：

> 主域名： vps.12345.com
> 代号： vps.12345.com
> 代理地址： 选择 http，后面填写 127.0.0.1:5000

点击确认按钮，此时反向代理就已经新建完成，点击配置——HTTPS，可手动添加证书，或者在线申请免费 SSL 证书，证书设置好后，至此，反向代理设置完成。

## 初始化配置 MyNodeQuery

打开你的域名 [https://vps.12345.com](https://vps.12345.com/)（如果未设置 SSL 证书，那就是打开 [http://vps.12345.com](http://vps.12345.com/)）

连接 mysql 数据库：

> 主机名：mynodequerydb
> 端口：3306
> 数据库名：mynodequery
> 用户 ID：root
> 密码：mynodequery

站点基本设置：

> 站点标题：随便填写
> 网站地址（URL)：[https://vps.12345.com](https://vps.12345.com/)
> 站点地址（URL)：[https://vps.12345.com](https://vps.12345.com/)
> 登陆密码：自行设置
> 确认密码：输入自行设置的密码

ping 节点设置（支持tcping）：

以下为主要地区的三网 ip 地址（来自腾讯和百度CDN）：

> 广州电信 14.215.182.217
> 广州联通 163.177.17.45
> 广州移动 111.45.3.7
> 上海电信 180.163.148.209
> 上海联通 140.207.62.232
> 上海移动 221.130.192.224
> 北京电信 220.181.111.153
> 北京联通 111.206.208.32
> 北京移动 112.34.112.45

至此，MyNodeQuery 服务端安装已全部完成。

### 补充

我们可能会发现，在某些系统下，在添加节点后，并在 VPS 上安装节点探针脚本时会出线安装失败的情况，这种情况我们需要修改一下默认的安装脚本，比较简单的解决方案是在 `sh ./mynq-install.sh` 前面加上 `ba` 即可。

例如

```bash
wget -q --no-check-certificate -O mynq-install.sh https://vps.12345.com/Script/Install/1C34CF16F5C54723A418AABBCCDDEEFF && sh ./mynq-install.sh
```

修改为

```bash
wget -q --no-check-certificate -O mynq-install.sh https://vps.12345.com/Script/Install/1C34CF16F5C54723A418AABBCCDDEEFF && bash ./mynq-install.sh
```

一步到位解决方案：

查看 mynodequery 的容器 ID

```bash
docker ps
```

假如 `31de748b53f8` 为 mynodequery 的容器 ID（每个人都不一样）

进入容器

```bash
docker exec -it 31de748b53f8 /bin/sh
```

输入

```bash
vi /app/wwwroot/js/site.js
```

按 i 键进入编辑模式，找到第 1131 行和 1195 行，在 `sh` 前面加上 `ba` 。修改好后，输入 `:wq` 保存。

最后输入 `exit` 退出容器并重启容器

```bash
docker restart 31de748b53f8
```

此时，默认的节点脚本已经变更为 `bash ./mynq-install.sh`。

如果要卸载已安装在 VPS 上的探针，可以使用以下命令：

```bash
rm -rf /etc/mynodequery && (crontab -u mynodequery -l | grep -v "/etc/mynodequery/mynq-agent.sh") | crontab -u mynodequery - && userdel mynodequery
```

## 额外

类似的探针服务还有哪吒探针，详见哪吒官方教程:[https://nezha.wiki/guide/dashboard.html](https://nezha.wiki/guide/dashboard.html)