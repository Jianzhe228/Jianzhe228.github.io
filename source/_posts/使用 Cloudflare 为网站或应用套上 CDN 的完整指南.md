title: 使用 Cloudflare 为网站或应用套上 CDN 的完整指南
date: 2025-02-23 16:45:00
categories: 搞七捻三
tags: [cloudflare,cdn]
---
### **一、准备工作**

1. **拥有域名**
   确保你拥有一个已注册的域名（例如 `example.com`）。
2. **网站/服务器在线**
   源站（你的服务器）需能通过公网 IP 或域名访问，且运行正常。

---

### **二、配置 Cloudflare CDN 步骤**

#### **1. 注册 Cloudflare 账号**

- 访问 [Cloudflare 官网](https://www.cloudflare.com/)，注册并登录。

#### **2. 添加网站到 Cloudflare**

- 在控制台点击 **“Add a Site”**，输入你的域名（如 `example.com`），选择免费计划（Free Plan）。

#### **3. 修改域名 DNS 服务器**

- Cloudflare 会要求你将域名的 **DNS 服务器（Name Server）** 替换为 Cloudflare 提供的地址（例如 `alice.ns.cloudflare.com` 和 `bob.ns.cloudflare.com`）。
  - **操作位置**：在你的域名注册商（如 GoDaddy、阿里云）后台，找到域名管理 → 修改 DNS 服务器。

#### **4. 配置 DNS 解析记录**

- 在 Cloudflare 控制台的 **DNS 设置页**，添加一条A类记录：

  - **A 记录**：指向你的服务器 IP（源站 IP）。
  - **开启代理（Proxy Status）**：点击橙色云图标（启用 CDN 和防护）。

  > 例如：域名是www.example.com时，只需要在名称那里填写www,内容填写服务器的IPv4地址，然后选择代理模式
  >

#### **5. 设置源站信息**

- 在 **Cloudflare → SSL/TLS → Overview** 中，点击**配置**：

  - 选择 **Full (strict)** 模式（需源站配置有效 SSL 证书）。

    > 如果选择了 **Full (strict)**模式，可以在**Origin Server**中生成证书，点击Create Certificate,选择RSA(2048),选择有效期，点击生成即可
    >
  - 或选择 **Flexible** 模式（源站无需 SSL 证书，由 Cloudflare 提供加密）。

#### **6. 启用安全防护**

- 在 **Security → Settings** 中：
  - 开启 **DDoS 防护** 和 **Web Application Firewall (WAF)**。
  - 调整安全级别（如“Medium”或“High”）。

---

### **三、验证 CDN 是否生效**

1. **检查 DNS 解析**
   使用 `ping example.com`，若返回的 IP 是 Cloudflare 的 IP（如 `104.21.xx.xx`），说明 DNS 生效。[Cloudflare IP 列表](https://www.cloudflare.com/ips/)
2. **访问网站**
   通过浏览器访问网站，检查加载速度是否提升。

---

### 四、注意事项

1. 如果直接使用IP访问服务器，是没有CDN加速效果的
2. cloudflare家的优选IP或域名都是使用80或443端口的
3. 如果ssl开启的是完全严格模式，记得在源服务器上面配置证书，否则无法访问

### 五、**总结**


| 步骤               | 关键点                                          |
| :----------------- | :---------------------------------------------- |
| 1. 修改 DNS 服务器 | 将域名的 Name Server 改为 Cloudflare 提供的地址 |
| 2. 添加 DNS 记录   | 开启代理（橙色云图标），指向源站 IP 或域名      |
| 3. 配置 SSL/TLS    | 根据源站证书情况选择加密模式                    |
| 4. 启用安全防护    | 开启 WAF、DDoS 防护，限制恶意流量               |