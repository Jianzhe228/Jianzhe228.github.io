title: "[转载] 如何在serv00部署自己的博客网站并且follow认证"
date: 2025-02-23 16:00:00
categories: 搞七捻三
tags: [serv00]
---
> From: paipai的博客
> Author: MuskZhou
> 原文链接：[如何在serv00部署自己的博客网站并且follow认证](https://blog.paipai.site/post/%E5%A6%82%E4%BD%95%E5%9C%A8serv00%E9%83%A8%E7%BD%B2%E8%87%AA%E5%B7%B1%E7%9A%84%E5%8D%9A%E5%AE%A2%E7%BD%91%E7%AB%99%E5%B9%B6%E4%B8%94follow%E8%AE%A4%E8%AF%81.html)

---

> 你需要准备的东西是：
>
> 1. 一个serv00账号
> 2. 一点点的电脑操作能力
> 3. 一个域名

### 一、登陆serv00并添加网站（无自己域名的请直接跳转到第二步）

1. 找到左侧菜单栏的WWW websites

![PixPin_2025-01-25_20-40-52.webp][1]

2. 找到add new websites，并且添加你自己的域名

![PixPin_2025-01-25_20-41-09.webp][2]

3. 点击DNS zones并找到自己刚刚的域名，点击域名右侧的edit查看解析

![PixPin_2025-01-25_20-41-24.webp][3]

4. 在服务商添加解析，以cf为例

![PixPin_2025-01-25_20-41-47.webp][4]

---

### 二、部署Typecho主程序

1. 选择左侧栏的file manager

![PixPin_2025-01-25_20-42-01.webp][5]

2. 根据提示红框处选择位置

![PixPin_2025-01-25_20-42-28.webp][6]

3. 删除public_html下原有文件并上传压缩包

![PixPin_2025-01-25_20-42-44.webp][7]

4. 选择explore后全选文件解压到public_html文件夹

![PixPin_2025-01-25_20-43-10.webp][8]

5. 访问域名确认部署成功，如显示如下则部署成功

![PixPin_2025-01-25_20-43-22.webp][9]

---

### 三、部署数据库

1. 选择左侧栏mysql，并添加数据库

![PixPin_2025-01-25_20-43-41.webp][10]

2. 输入相应信息并记住红框信息（连前面的m前缀也要记住），点击add
   ![PixPin_2025-01-25_20p][11]

---

### 四、运行Typecho安装程序

1. 数据库地址填写你的serv00面板地址，例如面板是panel10.serv00.com，数据库地址是mysql10.serv00.com。如果是panel1则对应mysql1

![PixPin_2025-01-25_20-44-01.webp][12]

2. 正常填写其他信息并选择开始安装

![PixPin_2025-01-25_20-44-12.webp][13]

3. 提示创建管理员时表示部署成功，输入信息并牢记

![PixPin_2025-01-25_20-44-22.webp][14]

---

### 五、添加到follow并认证

1. 访问博客主页

![PixPin_2025-01-25_20-44-32.webp][15]

2. 右键文章rss并复制链接

![PixPin_2025-01-25_20-44-44.webp][16]

3. 打开follow，未部署ssl证书时需将rss链接的https改为http

![PixPin_2025-01-25_20-44-54.webp][17]

4. 订阅成功后右键选择认证

![PixPin_2025-01-25_20-45-02.webp][18]

5. 登陆Typecho后台

![PixPin_2025-01-25_20-45-16.webp][19]

6. 选择撰写文章

![PixPin_2025-01-25_20-45-34.webp][20]

7. 输入认证内容，文章名随意，选择发布文章

![PixPin_2025-01-25_20-45-50.webp][21]

8. 回到follow选择认证即可完成

![PixPin_2025-01-25_20-46-00.webp][22]

9. 认证完成后可以删除该认证文章。

### 额外补充

在serv00上发布文章时，有时会报错`403 ngix error`,这是因为serv00有一个防火墙，相关链接如下：
[i got a 403 ngix error](https://forum.serv00.com/d/483-i-got-a-403-ngix-error)
[Web Application Firewall (WAF)](https://docs.serv00.com/WAF/)
如果觉得麻烦，可以直接关闭防火墙
步骤如下：
登录serv00管理后台,依次点击：
WWW websites ➡ Manage ➡ Details ➡ Web Application Firewall.选择`disable`即可关闭防火墙

[1]: https://images.guangyin.blog/2025/02/6794e0608cdff.webp
[2]: https://images.guangyin.blog/2025/02/6794e060ad286.webp
[3]: https://images.guangyin.blog/2025/02/6794e0608b79f.webp
[4]: https://images.guangyin.blog/2025/02/6794e060b9adb.webp
[5]: https://images.guangyin.blog/2025/02/6794e0606b99c.webp
[6]: https://images.guangyin.blog/2025/02/6794e06068a37.webp
[7]: https://images.guangyin.blog/2025/02/6794e060abf18.webp
[8]: https://images.guangyin.blog/2025/02/6794e060798f1.webp
[9]: https://images.guangyin.blog/2025/02/6794e06078184.webp
[10]: https://images.guangyin.blog/2025/02/6794e0606a56b.webp
[11]: https://images.guangyin.blog/2025/02/6794e060ae611.webp
[12]: https://images.guangyin.blog/2025/02/6794e0603980c.webp
[13]: https://images.guangyin.blog/2025/02/6794e0601124e.webp
[14]: https://images.guangyin.blog/2025/02/6794e0602a2d1.webp
[15]: https://images.guangyin.blog/2025/02/6794e060aa4d2.webp
[16]: https://images.guangyin.blog/2025/02/6794e0609575d.webp
[17]: https://images.guangyin.blog/2025/02/6794e0607e340.webp
[18]: https://images.guangyin.blog/2025/02/6794e0604615f.webp
[19]: https://images.guangyin.blog/2025/02/6794e06006c42.webp
[20]: https://images.guangyin.blog/2025/02/6794e0602daf3.webp
[21]: https://images.guangyin.blog/2025/02/6794e060721c3.webp
[22]: https://images.guangyin.blog/2025/02/6794e0609f058.webp
[23]: https://images.guangyin.blog/2025/02/6794e0609f058.webp