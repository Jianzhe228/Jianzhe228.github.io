title: CentOS C++环境搭建
date: 2025-07-29 07:39:00
categories: 开发调优
tags: [C++,CentOS]
---
### 一、配置编译套件

百度网盘：[devtoolset-11](通过网盘分享的文件：devtoolset-11_0717.tar.gz
链接: https://pan.baidu.com/s/1w9GIWchuaBNbjeJrusrbSQ?pwd=0228 提取码: 0228 
--来自百度网盘超级会员v4的分享)

下载后执行如下命令：

```cpp
cp devtoolset-11_0717.tar.gz /opt/rh/
cd /opt/rh/
tar -zxvf devtoolset-11_0717.tar.gz
```

这样就配置好了，如果要激活环境，可以使用如下命令（每次使用都要激活）

```cpp
source /opt/rh/devtoolset-11/enable
或者
scl enable devtoolset-11 bash
```

如果觉得麻烦，可以添加到环境变量，以后都不需要手动激活（不建议，貌似会把环境搞乱）

```cpp
vim ~/.bashrc
#添加如下命令 
source /opt/rh/devtoolset-11/enable
g++ --version
```

> 注意，如果没有添加到环境变量，使用vscode进行ssh连接时，cmake插件是查询不到devtoolset-11里面的编译套件的！

百度网盘：[devtoolset-12](通过网盘分享的文件：devtoolset-12.tar.gz
链接: https://pan.baidu.com/s/1p7hJgtuKmDqHvtM2elAx6A?pwd=0228 提取码: 0228 
--来自百度网盘超级会员v4的分享)，如果这个不行，可以通过 如下方式获取，添加软件源到`/etc/yum.repos.d/CentOS-Base.repo`

```cpp
[copr:copr.fedorainfracloud.org:mlampe:devtoolset-12]
name=Copr repo for devtoolset-12 owned by mlampe
baseurl=https://download.copr.fedorainfracloud.org/results/mlampe/devtoolset-12/epel-7-$basearch/
type=rpm-md
skip_if_unavailable=True
gpgcheck=1
gpgkey=https://download.copr.fedorainfracloud.org/results/mlampe/devtoolset-12/pubkey.gpg
repo_gpgcheck=0
enabled=1
enabled_metadata=1
```

然后通过如下命令下载

```cpp
yum install devtoolset-12
```

### 二、cmake安装

百度网盘：[cmake 3.28](通过网盘分享的文件：cmake-3.28.0-linux-x86_64.tar.gz
链接: https://pan.baidu.com/s/1cVjYv8z3n-uWDzl1bBitig?pwd=0228 提取码: 0228 
--来自百度网盘超级会员v4的分享)

下载后执行如下命令

```cpp
tar -zxvf cmake-3.28.0-linux-x86_64.tar.gz
cd cmake-3.28.0-linux-x86_64
sudo cp -r /root/tools/cmake-3.28.0-linux-x86_64/bin/*   /usr/local/bin/
sudo cp -r /root/tools/cmake-3.28.0-linux-x86_64/share/cmake-3.28 /usr/local/share/
cmake --version
```

> 其他版本见：https://cmake.org/files/

### 三、clangd安装

采用`conda`安装clangd

```cpp
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh 
bash Miniconda3-latest-Linux-x86_64.sh
source ~/.bashrc
conda install -c conda-forge clang clangxx clang-tools
clangd --version
```

