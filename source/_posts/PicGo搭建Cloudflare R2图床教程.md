title: PicGo搭建Cloudflare R2图床教程
date: 2025-02-23 16:43:00
categories: 搞七捻三
tags: [cloudflare,PicGo]
---
### 1、创建R2存储

- 创建R2对象存储，如下图：我是绑定了PayPal，账单邮寄地址不需要真实地址，你也可以填写真实地址

![PixPin_2025-02-23_10-36-31](https://images.228610.xyz/2025/02/672a348f96e1a7cf2f4fd395931dbaa1.webp)

- 点击创建存储桶

![PixPin_2025-02-23_10-44-28](https://images.228610.xyz/2025/02/5f21680f8860beefba72525e94e88194.webp)

随便填写一个桶名，位置自行填写，这里我就是使用自动分配了，任何点击 `创建存储桶`

![PixPin_2025-02-23_10-45-24](https://images.228610.xyz/2025/02/4230d21681b7f31041242ed5aae4a849.webp)

点击设置

![c3c40cd0aa1923bb5908f2df1c1d07a2](https://images.228610.xyz/2025/02/3b0383f27ca87d235ce4ccb5f18eb846.webp)

点击`连接域`添加自定义域，假设我有一个example.com域名，这里就填写`images.example.com`

![PixPin_2025-02-23_10-48-38](https://images.228610.xyz/2025/02/24ae031b019b4b50a2eac8aa41e36922.webp)

填写域名后点击`继续`，再点击`连接域`，状态变为`活动`表明成功添加自定义域，如果不更新，刷新一下页面

![PixPin_2025-02-23_10-55-23](https://images.228610.xyz/2025/02/3d28d23fa7d3fdae1c58b86f74a71fad.webp)

然后划到下面，删除`对象生命周期规则`的规则，点击删除

![PixPin_2025-02-23_10-58-31](https://images.228610.xyz/2025/02/16f183628f75c0b3e06c6b36226acf9b.webp)

### 2、配置PicGo

- PicGo官网下载连接：https://github.com/Molunerfinn/picgo/releases

  > 注意：[2.3.1](https://github.com/Molunerfinn/PicGo/releases/tag/v2.3.1)这个版本好像无法搜索插件？我是直接下载了最新的[2.4.0-beta.9](https://github.com/Molunerfinn/PicGo/releases/tag/v2.4.0-beta.9)测试版本
  >
- 安装s3插件，点击搜索`s3`即可安装，这里还推荐几个插件，如下图的`tinypng`和`webp`

  - `tinypng`:压缩图片
  - `webp`:将图片格式转换为webp

  经过测试，发现现执行`webp`转换格式再执行`tinypng`压缩图片

![PixPin_2025-02-23_11-06-35](https://images.228610.xyz/2025/02/05f5f47fc0c454e9807772ef87a5aec9.webp)

- 配置图床

返回cloudflare R2页面，点击`管理API令牌`，再点击`创建API令牌`

![PixPin_2025-02-23_11-18-01](https://images.228610.xyz/2025/02/f82d9e8a24f6569dcfd48ede5b8de16f.webp)

令牌名称随意，指定存储桶为我们创建的存储桶，然后滑到底部点击`创建API令牌`,然后不要退出cloudflare页面，后面要用

![PixPin_2025-02-23_11-19-39](https://images.228610.xyz/2025/02/392edaaf74a05768eaffc1a4b6b0fb06.webp)

返回PicGo,点击Amazon S3配置图床信息

1. 应用密钥ID就是创建令牌得到的：`访问密钥 ID`（Access Key ID）
2. 应用密钥：填写`机密访问密钥`（Secret Access Key）
3. 桶名填写 R2 中创建的 `Bucket 名称`，如创建R2的桶的名字 `images`
4. 自定义节点:填写`为 S3 客户端使用管辖权地特定的终结点`

![PixPin_2025-02-23_11-16-08](https://images.228610.xyz/2025/02/e75e9f3caad7ead36cb75f1516521488.webp)

代理自行填写，自定义输出URL模板填写你自己的域名，上面我们创建时使用的是：`images.example.com`

![PixPin_2025-02-23_11-28-58](https://images.228610.xyz/2025/02/878a45cef43194d5b68d649d35eb8179.webp)

然后点击底部的`确定`即可完成图床搭建。

### 3、其他

- 配置缓存，打开cloudflare,进入你自己的域名，点击`缓存`，点击`Cache Rules`，创建一条规则

![PixPin_2025-02-23_11-37-36](https://images.228610.xyz/2025/02/a49743b04086f65a1dfc19867cc0eb63.webp)

配置自行填写：

1. 边缘 TTL：一个月
2. 浏览器 TTL：8小时

然后点击保存

![PixPin_2025-02-23_11-38-14](https://images.228610.xyz/2025/02/30b9ec6ea304e53b131b52abc259d579.webp)

- 创建压缩规则，根据情况填写相关规则即可，然后点击保存

![PixPin_2025-02-23_11-42-36](https://images.228610.xyz/2025/02/10c076e6ec5164fd88f6cefb6d444cbc.webp)

点击`规则`，点击`页面规则`，创建一个页面规则，点击`保存页面规则`

![PixPin_2025-02-23_11-47-09](https://images.228610.xyz/2025/02/4d67f03e3da14016e8074034b2a5e764.webp)