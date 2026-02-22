title: mvnd安装和配置
date: 2025-11-24 14:11:07
categories: 开发调优
tags: [mvnd]
---
## 一、mvnd 安装

### 方法 1：通过 SDKMAN（推荐）

```bash
curl -s "https://get.sdkman.io" | bash
source ~/.sdkman/bin/sdkman-init.sh
sdk install mvnd
```

验证版本：

```bash
mvnd -v
```

### 方法 2：手动安装（备选）

到 Apache 官方下载 mvnd：

```bash
wget https://downloads.apache.org/maven/mvnd/latest/mvnd-1.0.3-linux-amd64.zip
unzip mvnd-1.0.3-linux-amd64.zip -d ~/mvnd
export PATH=~/mvnd/bin:$PATH
```

验证：

```bash
mvnd -v
```

------

## 三、环境变量

mvnd 对 Java 路径十分严格，必须设置正确的 JAVA_HOME。

### 正确示例：

```
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
PATH=$JAVA_HOME/bin:$PATH
```

将其加入 `~/.bashrc`：

```bash
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

验证：

```bash
echo $JAVA_HOME
which java
```

------

## 四、配置 Maven 镜像（mvnd 与 mvn 共用）

编辑 `~/.m2/settings.xml`：

```xml
<settings>
  <mirrors>
    <mirror>
      <id>aliyunmaven</id>
      <mirrorOf>*</mirrorOf>
      <name>Aliyun Maven</name>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>
</settings>
```

验证镜像生效：

```bash
mvnd help:effective-settings
```

看到 aliyun URL 即成功。