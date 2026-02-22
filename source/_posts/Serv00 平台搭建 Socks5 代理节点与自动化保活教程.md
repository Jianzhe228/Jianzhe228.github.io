title: Serv00 平台搭建 Socks5 代理节点与自动化保活教程
date: 2025-02-23 16:43:00
categories: 搞七捻三
tags: [serv00,socks5]
---
> 该教程整合了以下几位大佬的教程
>
> 1. [CMLiussss](https://blog.cmliussss.com/):[Serv00/CT8：从注册到部署SOCKS5代理，一步到位自动续期保活教程，SOCKS5可用于edgetunnel解锁ChatGPT](https://blog.cmliussss.com/p/Serv00-Socks5/)
> 2. [hkfires](https://github.com/hkfires) : [Serv00服务器优雅的保活方案](https://github.com/hkfires/Keep-Serv00-Alive)
> 3. [秋风于渭水](https://www.tjsky.net/) : [用GitHub Actions 搭建网页状态监控系统 Upptime](https://www.tjsky.net/tutorial/444)

### 步骤1.申请端口

1. 登录你帐号对应的 panel 面板
2. 面板左侧 > `Port reservation` > 选择 `Add port` 标签栏 > 勾选 `Random` > `＋Add`

![PixPin_2025-01-26_16-32-12.webp][1]

选择 `Port list` 标签栏 > 记录你分配到的**TCP端口号**

![PixPin_2025-01-26_21-24-46.webp][2]

### 步骤2.开启管理执行权限

1. 登录你帐号对应的 panel 面板
2. 面板左侧 > 选择 `Run your own applications` 标签栏 > `Enabled` ; 使其**Status**变成 `✅Enabled`即可

![PixPin_2025-01-26_16-35-39.webp][3]

### 步骤3.执行一键安装Sock5节点脚本

使用ssh连接serv00,执行以下脚本

```bash
bash <(curl -s https://raw.githubusercontent.com/cmliu/socks5-for-serv00/main/install-socks5.sh)
```

注意：在输入socks5端口号时，输入**申请端口**时记录的**TCP端口号**即可，其余参数可以自行输入任意内容；(如果不清楚nezha-agent等内容，照着填就行)，由于本教程没有用到`crontab`，可以不添加 crontab 守护进程的计划任务。

![PixPin_2025-01-26_16-38-07.webp][4]

### 步骤4：创建域名

- 登录Serv00面板，删除注册后自带的网站

![PixPin_2025-01-26_16-46-38.webp][5]

- 点击Delete(purge website files)清空网站文件

![PixPin_2025-01-26_16-49-23.webp][6]

- 创建新网站，域名填写你想用的域名，我这里使用的是注册时自带的，网站类型设置为Node.js，程序版本选择NOde.js v22.4.1（你的版本可能更高，选择最新的即可）
  ![PixPin_2025-01-26_16-52-12.webp][7]

### 步骤5：配置nodejs启动Sock5代理进程

- SSH登录Serv00，输入`cd domains/你的网站域名/public_nodejs/`
- 由于Serv00的Apache设置的是静态优先，因而此处public文件夹下不能有index.html，否则会显示静态页面，而不会执行nodejs程序，我选择的是直接将public改名为static，执行`mv public static`
- 执行`npm22 install express`

![PixPin_2025-01-26_16-53-21.webp][8]

- 在`/home/你的用户名/domains/你的网站域名/public_nodejs`目录下创建以下`app.js`文件并修改app.js的第7行，填写你自己的Serv00用户名.

  ```bash
  const express = require("express");
  const path = require("path");
  const exec = require("child_process").exec;
  const app = express();
  const port = 3000;

  const user = "Serv00登录用户名"; //此处修改为Serv00的用户名
  const pName = "s5";

  app.use(express.static(path.join(__dirname, 'static')));

  function keepWebAlive() {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString();
    const formattedTime = currentDate.toLocaleTimeString();

    exec(`pgrep -laf ${pName}`, (err, stdout) => {
      const Process = `/home/${user}/.${pName}/${pName} -c /home/${user}/.${pName}/config.json`;

      if (stdout.includes(Process)) {
        console.log(`${formattedDate}, ${formattedTime}: Web Running`);
      } else {
        exec(`nohup ${Process} >/dev/null 2>&1 &`, (err) => {
          if (err) {
            console.log(`${formattedDate}, ${formattedTime}: Keep alive error: ${err}`);
          } else {
            console.log(`${formattedDate}, ${formattedTime}: Keep alive success!`);
          }
        });
      }
    });
  }

  setInterval(keepWebAlive, 10 * 1000);

  app.listen(port, () => {
    console.log(`Server is listening on port ${port}!`);
  });
  ```

  修改完成后public_nodejs目录下应该和我一样

![PixPin_2025-01-26_16-56-22.webp][9]

- 自此部署完成,用浏览器输入一下你创建的网站域名，正常就能看到默认的页面

![PixPin_2025-01-26_16-59-28.webp][10]

- 页面能够正常显示，返回SSH终端，输入`ps aux`可以看到新开了nodejs进程，稍带片刻，就能看到你的代理进程成功启动了

  ![PixPin_2025-01-26_17-00-17.webp][11]
- Nodejs程序运行日志可以通过面板网站的log中查看，也可以在SSH终端里查看，日志文件的完整路径为/home/你的用户名/domains/你的网站域名/logs/error.log

> SOCKS代理进程由Nodejs进程负责保活，10秒钟检查一次，因此后续只需要关注Nodejs进程的保活就可以了,`Nodejs`进程的保活可以手动访问网站进行，也可以通过自动化方案监控网站进行

### 步骤六：配置[upptime](https://github.com/upptime/upptime)自动化网页监控网站

> [upptime](https://github.com/upptime/upptime)自动化网页监控网站不需要有服务器，只需要有Github账号就能够进行部署

1. 访问 [Upptime](https://www.tjsky.net/goto/?url=https://github.com/upptime/upptime) 项目
2. 点击 【Use this template】按钮
   ![PixPin_2025-01-26_17-10-06.webp][12]

   > **注意：这是个模版项目，所以不要像常见的项目那样，去直接点右上角的fork。**
   >
3. 创建repo

![PixPin_2025-01-26_17-11-30.webp][13]

- 输入 Repository name（比如upptime）
- 勾选 【Include all branches】
- 点击 【Create repository from temple】

4. 配置upptime仓库

![PixPin_2025-01-26_17-13-29.webp][14]

- 进入你刚才repo到自己账号下的项目
- 点右上角的 【Settings】
- 在左侧 【Code and automation】 下找到 【Pages】
- 将 【Branch】 设置为 【gh-pages】
- 点击 【Save】

5. 给 Upptime-bot 设置 Repository Secret

   > 因为这个项目是利用bot实现自动化提交，需要给予bot，commit和publish的权限，所以我们需要设定一个`Personal Access Token`
   >

   1. 点击网页右上角自己的头像，点 【Settings】
   2. 点击左侧最下方的【Developer settings】
   3. 点击左侧下方的【Personal access tokens】 ，点击左上角的 【Generate new token】
   4. 点击 【tokens (classic)】->【Generate new token】->【Generate new token (classic)】

      1. Note: upptime
      2. Select scopes:勾选【repo】和【workflow】（你直接勾workflow，repo就全勾上了）
      3. Expiration：选【No expiration】（无期限）
      4. 点击页面最下方的 【Generate token】

   ![PixPin_2025-01-26_17-19-05.webp][15]
6. 复制token,注意一定要在这里复制好，错过这个页面你就再也看不到token了
7. 返回你repo的Upptime项目。点击 【Settings】，展开左侧的【Secrets】，点击【Actions 】 点击【 New repository secret】

![PixPin_2025-01-26_17-20-24.webp][16]

7. 给bot设定token

- Name: GH_PAT
- Value: 上边第5步里复制的 token
- 点击 【Add secret】

8. 回到你repo的upptime项目，点击【Code】，点击 【.upptimerc.yml】,修改.upptimerc.yml的内容

- 按照以下模版修改文件

        ```yaml
        # 【】以及其中的内容，为说明文字，需要替换为你自己的设置。
        # 『』以及其中的内容，为示例参数，需要替换为你自己的设置。

        #你的GitHub username 
        owner: 【你的 GitHub username】『tjsky』

        #你的GitHub repo name 
        repo: 【你的 repo name】『upptime』


        #下边写的时候一定注意代码的缩进让，“-” 都在同一个竖线上，“name”和“url”也都在同一个竖线上，层次不齐的代码高几率直接报错
        sites:
          - name: 【要监控的第一个网页的名称】『Google』
            url: 【要监控的第一个网页的域名】『https://www.google.com』
          - name: 【要监控的第二个网页的名称】『Wikipedia』
            url: 【要监控的而网页的域名】『https://en.wikipedia.org』



        # A-如果你的监控控制台页面，打算使用github的默认域名，则使用如下设置。和下边B设置互斥，请二选一
        status-website: 
          baseUrl: 【/你的 repo name】『/upptime』

        # B-如果你的监控控制台页面，打算使用自己所有的域名，则使用如下设置，和上边A设置互斥，请二选一
        status-website: 
          cname: 【你的域名】『upptime.tjsky.net』

        #自定义状态页面的navbar名称与链接
          logoUrl: 【控制台网页logo地址】『https://raw.githubusercontent.com/upptime/upptime.js.org/master/static/img/icon.svg』
          name:【控制台网页名字】 『Upptime』
          introTitle: 【网页标题】『这里可以随便写的啦，比如写：这是使用upptime构建的开源网页状态监控页』
          introMessage: 【网页简介】『这里可以随便写的啦』
          navbar:
            - title: Status
              href: /
            - title: GitHub
              href: https://github.com/OWNER/REPO

        ```

  - 例如：

          ```yaml
          # Change these first
          owner: makabaka # Your GitHub organization or username, where this repository lives
          repo: serv00-keep # The name of this repository

          sites:
            - name: serv00
              url: https://abc.serv00.net
            - name: serv00
              url: https://edf.serv00.net

          status-website:
            # Add your custom domain name, or remove the `cname` line if you don't have a domain
            # Uncomment the `baseUrl` line if you don't have a custom domain and add your repo name there
            # cname: demo.upptime.js.org
            baseUrl: /serv00-keep

            logoUrl: https://raw.githubusercontent.com/upptime/upptime.js.org/master/static/img/icon.svg
            name: Upptime
            introTitle: serv00-keep
            introMessage: serv00 保活
            navbar:
              - title: Status
                href: /
              - title: GitHub
                href: https://github.com/$OWNER/$REPO
          ```
  9. 修改完成后在点击页面最下的【Commit changes】按钮，提交修改。
  10. 启动GitHub Actions

  ![PixPin_2025-01-26_17-27-09.webp][17]

  > 一般情况下，在你修改.upptimerc.yml后，Actions就会自动开始运行。你会看到一个黄圈圈在转。运行成功会显示绿色的勾，运行失败会显示红色的叉。如果出现红叉，一般都是你修改yml文件时，什么地方写错了，比如少打了一个字母啊，空格漏了啊，代码对齐有问题，少写了什么必须设置的参数，什么参数设置错误了。请仔细检查。
  >

  11. 访问监控状态页面

  ![PixPin_2025-01-26_17-30-10.webp][18]

  1. 进入你刚才repo到自己账号下的项目
  2. 点右上角的 【Settings】
  3. 在左侧 【Code and automation】 下找到 【Pages】
  4. `Your site is live at XXXXXX`这里就是你的监控状态页面啦
  5. Active Incidents 显示目前的异常事件，Live Status 显示目前监控状态，Past Incidents 显示过去的异常事件

  > 实际上就是在你的repo仓库页面
  >

  ![PixPin_2025-01-26_17-31-14.webp][19]

  12. 汉化配置页,把如下内容粘贴到.upptimerc.yml的最后

          ```yaml
          i18n:
            activeIncidents: 活动事件
            allSystemsOperational: 所有系统都可以正常运行
            incidentReport: "事件 #NUMBER 报告 →"
            activeIncidentSummary: 在DATE 打开，有 POSTS 个帖子
            incidentTitle: 事件NUMBER 的详细信息
            incidentDetails: 事件详细信息
            incidentFixed: 已修复
            incidentOngoing: 正在进行
            incidentOpenedAt: 开始于
            incidentClosedAt: 结束于
            incidentSubscribe: 订阅更新
            incidentViewOnGitHub: 在 GitHub 上查看
            incidentCommentSummary: 由 AUTHOR 在DATE 发布
            incidentBack: ← 返回所有事件
            pastIncidents: 过去的事件
            pastIncidentsResolved: POSTS 个问题在MINUTES 分钟内得到解决
            liveStatus: 实时状态
            overallUptime: "总体正常运行时间： UPTIME"
            overallUptimeTitle: 总体正常运行时间
            averageResponseTime: "平均响应时间:TIMEms"
            averageResponseTimeTitle: 平均响应时间
            sevelDayResponseTime: 7 天响应时间
            responseTimeMs: 响应时间（毫秒）
            ms: 毫秒
            loading: 加载中
            navGitHub: GitHub
            footer: gd1214b保留所有权利。 Copyright © 2021 gd1214b. All Rights Reserved.
            rateLimitExceededTitle: 超出速率限制
            rateLimitExceededIntro: 您已超过一小时内可以执行的请求数，因此您必须等待才能再次访问此网站。或者，您可以添加 GitHub 个人访问令牌以继续使用本网站。
            rateLimitExceededWhatDoesErrorMean: 这个错误是什么意思？本网站使用 GitHub API 访问有关我们网站状态的实时数据。默认情况下，GitHub 允许每个 IP 地址每小时 60 个请求，您已经消耗了这些请求。
            rateLimitExceededErrorHowCanFix: 我该如何解决？
            rateLimitExceededErrorFix: 您可以再等一个小时，您的 IP 地址限制将恢复。或者，您可以添加您的 GitHub 个人访问令牌，这将为您提供每小时额外 5,000 个请求。
            rateLimitExceededGeneratePAT: 了解如何生成个人访问令牌
            rateLimitExceededHasSet: 您有一个个人访问令牌集。
            rateLimitExceededRemoveToken: 删除令牌
            rateLimitExceededGitHubPAT: GitHub 个人访问令牌
            rateLimitExceededCopyPastePAT: 复制并粘贴您的令牌
            rateLimitExceededSaveToken: 保存令牌
            errorTitle: 发生错误
            errorIntro: 尝试获取最新状态详细信息时出错。
            errorText: 您可以稍后再试。
            errorHome: 转到主页
            pastScheduledMaintenance: 过去的预定维护
            scheduledMaintenance: 定期维护
            scheduledMaintenanceSummaryStarted: 从 DATE 开始，持续DURATION 分钟
            scheduledMaintenanceSummaryStarts: 从 DATE 开始，持续DURATION 分钟
            startedAt: 开始在
            startsAt: 开始于
            duration: 持续时间
            durationMin: $DURATION 分钟
            incidentCompleted: 已完成
            incidentScheduled: 已预定
            url: "链接"
            status: "状态"
            history: "历史"
            responseTime: "响应时间"
            uptime: "正常运行时间"
            up: "? 正常运行"
            degraded: "? 运行缓慢"
            down: "? 停机"
            responseTimeGraphAlt: "响应时间图像"
            responseTimeDay: "24 小时响应时间"
            responseTimeWeek: "7 天正常运行时间"
            responseTimeMonth: "30天的正常运行时间"
            responseTimeYear: "1年的正常运行时间"
            uptimeDay: "24 小时正常运行时间"
            uptimeWeek: "7 天正常运行时间"
            uptimeMonth: "30天的正常运行时间"
            uptimeYear: "1年的正常运行时间"
            liveStatusHtmlComment: "<！ -实时状态- >"
            degradedPerformance: "? 性能降低"
            completeOutage: "? 全部停机"
            partialOutage: "? 部分停机"
          ```
  至此，全部教程结束，再次感谢几位大佬！

  [1]: https://images.228610.xyz/2025/02/1081792284.webp
  [2]: https://images.228610.xyz/2025/02/679637afbd4b4.webp
  [3]: https://images.228610.xyz/2025/02/67963460e01f0.webp
  [4]: https://images.228610.xyz/2025/02/679634a0d46ad.webp
  [5]: https://images.228610.xyz/2025/02/679634d564f32.webp
  [6]: https://images.228610.xyz/2025/02/67963509512b5.webp
  [7]: https://images.228610.xyz/2025/02/6796352719cd6.webp
  [8]: https://images.228610.xyz/2025/02/6796359145849.webp
  [9]: https://images.228610.xyz/2025/02/679635aeb6704.webp
  [10]: https://images.228610.xyz/2025/02/679635cc53cca.webp
  [11]: https://images.228610.xyz/2025/02/679635e4f1ea3.webp
  [12]: https://images.228610.xyz/2025/02/679636096e2ff.webp
  [13]: https://images.228610.xyz/2025/02/6796363479ebd.webp
  [14]: https://images.228610.xyz/2025/02/67963648de3f4.webp
  [15]: https://images.228610.xyz/2025/02/67963688b4ecc.webp
  [16]: https://images.228610.xyz/2025/02/679636a08e88c.webp
  [17]: https://images.228610.xyz/2025/02/679636d8a7b23.webp
  [18]: https://images.228610.xyz/2025/02/679636f17db28.webp
  [19]: https://images.228610.xyz/2025/02/67963709b58da.webp