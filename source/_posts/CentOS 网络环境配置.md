title: CentOS 网络环境配置
date: 2025-07-29 07:40:23
categories: 开发调优
tags: [CentOS]
---
### 一、配置静态IP

修改`Address`,`Netmask`,`Gateway`,`DNS`,修改后点击Apply并重启网络

![image-20250719140135106](https://images.228610.xyz/2025/07/b258f72206c11b08f34b73d84c77c00f.png)

### 二、代理环境

软件下载：[clash for windows linux](https://d.lefly.cloud/clash/Clash.for.Windows-0.20.39-x64-linux.tar.gz)

![image-20250719160231349](https://images.228610.xyz/2025/07/3517a4756227904ad5e4ad99add67de6.webp)

如果是root用户，需要添加`--no-sandbox`运行

```cpp
./cfw --no-sandbox
```

添加环境

```cpp
vim ~/.bashrc
# 添加如下信息
export http_proxy="http://127.0.0.1:7890"
export https_proxy="http://127.0.0.1:7890"
export HTTP_PR0XY="http://127.0.0.1:7890"
export HTTPS_PR0XY="http://127.0.0.1:7890"
export no_proxy="localhost,127.0.0.1""
source ~/.bashrc
    
sudo vim /etc/profile
export http_proxy="http://127.0.0.1:7890"
export https_proxy="http://127.0.0.1:7890"
export HTTP_PR0XY="http://127.0.0.1:7890"
export HTTPS_PR0XY="http://127.0.0.1:7890"
export no_proxy="localhost,127.0.0.1""
source /etc/profile
    
vim /etc/environment
export http_proxy="http://127.0.0.1:7890"
export https_proxy="http://127.0.0.1:7890"
export HTTP_PR0XY="http://127.0.0.1:7890"
export HTTPS_PR0XY="http://127.0.0.1:7890"
export no_proxy="localhost,127.0.0.1""
source /etc/environment
    
sudo vim /etc/yum.conf
export http_proxy="http://127.0.0.1:7890"
export https_proxy="http://127.0.0.1:7890"
export HTTP_PR0XY="http://127.0.0.1:7890"
export HTTPS_PR0XY="http://127.0.0.1:7890"
export no_proxy="localhost,127.0.0.1""
    
sudo vim /etc/wgetrc
http_proxy = http://127.0.0.1:7890
https_proxy = http://127.0.0.1:7890
HTTP_PR0XY = http://127.0.0.1:7890
HTTPS_PR0XY = http://127.0.0.1:7890
no_proxy = localhost,127.0.0.1
    
curl -I http://www.baidu.com
```

一键脚本：

```cpp
#!/bin/bash
# =================================================================
# 一键为 CentOS 设置/取消 127.0.0.1:7890 代理 (优化版)
# 用法：
#   sudo ./set_proxy.sh on      # 启用代理
#   sudo ./set_proxy.sh off     # 关闭代理
# =================================================================

# --- 配置区 ---
PROXY_URL="http://127.0.0.1:7890"
NO_PROXY="localhost,127.0.0.1,::1,192.168.0.0/16,10.0.0.0/8"

# --- 标记，用于安全地添加和删除配置 ---
BEGIN_MARKER="# BEGIN PROXY CONFIG - Managed by script"
END_MARKER="# END PROXY CONFIG - Managed by script"

# --- 获取真正的用户家目录 ---
# 如果是通过 sudo 执行，SUDO_USER 变量会包含原用户名
if [[ -n "$SUDO_USER" ]]; then
    USER_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
else
    # 如果是 root 直接执行，则使用 root 的家目录
    USER_HOME=$HOME
fi

# 需要写入的环境变量文件列表
# 注意：/etc/environment 的语法和其他文件不同，没有 export
declare -a ENV_FILES=("$USER_HOME/.bashrc" "/etc/profile")
ENV_FILE_SYSTEM="/etc/environment"

# --- 函数定义 ---

# 安全地写入或清除代理配置
handle_proxy_files() {
    local action="$1"
    
    # 构造配置内容
    local proxy_content_export="
export http_proxy=\"$PROXY_URL\"
export https_proxy=\"$PROXY_URL\"
export HTTP_PROXY=\"$PROXY_URL\"
export HTTPS_PROXY=\"$PROXY_URL\"
export no_proxy=\"$NO_PROXY\"
export NO_PROXY=\"$NO_PROXY\""

    local proxy_content_plain="
http_proxy=\"$PROXY_URL\"
https_proxy=\"$PROXY_URL\"
HTTP_PROXY=\"$PROXY_URL\"
HTTPS_PROXY=\"$PROXY_URL\"
no_proxy=\"$NO_PROXY\"
NO_PROXY=\"$NO_PROXY\""

    # 清理函数：使用标记来精确删除
    clear_proxy() {
        local file="$1"
        if [ -f "$file" ]; then
            # 使用 sed 删除从 BEGIN_MARKER 到 END_MARKER 之间的所有行
            sed -i "/^${BEGIN_MARKER}$/,/^${END_MARKER}$/d" "$file"
        fi
    }
    
    # 写入函数
    write_proxy() {
        local file="$1"
        local content="$2"
        # 写入前先清理，防止重复
        clear_proxy "$file"
        # 使用 cat 和 EOF 来写入整个块
        cat >> "$file" <<EOF

${BEGIN_MARKER}
${content}
${END_MARKER}
EOF
    }

    # 遍历文件列表进行操作
    for f in "${ENV_FILES[@]}"; do
        if [[ "$action" == "on" ]]; then
            write_proxy "$f" "$proxy_content_export"
        else
            clear_proxy "$f"
        fi
    done
    
    # 单独处理 /etc/environment
    if [[ "$action" == "on" ]]; then
        write_proxy "$ENV_FILE_SYSTEM" "$proxy_content_plain"
    else
        clear_proxy "$ENV_FILE_SYSTEM"
    fi
}

# YUM/DNF 配置
handle_package_manager() {
    local conf_file="/etc/yum.conf"
    if [ ! -f "$conf_file" ]; then
        conf_file="/etc/dnf/dnf.conf" # 兼容新的 CentOS/RHEL
    fi

    # 先删除旧的 proxy 设置行，避免重复
    sed -i '/^proxy=/d' "$conf_file"
    
    if [[ "$1" == "on" ]]; then
        # 在 [main] 部分追加配置
        # 如果[main]不存在，则直接追加到文件末尾
        if grep -q "\[main\]" "$conf_file"; then
             sed -i "/\[main\]/a proxy=$PROXY_URL" "$conf_file"
        else
             echo "proxy=$PROXY_URL" >> "$conf_file"
        fi
    fi
}

# --- 主流程 ---
case "$1" in
    on)
        echo ">>> 正在为系统配置代理: $PROXY_URL"
        handle_proxy_files on
        handle_package_manager on
        echo ">>> 代理配置写入成功！"
        echo
        echo "========================= 重要提示 ========================="
        echo "请执行以下命令使配置在当前终端立即生效:"
        echo "  source ${USER_HOME}/.bashrc"
        echo "或者，请重新打开一个新的终端窗口。"
        echo "=========================================================="
        ;;
    off)
        echo ">>> 正在清除系统代理配置..."
        handle_proxy_files off
        handle_package_manager off
        echo ">>> 代理配置已清除！"
        echo
        echo "========================= 重要提示 ========================="
        echo "请执行以下命令使变更在当前终端立即生效:"
        echo "  source ${USER_HOME}/.bashrc"
        echo "或者，请重新打开一个新的终端窗口。"
        echo "=========================================================="
        ;;
    *)
        echo "用法: sudo $0 {on|off}"
        exit 1
        ;;
esac

exit 0
```

使用方法
1. 把脚本保存为  set_proxy.sh ，并赋予可执行权限

  ```cpp
  chmod +x set_proxy.sh
  ```

2. 启用代理

  ```cpp
  sudo ./set_proxy.sh on
  ```

3. 关闭代理

  ```cpp
  sudo ./set_proxy.sh off
  ```

  