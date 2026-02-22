title: Hysteria2 一键搭建脚本
date: 2025-09-29 07:22:00
categories: 搞七捻三
tags: [hy]
---
### Hysteria2 centos一键 搭建脚本

创建 hysteria.sh脚本

```sh
#!/bin/bash
export LANG=en_US.UTF-8
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
PLAIN="\033[0m"

SCRIPT_PATH="$(readlink -f "$0")"

red(){
    echo -e "\033[31m\033[01m$1\033[0m"
}
green(){
    echo -e "\033[32m\033[01m$1\033[0m"
}
yellow(){
    echo -e "\033[33m\033[01m$1\033[0m"
}

[[ $EUID -ne 0 ]] && red "Notice: Please run this script as root" && exit 1

install_base_packages() {
    yellow "Checking and installing base dependencies..."
    
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update -qq
    elif command -v yum >/dev/null 2>&1; then
        yum makecache fast >/dev/null 2>&1
    fi
    
    if ! command -v curl >/dev/null 2>&1; then
        echo "Installing curl..."
        if command -v apt-get >/dev/null 2>&1; then
            apt-get install -y curl
        else
            yum install -y curl
        fi
    fi
    
    if ! command -v wget >/dev/null 2>&1; then
        echo "Installing wget..."
        if command -v apt-get >/dev/null 2>&1; then
            apt-get install -y wget
        else
            yum install -y wget
        fi
    fi
    
    if ! command -v systemctl >/dev/null 2>&1; then
        red "systemd is required but not installed; attempting to install..."
        if command -v apt-get >/dev/null 2>&1; then
            apt-get install -y systemd
        else
            yum install -y systemd
        fi
        
        if ! command -v systemctl >/dev/null 2>&1; then
            red "Failed to install systemd, exiting"
            exit 1
        fi
    fi
}

install_base_packages

detect_system() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [[ -f /etc/lsb-release ]]; then
        . /etc/lsb-release
        OS=$DISTRIB_ID
        OS_VERSION=$DISTRIB_RELEASE
    elif [[ -f /etc/redhat-release ]]; then
        OS="centos"
        OS_VERSION=$(rpm -q --qf "%{VERSION}" centos-release 2>/dev/null || echo "unknown")
    else
        OS="unknown"
    fi
    
    OS=$(echo "$OS" | tr '[:upper:]' '[:lower:]')
    
    case "$OS" in
        ubuntu|debian)
            SYSTEM="Ubuntu"
            PACKAGE_UPDATE="apt-get update -qq"
            PACKAGE_INSTALL="apt-get -y install"
            PACKAGE_REMOVE="apt-get -y remove"
            PACKAGE_UNINSTALL="apt-get -y autoremove"
            ;;
        centos|rhel|fedora|rocky|almalinux|alma)
            SYSTEM="CentOS"
            PACKAGE_UPDATE="yum -y update"
            PACKAGE_INSTALL="yum -y install"
            PACKAGE_REMOVE="yum -y remove"
            PACKAGE_UNINSTALL="yum -y autoremove"
            ;;
        *)
            red "Unsupported system: $OS"
            exit 1
            ;;
    esac
}

detect_system
green "Detected system: $SYSTEM ($OS $OS_VERSION)"

mkdir -p /etc/hysteria
mkdir -p /root/hy

realip(){
    ip=$(curl -s4m8 ip.sb -k) || ip=$(curl -s6m8 ip.sb -k)
    if [[ -z "$ip" ]]; then
        ip="Failed"
    fi
}

check_dependencies() {
    missing_deps=""
    
    for cmd in curl wget systemctl; do
        if ! command -v $cmd &>/dev/null; then
            missing_deps="$missing_deps $cmd"
        fi
    done
    
    if ! command -v iptables &>/dev/null; then
        missing_deps="$missing_deps iptables"
    fi
    
    if ! command -v ip6tables &>/dev/null; then
        missing_deps="$missing_deps ip6tables"
    fi
    
    if [[ -n "$missing_deps" ]]; then
        yellow "Missing required dependencies: $missing_deps"
        yellow "Attempting to install..."
        ${PACKAGE_UPDATE}
        ${PACKAGE_INSTALL} $missing_deps
    fi
    
    if [[ "$SYSTEM" == "Ubuntu" ]]; then
        for pkg in net-tools iproute2 openssl ca-certificates; do
            if ! dpkg -l | grep -q "^ii.*$pkg"; then
                yellow "Installing $pkg..."
                ${PACKAGE_INSTALL} $pkg
            fi
        done
    fi
}

save_iptables_rules() {
    if [[ "$SYSTEM" == "CentOS" ]]; then
        mkdir -p /etc/sysconfig
        iptables-save > /etc/sysconfig/iptables 2>/dev/null
        ip6tables-save > /etc/sysconfig/ip6tables 2>/dev/null
        if command -v systemctl &>/dev/null; then
            systemctl enable iptables 2>/dev/null || true
            systemctl enable ip6tables 2>/dev/null || true
        fi
    else
        if ! dpkg -l | grep -q "^ii.*iptables-persistent"; then
            yellow "Installing iptables-persistent..."
            echo iptables-persistent iptables-persistent/autosave_v4 boolean true | debconf-set-selections
            echo iptables-persistent iptables-persistent/autosave_v6 boolean true | debconf-set-selections
            DEBIAN_FRONTEND=noninteractive ${PACKAGE_INSTALL} iptables-persistent netfilter-persistent
        fi
        
        mkdir -p /etc/iptables
        iptables-save > /etc/iptables/rules.v4 2>/dev/null
        ip6tables-save > /etc/iptables/rules.v6 2>/dev/null
        
        if command -v netfilter-persistent &>/dev/null; then
            netfilter-persistent save >/dev/null 2>&1
            systemctl enable netfilter-persistent 2>/dev/null || true
        fi
    fi
    sync
}

# get Hysteria port
get_hysteria_port() {
    port=$(grep "^listen:" /etc/hysteria/config.yaml 2>/dev/null | grep -oP ':\K[0-9]+' | head -1)
    echo "${port:-0}"
}

# get Hysteria password
get_hysteria_password() {
    pwd=$(grep -A2 "^auth:" /etc/hysteria/config.yaml 2>/dev/null | grep "password:" | awk '{print $2}' | head -1)
    echo "$pwd"
}

# Get configuration info
get_config_info() {
    port=$(get_hysteria_port)
    auth_pwd=$(get_hysteria_password)
    
    # Fetch IP
    ip=$(curl -s4m8 ip.sb -k) || ip=$(curl -s6m8 ip.sb -k)
    [[ -n $(echo $ip | grep ":") ]] && last_ip="[$ip]" || last_ip=$ip
    
    # Read domain from persisted file
    if [[ -f /etc/hysteria/domain.txt ]]; then
        hy_domain=$(cat /etc/hysteria/domain.txt)
    else
        # If no saved domain, infer from cert path
        cert_path=$(grep "cert:" /etc/hysteria/config.yaml 2>/dev/null | awk '{print $2}')
        if [[ "$cert_path" == "/etc/hysteria/cert.crt" ]]; then
            hy_domain="www.bing.com"
        else
            # Default value
            hy_domain="www.bing.com"
        fi
        # Save to persisted file
        echo "$hy_domain" > /etc/hysteria/domain.txt
    fi
    
    # Check feature flags
    [[ -f /etc/hysteria/obfs.txt ]] && use_obfs=true && obfs_pwd=$(cat /etc/hysteria/obfs.txt) || use_obfs=false
    [[ -f /etc/hysteria/alpn.txt ]] && use_alpn=true && alpn_str=$(cat /etc/hysteria/alpn.txt) || use_alpn=false
    if [[ -f /etc/hysteria/bandwidth.txt ]]; then
        use_bandwidth=true
        bandwidth=$(cat /etc/hysteria/bandwidth.txt)
        up_mbps=$(echo $bandwidth | cut -d, -f1)
        down_mbps=$(echo $bandwidth | cut -d, -f2)
    else
        use_bandwidth=false
        up_mbps=0
        down_mbps=0
    fi
    
    if [[ -f /etc/hysteria/port_hopping.txt ]]; then
        port_range=$(cat /etc/hysteria/port_hopping.txt)
        firstport=$(echo $port_range | cut -d- -f1)
        endport=$(echo $port_range | cut -d- -f2)
    else
        port_range=""
        firstport=""
        endport=""
    fi
}

# Create iptables auto-restore service (improved)
create_iptables_service(){
    green "Creating iptables auto-restore service..."
    
    # Create dedicated rule-restore script
    cat > /etc/hysteria/restore-iptables.sh << 'EOF'
#!/bin/bash
# Clean old rules to avoid duplicates
iptables -t nat -D PREROUTING -p udp -m comment --comment "hysteria2" -j DNAT 2>/dev/null
ip6tables -t nat -D PREROUTING -p udp -m comment --comment "hysteria2" -j DNAT 2>/dev/null

if [ -f /etc/hysteria/port_hopping.txt ] && [ -f /etc/hysteria/config.yaml ]; then
    port_range=$(cat /etc/hysteria/port_hopping.txt)
    firstport=${port_range%-*}
    endport=${port_range#*-}
    # Robust port extraction
    port=$(grep "^listen:" /etc/hysteria/config.yaml | grep -oP ':\K[0-9]+' | head -1)
    
    if [ -n "$port" ] && [ -n "$firstport" ] && [ -n "$endport" ]; then
        iptables -t nat -A PREROUTING -p udp --dport $firstport:$endport -m comment --comment "hysteria2" -j DNAT --to-destination :$port
        ip6tables -t nat -A PREROUTING -p udp --dport $firstport:$endport -m comment --comment "hysteria2" -j DNAT --to-destination :$port
    fi
fi
EOF
    chmod +x /etc/hysteria/restore-iptables.sh
    
    # Create simplified systemd service
    cat > /etc/systemd/system/hysteria-iptables.service << 'EOF'
[Unit]
Description=Hysteria 2 Port Hopping iptables Rules
After=network.target
Before=hysteria-server.service

[Service]
Type=oneshot
ExecStart=/etc/hysteria/restore-iptables.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable hysteria-iptables.service
    green "iptables auto-restore service created"
    echo ""
    read -p "Press Enter to continue..." 
    return
}

# Create service dependency configuration
create_service_dependencies(){
    green "Configuring service dependencies..."
    
    mkdir -p /etc/systemd/system/hysteria-server.service.d
    cat > /etc/systemd/system/hysteria-server.service.d/override.conf << 'EOF'
[Unit]
After=network-online.target
Wants=network-online.target hysteria-iptables.service
Requires=network-online.target

[Service]
Restart=always
RestartSec=10s
LimitNOFILE=1000000
LimitNPROC=1000000
EOF
    
    systemctl daemon-reload
    green "Service dependency configuration complete"
    echo ""
    read -p "Press Enter to continue..." 
    return
}

# System optimization - focus on UDP/network (improved)
optimize_system(){
    green "Optimizing system network parameters (UDP/QUIC focus)..."
    
    # Check if already optimized
    if grep -q "# Hysteria 2 UDP/QUIC" /etc/sysctl.conf 2>/dev/null; then
        yellow "System already optimized. Re-apply optimizations? (y/N)"
        read -r reopt
        [[ "$reopt" != "y" && "$reopt" != "Y" ]] && return
    fi
    
    # Remove old optimization config if present
    sed -i '/# Hysteria 2 UDP\/QUIC/,/# End of Hysteria 2 optimization/d' /etc/sysctl.conf 2>/dev/null
    
    # UDP and QUIC tuning
    cat >> /etc/sysctl.conf << 'EOF'

# Hysteria 2 UDP/QUIC tuning
# UDP buffer tuning
net.core.rmem_max=134217728
net.core.wmem_max=134217728
net.core.rmem_default=65536
net.core.wmem_default=65536
net.core.netdev_max_backlog=4096
net.ipv4.udp_rmem_min=8192
net.ipv4.udp_wmem_min=8192

# Increase UDP buffers
net.ipv4.udp_mem=65536 131072 262144
net.unix.max_dgram_qlen=50

# IP forwarding
net.ipv4.ip_forward=1
net.ipv6.conf.all.forwarding=1

# Network tuning
net.ipv4.tcp_syncookies=1
net.ipv4.tcp_fin_timeout=30
net.ipv4.tcp_keepalive_time=1200
net.ipv4.ip_local_port_range=10000 65000
net.ipv4.tcp_max_syn_backlog=8192
net.ipv4.tcp_max_tw_buckets=5000
net.ipv4.tcp_mtu_probing=1

# ICMP/DoS hardening
net.ipv4.icmp_echo_ignore_all=0
net.ipv4.icmp_echo_ignore_broadcasts=1
net.ipv4.icmp_ignore_bogus_error_responses=1

# Connection limits
net.core.somaxconn=4096
net.netfilter.nf_conntrack_max=2000000
net.nf_conntrack_max=2000000

# QUIC-related settings
net.core.netdev_budget=600
net.core.netdev_budget_usecs=20000
# End of Hysteria 2 optimization
EOF
    
    # Apply settings
    sysctl -p >/dev/null 2>&1
    
    # Increase file descriptor limits
    if ! grep -q "* soft nofile" /etc/security/limits.conf; then
        cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 1000000
* hard nofile 1000000
* soft nproc 1000000
* hard nproc 1000000
root soft nofile 1000000
root hard nofile 1000000
root soft nproc 1000000
root hard nproc 1000000
EOF
    fi
    
    # Optimize systemd limits
    if [[ ! -d /etc/systemd/system.conf.d ]]; then
        mkdir -p /etc/systemd/system.conf.d
    fi
    cat > /etc/systemd/system.conf.d/99-limits.conf << 'EOF'
[Manager]
DefaultLimitNOFILE=1000000
DefaultLimitNPROC=1000000
EOF
    systemctl daemon-reload
    
    green "UDP/QUIC optimizations applied!"
    yellow "Some optimizations may require a reboot to fully take effect"
    return
}

# System optimization menu wrapper
optimize_system_menu(){
    optimize_system
    echo ""
    read -p "Press Enter to return to main menu..." 
    return
}

# Set bandwidth limits
set_bandwidth(){
    green "Set bandwidth limits (0 means unlimited)"
    read -p "Set upload bandwidth (mbps) [default: 0]: " up_mbps
    [[ -z $up_mbps ]] && up_mbps=0
    
    read -p "Set download bandwidth (mbps) [default: 0]: " down_mbps
    [[ -z $down_mbps ]] && down_mbps=0
    
    # Validate numeric input
    if ! [[ "$up_mbps" =~ ^[0-9]+$ ]]; then
        yellow "Invalid upload value, set to 0"
        up_mbps=0
    fi
    
    if ! [[ "$down_mbps" =~ ^[0-9]+$ ]]; then
        yellow "Invalid download value, set to 0"
        down_mbps=0
    fi
    
    if [[ $up_mbps -gt 0 ]] || [[ $down_mbps -gt 0 ]]; then
        use_bandwidth=true
        yellow "Bandwidth limits applied: up ${up_mbps} mbps, down ${down_mbps} mbps"
    else
        use_bandwidth=false
        green "No bandwidth limits"
    fi
}

# Certificate setup
inst_cert(){
    green "Choose how to set up the TLS certificate:"
    echo ""
    echo -e " ${GREEN}1.${PLAIN} Self-signed certificate ${YELLOW}(default)${PLAIN}"
    echo -e " ${GREEN}2.${PLAIN} Custom certificate paths"
    echo ""
    read -rp "Select an option [1-2]: " certInput
    if [[ $certInput == 2 ]]; then
        read -p "Enter path to certificate (.crt): " cert_path
        yellow "Certificate path: $cert_path "
        read -p "Enter path to private key (.key): " key_path
        yellow "Key path: $key_path "
        read -p "Enter certificate domain (SNI): " domain
        yellow "Certificate domain: $domain"
        hy_domain=$domain
        # Check if certificate files exist
        if [[ ! -f "$cert_path" ]]; then
            red "Error: certificate file not found: $cert_path"
            return 1
        fi
        if [[ ! -f "$key_path" ]]; then
            red "Error: key file not found: $key_path"
            return 1
        fi
    elif [[ $certInput == 1 ]] || [[ -z $certInput ]]; then
        green "Using self-signed certificate as the Hysteria 2 server certificate"
        cert_path="/etc/hysteria/cert.crt"
        key_path="/etc/hysteria/private.key"
        
        # Ensure openssl installed
        if ! command -v openssl &>/dev/null; then
            yellow "Installing openssl..."
            ${PACKAGE_INSTALL} openssl
        fi
        
        openssl ecparam -genkey -name prime256v1 -out /etc/hysteria/private.key
        openssl req -new -x509 -days 36500 -key /etc/hysteria/private.key -out /etc/hysteria/cert.crt -subj "/CN=www.bing.com"
        chmod 644 /etc/hysteria/cert.crt
        chmod 644 /etc/hysteria/private.key
        hy_domain="www.bing.com"
        domain="www.bing.com"
    fi
    
    # Persist domain to file
    echo "$hy_domain" > /etc/hysteria/domain.txt
}

# Port selection (improved)
inst_port(){
    # Only clean rules added by this script to avoid affecting other services
    # Clean IPv4/IPv6 rules with the specific comment: hysteria2
    while iptables -t nat -D PREROUTING -p udp -m comment --comment "hysteria2" -j DNAT >/dev/null 2>&1; do :; done
    while ip6tables -t nat -D PREROUTING -p udp -m comment --comment "hysteria2" -j DNAT >/dev/null 2>&1; do :; done
    
    while true; do
        read -p "Set Hysteria 2 port [1-65535] (Enter for random): " port
        [[ -z $port ]] && port=$(shuf -i 2000-65535 -n 1)
        
        # Validate numeric input
        if ! [[ "$port" =~ ^[0-9]+$ ]]; then
            red "Please enter a valid numeric port"
            continue
        fi
        
        # Validate port range
        if [[ $port -lt 1 ]] || [[ $port -gt 65535 ]]; then
            red "Port must be between 1 and 65535"
            continue
        fi
        
        # Check if port is in use
        if ss -tunlp | grep -q ":$port "; then
            red "Port $port is in use; choose another"
            continue
        fi
        
        break
    done
    
    yellow "Using Hysteria 2 server port: $port"
    inst_jump
}

inst_jump(){
    green "Hysteria 2 port modes:"
    echo ""
    echo -e " ${GREEN}1.${PLAIN} Single port ${YELLOW}(default)${PLAIN}"
    echo -e " ${GREEN}2.${PLAIN} Port hopping"
    echo ""
    read -rp "Select an option [1-2]: " jumpInput
    if [[ $jumpInput == 2 ]]; then
        read -p "Set start of port range (recommend 10000-65535): " firstport
        read -p "Set end of port range (recommend 10000-65535, must be > start): " endport
        if [[ $firstport -ge $endport ]]; then
            until [[ $firstport -lt $endport ]]; do
                red "Start port must be less than end port; please re-enter both"
                read -p "Set start of port range (recommend 10000-65535): " firstport
                read -p "Set end of port range (recommend 10000-65535, must be > start): " endport
            done
        fi
        # Clean existing rules if any
        iptables -t nat -D PREROUTING -p udp -m comment --comment "hysteria2" -j DNAT 2>/dev/null
        ip6tables -t nat -D PREROUTING -p udp -m comment --comment "hysteria2" -j DNAT 2>/dev/null
        # Add new rules (with comment tag)
        iptables -t nat -A PREROUTING -p udp --dport $firstport:$endport -m comment --comment "hysteria2" -j DNAT --to-destination :$port
        ip6tables -t nat -A PREROUTING -p udp --dport $firstport:$endport -m comment --comment "hysteria2" -j DNAT --to-destination :$port
        save_iptables_rules
        # Save port hopping info to file
        echo "$firstport-$endport" > /etc/hysteria/port_hopping.txt
    else
        green "Continuing with single port mode"
        # Clear port hopping info
        rm -f /etc/hysteria/port_hopping.txt
    fi
}

inst_pwd(){
    read -p "Set Hysteria 2 password (Enter for random): " auth_pwd
    [[ -z $auth_pwd ]] && auth_pwd=$(date +%s%N | md5sum | cut -c 1-8)
    yellow "Password for Hysteria 2 server: $auth_pwd"
}

inst_obfs(){
    green "Enable obfuscation?"
    echo ""
    echo -e " ${GREEN}1.${PLAIN} Enable obfuscation ${YELLOW}(default)${PLAIN}"
    echo -e " ${GREEN}2.${PLAIN} Disable obfuscation"
    echo ""
    read -rp "Select an option [1-2]: " obfsInput
    if [[ $obfsInput == 2 ]]; then
        green "Obfuscation disabled"
        use_obfs=false
    else
        read -p "Set obfuscation password (Enter for random): " obfs_pwd
        [[ -z $obfs_pwd ]] && obfs_pwd=$(date +%s%N | md5sum | cut -c 1-12)
        yellow "Obfuscation password: $obfs_pwd"
        use_obfs=true
    fi
}

inst_alpn(){
    green "Enable ALPN?"
    echo ""
    echo -e " ${GREEN}1.${PLAIN} Enable ALPN (h3, h2, http/1.1) ${YELLOW}(default)${PLAIN}"
    echo -e " ${GREEN}2.${PLAIN} Disable ALPN"
    echo ""
    read -rp "Select an option [1-2]: " alpnInput
    if [[ $alpnInput == 2 ]]; then
        green "ALPN disabled"
        use_alpn=false
    else
        yellow "ALPN enabled: h3, h2, http/1.1"
        use_alpn=true
        alpn_str="h3,h2,http/1.1"
    fi
}

# Improved masquerade site selection
inst_site(){
    green "Choose the masquerade site for Hysteria 2:"
    echo ""
    
    # Always offer cert domain as option 0 (recommended)
    if [[ -n $hy_domain ]]; then
        echo -e " ${GREEN}0.${PLAIN} Use certificate domain ${YELLOW}(recommended)${PLAIN}: $hy_domain"
    fi
    
    echo -e " ${GREEN}1.${PLAIN} www.bing.com"
    echo -e " ${GREEN}2.${PLAIN} www.apple.com"
    echo -e " ${GREEN}3.${PLAIN} www.amazon.com"
    echo -e " ${GREEN}4.${PLAIN} www.microsoft.com"
    echo -e " ${GREEN}5.${PLAIN} www.google.com"
    echo -e " ${GREEN}6.${PLAIN} www.yahoo.com"
    echo -e " ${GREEN}7.${PLAIN} Custom site"
    echo ""
    
    if [[ -n $hy_domain ]]; then
        echo -ne "Select an option [0-7] (${YELLOW}recommend 0 - cert domain${PLAIN}): "
        read -r siteChoice
        [[ -z $siteChoice ]] && siteChoice=0
    else
        read -rp "Select an option [1-7]: " siteChoice
    fi
    
    case $siteChoice in
        0) 
            if [[ -n $hy_domain ]]; then
                proxysite="$hy_domain"
                green "Using certificate domain as masquerade site (recommended)"
            else
                proxysite="www.bing.com"
            fi
            ;;
        1) proxysite="www.bing.com" ;;
        2) proxysite="www.apple.com" ;;
        3) proxysite="www.amazon.com" ;;
        4) proxysite="www.microsoft.com" ;;
        5) proxysite="www.google.com" ;;
        6) proxysite="www.yahoo.com" ;;
        7) 
            read -rp "Enter masquerade site (without https://): " proxysite
            [[ -z $proxysite ]] && proxysite="www.bing.com"
            ;;
        *) 
            if [[ -n $hy_domain ]]; then
                proxysite="$hy_domain"
                green "Defaulting to certificate domain as masquerade site"
            else
                proxysite="www.bing.com"
            fi
            ;;
    esac
    
    yellow "Masquerade site for Hysteria 2: $proxysite"
}

# Improved install function
insthysteria(){
    warpv6=""
    warpv4=""
    optChoice=""
    
    # Check if already installed
    if [[ -f "/usr/local/bin/hysteria" ]] && [[ -f "/etc/hysteria/config.yaml" ]]; then
        yellow "Hysteria 2 is already installed. Reinstall? (y/N)"
        read -r reinstall
        [[ "$reinstall" != "y" && "$reinstall" != "Y" ]] && return
    fi
    
    # Check dependencies
    check_dependencies
    
    warpv6=$(curl -s6m8 https://www.cloudflare.com/cdn-cgi/trace -k | grep warp | cut -d= -f2)
    warpv4=$(curl -s4m8 https://www.cloudflare.com/cdn-cgi/trace -k | grep warp | cut -d= -f2)
    if [[ $warpv4 =~ on|plus || $warpv6 =~ on|plus ]]; then
        echo "Warp detected (on/plus). Temporarily disable Warp to get real egress IP?"
        echo -e " ${GREEN}1.${PLAIN} Yes (temporarily disable, then restore)"
        echo -e " ${GREEN}2.${PLAIN} No (keep current) ${YELLOW}(default)${PLAIN}"
        read -rp "Select an option [1-2]: " warpToggle
        if [[ "$warpToggle" == "1" ]]; then
            # Record current state
            local warpgo_active=false
            local wgquick_active=false
            local wgcf_iface_up=false
            if systemctl is-active warp-go >/dev/null 2>&1; then warpgo_active=true; fi
            if systemctl is-active wg-quick@wgcf >/dev/null 2>&1; then wgquick_active=true; fi
            if ip link show wgcf >/dev/null 2>&1; then
                if ip -br link show wgcf 2>/dev/null | grep -qw UP; then wgcf_iface_up=true; fi
            fi

            # Temporarily disable Warp
            if [[ "$wgquick_active" == true ]]; then
                systemctl stop wg-quick@wgcf >/dev/null 2>&1
            elif [[ "$wgcf_iface_up" == true ]]; then
                wg-quick down wgcf >/dev/null 2>&1 || true
            fi
            if [[ "$warpgo_active" == true ]]; then
                systemctl stop warp-go >/dev/null 2>&1 || true
            fi

            # Fetch real IP
            realip

            # Restore previous state
            if [[ "$warpgo_active" == true ]]; then
                systemctl start warp-go >/dev/null 2>&1 || true
            fi
            if [[ "$wgquick_active" == true ]]; then
                systemctl start wg-quick@wgcf >/dev/null 2>&1 || true
            elif [[ "$wgcf_iface_up" == true ]]; then
                wg-quick up wgcf >/dev/null 2>&1 || true
            fi
        else
            realip
        fi
    else
        realip
    fi
    
    ${PACKAGE_UPDATE}
    
    # Install required packages
    if [[ ${SYSTEM} == "CentOS" ]]; then
        ${PACKAGE_INSTALL} curl wget sudo qrencode procps iptables-services
    else
        # Ubuntu - improved package install
        ${PACKAGE_INSTALL} curl wget sudo qrencode procps iptables bc
        # Non-interactive install for iptables-persistent
        echo iptables-persistent iptables-persistent/autosave_v4 boolean true | debconf-set-selections
        echo iptables-persistent iptables-persistent/autosave_v6 boolean true | debconf-set-selections
        DEBIAN_FRONTEND=noninteractive ${PACKAGE_INSTALL} iptables-persistent netfilter-persistent
    fi
    
    # Ask to apply system optimizations
    green "Apply system network optimizations? (recommended)"
    echo ""
    echo -e " ${GREEN}1.${PLAIN} Yes ${YELLOW}(recommended, UDP/QUIC tuning)${PLAIN}"
    echo -e " ${GREEN}2.${PLAIN} No"
    echo ""
    read -rp "Select an option [1-2]: " optChoice
    if [[ $optChoice == 1 ]] || [[ -z $optChoice ]]; then
        optimize_system
    fi
    
    # Download and install Hysteria (with local cache + mirror fallback)
    yellow "Preparing to install Hysteria 2 (cache + mirror)..."
    CACHE_DIR="/etc/hysteria/cache"
    CACHE_FILE="$CACHE_DIR/install_server.sh"
    PRIMARY_URL="https://raw.githubusercontent.com/Misaka-blog/hysteria-install/main/hy2/install_server.sh"
    MIRROR_URL="https://cdn.jsdelivr.net/gh/Misaka-blog/hysteria-install@main/hy2/install_server.sh"
    mkdir -p "$CACHE_DIR"

    use_cached=false
    if [[ -s "$CACHE_FILE" ]]; then
        yellow "Found local cache, will use: $CACHE_FILE"
        use_cached=true
    else
        yellow "Downloading installer from primary source..."
        if wget -q -O "$CACHE_FILE" --no-check-certificate "$PRIMARY_URL"; then
            use_cached=true
        else
            yellow "Primary download failed, trying mirror..."
            if curl -fsSL "$MIRROR_URL" -o "$CACHE_FILE"; then
                use_cached=true
            else
                red "Failed to download installer script."
                yellow "You can download it manually to $CACHE_FILE and retry:"
                echo "  1) $PRIMARY_URL"
                echo "  2) $MIRROR_URL"
                read -p "Press Enter to return to main menu..."
                return
            fi
        fi
    fi
    
    # Basic validation (syntax check)
    if [[ "$use_cached" == true ]]; then
        if ! bash -n "$CACHE_FILE" 2>/dev/null; then
            red "Syntax check failed on cached/downloaded script; aborting for safety."
            yellow "Please check $CACHE_FILE or remove and retry."
            read -p "Press Enter to return to main menu..."
            return
        fi
        bash "$CACHE_FILE"
    fi
    
    if [[ -f "/usr/local/bin/hysteria" ]]; then
        green "Hysteria 2 installed successfully!"
    else
        red "Hysteria 2 installation failed!"
        read -p "Press Enter to return to main menu..." 
        return
    fi
    
    # Prompt user for Hysteria configuration
    inst_cert
    if [[ $? -ne 0 ]]; then
        red "Certificate configuration failed"
        read -p "Press Enter to return to main menu..." 
        return
    fi
    inst_port
    inst_pwd
    inst_obfs
    inst_alpn
    inst_site
    set_bandwidth
    
    # Validate required variables
    if [[ -z "$port" ]] || [[ -z "$cert_path" ]] || [[ -z "$key_path" ]] || [[ -z "$auth_pwd" ]]; then
        red "Error: configuration is incomplete"
        echo "Port: $port"
        echo "Certificate: $cert_path"
        echo "Key: $key_path"
        echo "Password: $auth_pwd"
        read -p "Press Enter to return to main menu..." 
        return
    fi
    
    # Write Hysteria server config
    cat << EOF > /etc/hysteria/config.yaml
listen: :${port}
tls:
  cert: ${cert_path}
  key: ${key_path}
EOF

    # If ALPN is enabled, append ALPN config
    if [[ $use_alpn == true ]]; then
        cat << EOF >> /etc/hysteria/config.yaml
  alpn:
    - h3
    - h2
    - http/1.1
EOF
    fi

    # Append QUIC tuning
    cat << EOF >> /etc/hysteria/config.yaml
quic:
  initStreamReceiveWindow: 26843545
  maxStreamReceiveWindow: 26843545
  initConnReceiveWindow: 67108864
  maxConnReceiveWindow: 67108864
  maxIdleTimeout: 30s
  maxIncomingStreams: 1024
  disablePathMTUDiscovery: false
EOF

    # If bandwidth limits set, append bandwidth section
    if [[ $use_bandwidth == true ]]; then
        # Ensure variables have values
        [[ -z "$up_mbps" ]] && up_mbps=0
        [[ -z "$down_mbps" ]] && down_mbps=0
        cat << EOF >> /etc/hysteria/config.yaml
bandwidth:
  up: ${up_mbps} mbps
  down: ${down_mbps} mbps
EOF
    fi

    cat << EOF >> /etc/hysteria/config.yaml
auth:
  type: password
  password: ${auth_pwd}
masquerade:
  type: proxy
  proxy:
    url: https://${proxysite}
    rewriteHost: true
EOF

    # If obfuscation enabled, append obfuscation section
    if [[ $use_obfs == true ]]; then
        cat << EOF >> /etc/hysteria/config.yaml
obfs:
  type: salamander
  salamander:
    password: ${obfs_pwd}
EOF
    fi

    # Wrap IPv6 in [] for host:port formatting
    if [[ -n $(echo $ip | grep ":") ]]; then
        last_ip="[$ip]"
    else
        last_ip=$ip
    fi
    mkdir -p /root/hy
    
    # Generate client configs
    generate_client_configs
    
    # Save auxiliary config files
    if [[ $use_obfs == true ]]; then
        echo "$obfs_pwd" > /etc/hysteria/obfs.txt
    else
        rm -f /etc/hysteria/obfs.txt
    fi
    
    if [[ $use_alpn == true ]]; then
        echo "$alpn_str" > /etc/hysteria/alpn.txt
    else
        rm -f /etc/hysteria/alpn.txt
    fi
    
    if [[ $use_bandwidth == true ]]; then
        echo "$up_mbps,$down_mbps" > /etc/hysteria/bandwidth.txt
    else
        rm -f /etc/hysteria/bandwidth.txt
    fi
    
    # Save domain
    echo "$hy_domain" > /etc/hysteria/domain.txt

    # Start service
    systemctl daemon-reload
    systemctl enable hysteria-server
    systemctl start hysteria-server
    
    # Check service status a few times
    sleep 2
    service_active=false
    for i in {1..3}; do
        if systemctl is-active hysteria-server >/dev/null 2>&1; then
            service_active=true
            break
        fi
        sleep 1
    done
    
    if [[ "$service_active" == true ]] && [[ -f '/etc/hysteria/config.yaml' ]]; then
        green "Hysteria 2 service started successfully"
    else
        red "Hysteria 2 service failed to start"
        echo ""
        yellow "Config file contents:"
        cat /etc/hysteria/config.yaml
        echo ""
        yellow "Service status:"
        systemctl status hysteria-server --no-pager -l
        echo ""
        red "Please review the configuration and error messages above" 
        read -p "Press Enter to return to main menu..." 
        return
    fi
    
    red "======================================================================================"
    green "Hysteria 2 proxy service installation complete"
    yellow "Server optimization status:"
    green "UDP/QUIC optimization enabled"
    if [[ $use_obfs == true ]]; then
        yellow "Obfuscation enabled. Password: $obfs_pwd"
    fi
    if [[ $use_alpn == true ]]; then
        yellow "ALPN enabled. Protocols: h3, h2, http/1.1"
    fi
    if [[ $use_bandwidth == true ]]; then
        yellow "Bandwidth limits set: up ${up_mbps} mbps, down ${down_mbps} mbps"
    fi
    yellow "Masquerade site: $proxysite"
    yellow "Client YAML saved to /root/hy/hy-client.yaml. Contents:"
    red "$(cat /root/hy/hy-client.yaml)"
    yellow "Client JSON saved to /root/hy/hy-client.json. Contents:"
    red "$(cat /root/hy/hy-client.json)"
    yellow "Share link saved to /root/hy/url.txt:"
    red "$(cat /root/hy/url.txt)"
    echo ""
    green "Installation complete!"
    echo ""
    read -p "Press Enter to return to main menu..." 
    return
}

# Generate client configs (extracted as a function)
generate_client_configs(){
    # Generate client YAML config
    if [[ -n $firstport ]]; then
        # Port hopping mode
        cat << EOF > /root/hy/hy-client.yaml
server: $last_ip:$port
auth: $auth_pwd
tls:
  sni: $hy_domain
  insecure: true
  fingerprint: chrome
EOF
        if [[ $use_alpn == true ]]; then
            cat << EOF >> /root/hy/hy-client.yaml
  alpn:
    - h3
    - h2
    - http/1.1
EOF
        fi
        cat << EOF >> /root/hy/hy-client.yaml
quic:
  initStreamReceiveWindow: 26843545
  maxStreamReceiveWindow: 26843545
  initConnReceiveWindow: 67108864
  maxConnReceiveWindow: 67108864
fastOpen: true
lazy: true
EOF
        if [[ $use_bandwidth == true ]]; then
            cat << EOF >> /root/hy/hy-client.yaml
bandwidth:
  up: $up_mbps mbps
  down: $down_mbps mbps
EOF
        fi
        if [[ $use_obfs == true ]]; then
            cat << EOF >> /root/hy/hy-client.yaml
obfs:
  type: salamander
  salamander:
    password: $obfs_pwd
EOF
        fi
        cat << EOF >> /root/hy/hy-client.yaml
socks5:
  listen: 127.0.0.1:5678
http:
  listen: 127.0.0.1:8080
transport:
  udp:
    hopInterval: 30s
    hopPorts: $firstport-$endport
EOF
    else
        # Single port mode
        cat << EOF > /root/hy/hy-client.yaml
server: $last_ip:$port
auth: $auth_pwd
tls:
  sni: $hy_domain
  insecure: true
  fingerprint: chrome
EOF
        if [[ $use_alpn == true ]]; then
            cat << EOF >> /root/hy/hy-client.yaml
  alpn:
    - h3
    - h2
    - http/1.1
EOF
        fi
        cat << EOF >> /root/hy/hy-client.yaml
quic:
  initStreamReceiveWindow: 26843545
  maxStreamReceiveWindow: 26843545
  initConnReceiveWindow: 67108864
  maxConnReceiveWindow: 67108864
fastOpen: true
lazy: true
EOF
        if [[ $use_bandwidth == true ]]; then
            cat << EOF >> /root/hy/hy-client.yaml
bandwidth:
  up: $up_mbps mbps
  down: $down_mbps mbps
EOF
        fi
        if [[ $use_obfs == true ]]; then
            cat << EOF >> /root/hy/hy-client.yaml
obfs:
  type: salamander
  salamander:
    password: $obfs_pwd
EOF
        fi
        cat << EOF >> /root/hy/hy-client.yaml
socks5:
  listen: 127.0.0.1:5678
http:
  listen: 127.0.0.1:8080
EOF
    fi
    
    # Generate JSON config
    generate_json_config
    
    # Generate share link
    generate_share_link
}

# Generate JSON config
generate_json_config(){
    json_content=""
    
    if [[ -n $firstport ]]; then
        # Port hopping mode
        json_content='{
  "server": "'$last_ip':'$port'",
  "auth": "'$auth_pwd'",
  "tls": {
    "sni": "'$hy_domain'",
    "insecure": true,
    "fingerprint": "chrome"'
        
        if [[ $use_alpn == true ]]; then
            json_content+=',
    "alpn": ["h3", "h2", "http/1.1"]'
        fi
        
        json_content+='
  },
  "quic": {
    "initStreamReceiveWindow": 26843545,
    "maxStreamReceiveWindow": 26843545,
    "initConnReceiveWindow": 67108864,
    "maxConnReceiveWindow": 67108864
  },
  "fastOpen": true,
  "lazy": true'
        
        if [[ $use_bandwidth == true ]]; then
            json_content+=',
  "bandwidth": {
    "up": "'$up_mbps' mbps",
    "down": "'$down_mbps' mbps"
  }'
        fi
        
        if [[ $use_obfs == true ]]; then
            json_content+=',
  "obfs": {
    "type": "salamander",
    "salamander": {
      "password": "'$obfs_pwd'"
    }
  }'
        fi
        
        json_content+=',
  "socks5": {
    "listen": "127.0.0.1:5678"
  },
  "http": {
    "listen": "127.0.0.1:8080"
  },
  "transport": {
    "udp": {
      "hopInterval": "30s",
      "hopPorts": "'$firstport'-'$endport'"
    }
  }
}'
        echo "$json_content" > /root/hy/hy-client.json
    else
        # Single port mode
        json_content='{
  "server": "'$last_ip':'$port'",
  "auth": "'$auth_pwd'",
  "tls": {
    "sni": "'$hy_domain'",
    "insecure": true,
    "fingerprint": "chrome"'
        
        if [[ $use_alpn == true ]]; then
            json_content+=',
    "alpn": ["h3", "h2", "http/1.1"]'
        fi
        
        json_content+='
  },
  "quic": {
    "initStreamReceiveWindow": 26843545,
    "maxStreamReceiveWindow": 26843545,
    "initConnReceiveWindow": 67108864,
    "maxConnReceiveWindow": 67108864
  },
  "fastOpen": true,
  "lazy": true'
        
        if [[ $use_bandwidth == true ]]; then
            json_content+=',
  "bandwidth": {
    "up": "'$up_mbps' mbps",
    "down": "'$down_mbps' mbps"
  }'
        fi
        
        if [[ $use_obfs == true ]]; then
            json_content+=',
  "obfs": {
    "type": "salamander",
    "salamander": {
      "password": "'$obfs_pwd'"
    }
  }'
        fi
        
        json_content+=',
  "socks5": {
    "listen": "127.0.0.1:5678"
  },
  "http": {
    "listen": "127.0.0.1:8080"
  }
}'
        echo "$json_content" > /root/hy/hy-client.json
    fi
}

# Generate share link
generate_share_link(){
    url=""
    alpn_encoded=""
    
    url="hysteria2://$auth_pwd@$last_ip:$port/?insecure=1&sni=$hy_domain"
    
    # Add port hopping params
    if [[ -n $firstport ]]; then
        url="${url}&mport=$firstport-$endport"
    fi
    
    # Add obfuscation params
    if [[ $use_obfs == true ]]; then
        url="${url}&obfs=salamander&obfs-password=$obfs_pwd"
    fi
    
    # Add ALPN params
    if [[ $use_alpn == true ]]; then
        alpn_encoded=$(echo "$alpn_str" | sed 's/,/%2C/g')
        url="${url}&alpn=$alpn_encoded"
    fi
    
    url="${url}#Hysteria2"
    echo $url > /root/hy/url.txt
}

# Uninstall - do not remove this script
unsthysteria(){
    yellow "Are you sure you want to uninstall Hysteria 2? (y/N)"
    read -r confirm
    if [[ $confirm != "y" && $confirm != "Y" ]]; then
        return
    fi
    
    systemctl stop hysteria-server.service >/dev/null 2>&1
    systemctl disable hysteria-server.service >/dev/null 2>&1
    systemctl stop hysteria-iptables.service >/dev/null 2>&1
    systemctl disable hysteria-iptables.service >/dev/null 2>&1
    
    rm -f /lib/systemd/system/hysteria-server.service /lib/systemd/system/hysteria-server@.service
    rm -f /etc/systemd/system/hysteria-iptables.service
    rm -rf /usr/local/bin/hysteria /etc/hysteria /root/hy
    rm -rf /etc/systemd/system/hysteria-server.service.d
    
    # Do not delete this script itself!
    # rm -rf /root/hysteria.sh
    
    # Clean iptables rules
    iptables -t nat -D PREROUTING -p udp -m comment --comment "hysteria2" -j DNAT 2>/dev/null
    ip6tables -t nat -D PREROUTING -p udp -m comment --comment "hysteria2" -j DNAT 2>/dev/null
    save_iptables_rules
    
    # Clean system optimization config
    yellow "Cleaning system optimization config..."
    if grep -q "# Hysteria 2 UDP/QUIC" /etc/sysctl.conf 2>/dev/null; then
        # Remove optimization config
        sed -i '/# Hysteria 2 UDP\/QUIC/,/# End of Hysteria 2 optimization/d' /etc/sysctl.conf
        sysctl -p >/dev/null 2>&1
        green "System optimization config cleaned"
    else
        yellow "System config does not contain Hysteria 2 optimization entries"
    fi
    
    systemctl daemon-reload
    
    green "Hysteria 2 has been completely uninstalled"
    yellow "Note: This script file was retained; you can run it again to install"
    echo ""
    read -p "Press Enter to return to main menu..." 
    return
}

starthysteria(){
    systemctl start hysteria-server
    systemctl enable hysteria-server >/dev/null 2>&1
}

stophysteria(){
    systemctl stop hysteria-server
    systemctl disable hysteria-server >/dev/null 2>&1
}

hysteriaswitch(){
    switchInput=""
    yellow "Choose an action:"
    echo ""
    echo -e " ${GREEN}1.${PLAIN} Start Hysteria 2"
    echo -e " ${GREEN}2.${PLAIN} Stop Hysteria 2"
    echo -e " ${GREEN}3.${PLAIN} Restart Hysteria 2"
    echo -e " ${GREEN}0.${PLAIN} Back to main menu"
    echo ""
    read -rp "Select an option [0-3]: " switchInput
    case $switchInput in
        1 ) 
            starthysteria
            green "Hysteria 2 started"
            # Check service status
            sleep 1
            if systemctl is-active hysteria-server >/dev/null 2>&1; then
                green "Service is running"
            else
                red "Service failed to start, details:"
                systemctl status hysteria-server --no-pager -l
            fi
            ;;
        2 ) 
            stophysteria
            green "Hysteria 2 stopped"
            ;;
        3 ) 
            stophysteria
            sleep 1
            starthysteria
            green "Hysteria 2 restarted"
            # Check service status
            sleep 1
            if systemctl is-active hysteria-server >/dev/null 2>&1; then
                green "Service is running"
            else
                red "Service failed to restart, details:"
                systemctl status hysteria-server --no-pager -l
            fi
            ;;
        0 ) return ;;
        * ) 
            red "Invalid option"
            ;;
    esac
    echo ""
    read -p "Press Enter to return to main menu..." 
    return
}

# Reload service function
reload_service(){
    yellow "Reloading service..."
    systemctl daemon-reload
    systemctl restart hysteria-server
    sleep 2
    if systemctl is-active hysteria-server >/dev/null 2>&1; then
        green "Service reloaded successfully!"
    else
        red "Service reload failed, please check configuration"
        systemctl status hysteria-server --no-pager -l
    fi
}

# regenerate_client_config
regenerate_client_config(){
    # Save current config state
    yellow "Regenerating client configuration..."
    
    # Re-read all configuration from files
    get_config_info
    
    # Ensure all required variables are present
    if [[ -z "$port" ]] || [[ -z "$auth_pwd" ]] || [[ -z "$hy_domain" ]]; then
        red "Error: failed to read complete configuration"
        red "Port: $port, Password: $auth_pwd, Domain: $hy_domain"
        return 1
    fi
    
    # Remove old client configs
    rm -f /root/hy/hy-client.yaml /root/hy/hy-client.json /root/hy/url.txt
    
    # Regenerate client configs
    generate_client_configs
    
    green "Client configuration regenerated"
    return 0
}

# Change port
changeport(){
    oldport=$(get_hysteria_port)
    
    if [[ -z "$oldport" ]] || [[ "$oldport" == "0" ]]; then
        red "Error: cannot read current port"
        return
    fi
    
    read -p "Set Hysteria 2 port [1-65535] (Enter for random): " newport
    [[ -z $newport ]] && newport=$(shuf -i 2000-65535 -n 1)
    
    # Validate port
    if ! [[ "$newport" =~ ^[0-9]+$ ]] || [[ $newport -lt 1 ]] || [[ $newport -gt 65535 ]]; then
        red "Invalid port"
        return
    fi
    
    # Check if port is in use
    if ss -tunlp | grep -q ":$newport "; then
        red "Port $newport is in use"
        return
    fi
    
    # Update configuration file
    sed -i "s/:$oldport/:$newport/g" /etc/hysteria/config.yaml
    
    # Verify change
    newport_check=$(get_hysteria_port)
    if [[ "$newport_check" != "$newport" ]]; then
        red "Failed to change port"
        return
    fi
    
    # Update iptables rules (if using port hopping)
    if [[ -f /etc/hysteria/port_hopping.txt ]]; then
        port_range=$(cat /etc/hysteria/port_hopping.txt)
        firstport=$(echo $port_range | cut -d- -f1)
        endport=$(echo $port_range | cut -d- -f2)
        # Clean old rules
        iptables -t nat -D PREROUTING -p udp -m comment --comment "hysteria2" -j DNAT 2>/dev/null
        ip6tables -t nat -D PREROUTING -p udp -m comment --comment "hysteria2" -j DNAT 2>/dev/null
        # Add new rules
        iptables -t nat -A PREROUTING -p udp --dport $firstport:$endport -m comment --comment "hysteria2" -j DNAT --to-destination :$newport
        ip6tables -t nat -A PREROUTING -p udp --dport $firstport:$endport -m comment --comment "hysteria2" -j DNAT --to-destination :$newport
        save_iptables_rules
    fi
    
    # Regenerate client configs
    regenerate_client_config
    
    # Restart service
    reload_service
    
    green "Hysteria 2 port changed to: $newport"
    yellow "Please use the new client config file"
    showconf_menu
}

# Change password
changepasswd(){
    oldpasswd=$(get_hysteria_password)
    
    if [[ -z "$oldpasswd" ]]; then
        red "Error: cannot read current password"
        return
    fi
    
    read -p "Set Hysteria 2 password (Enter for random): " newpasswd
    [[ -z $newpasswd ]] && newpasswd=$(date +%s%N | md5sum | cut -c 1-8)
    
    # Update server config
    sed -i "/^auth:/,/^[^ ]/ s/password: .*/password: $newpasswd/" /etc/hysteria/config.yaml
    
    # Verify change
    newpasswd_check=$(get_hysteria_password)
    if [[ "$newpasswd_check" != "$newpasswd" ]]; then
        red "Failed to change password"
        return
    fi
    
    # Regenerate client configs
    regenerate_client_config
    
    # Restart service
    reload_service
    
    green "Hysteria 2 server password changed to: $newpasswd"
    yellow "Please use the new client config file"
    showconf_menu
}

# Change obfuscation
changeobfs(){
    if [[ -f /etc/hysteria/obfs.txt ]]; then
        old_obfs=$(cat /etc/hysteria/obfs.txt)
        green "Obfuscation is enabled. Password: $old_obfs"
        echo ""
        echo -e " ${GREEN}1.${PLAIN} Change obfuscation password"
        echo -e " ${GREEN}2.${PLAIN} Disable obfuscation"
        echo ""
        read -rp "Select an option [1-2]: " obfsAction
        
        if [[ $obfsAction == 1 ]]; then
            read -p "Set new obfuscation password (Enter for random): " new_obfs
            [[ -z $new_obfs ]] && new_obfs=$(date +%s%N | md5sum | cut -c 1-12)
            
            # Update server config
            if grep -q "^obfs:" /etc/hysteria/config.yaml; then
                sed -i "/salamander:/,/^[^ ]/ s/password: .*/password: $new_obfs/" /etc/hysteria/config.yaml
            else
                # If no obfuscation section, add it
                cat << EOF >> /etc/hysteria/config.yaml
obfs:
  type: salamander
  salamander:
    password: $new_obfs
EOF
            fi
            
            echo "$new_obfs" > /etc/hysteria/obfs.txt
            
            # Regenerate client configs
            regenerate_client_config
            
            reload_service
            green "Obfuscation password updated to: $new_obfs"
        else
            # Remove obfuscation from server config
            sed -i '/^obfs:/,/^[^ ]/d' /etc/hysteria/config.yaml
            rm -f /etc/hysteria/obfs.txt
            
            # Regenerate client configs
            regenerate_client_config
            
            reload_service
            green "Obfuscation disabled"
        fi
    else
        green "Obfuscation is disabled. Enable it?"
        echo ""
        echo -e " ${GREEN}1.${PLAIN} Enable obfuscation"
        echo -e " ${GREEN}2.${PLAIN} Cancel"
        echo ""
        read -rp "Select an option [1-2]: " enableObfs
        
        if [[ $enableObfs == 1 ]]; then
            read -p "Set obfuscation password (Enter for random): " obfs_pwd
            [[ -z $obfs_pwd ]] && obfs_pwd=$(date +%s%N | md5sum | cut -c 1-12)
            
            # Add obfuscation to server config
            cat << EOF >> /etc/hysteria/config.yaml
obfs:
  type: salamander
  salamander:
    password: $obfs_pwd
EOF
            
            echo "$obfs_pwd" > /etc/hysteria/obfs.txt
            
            # Regenerate client configs
            regenerate_client_config
            
            reload_service
            green "Obfuscation enabled. Password: $obfs_pwd"
        fi
    fi
    
    yellow "Please use the new client config file"
    showconf_menu
}

# Change ALPN
changealpn(){
    if [[ -f /etc/hysteria/alpn.txt ]]; then
        green "ALPN is enabled. Protocols: $(cat /etc/hysteria/alpn.txt)"
        echo ""
        echo -e " ${GREEN}1.${PLAIN} Disable ALPN"
        echo -e " ${GREEN}2.${PLAIN} Cancel"
        echo ""
        read -rp "Select an option [1-2]: " alpnAction
        
        if [[ $alpnAction == 1 ]]; then
            # Remove ALPN from server config
            sed -i '/^  alpn:/,/^  [^ ]/{/^  alpn:/d; /^    - /d}' /etc/hysteria/config.yaml
            rm -f /etc/hysteria/alpn.txt
            
            # Regenerate client configs
            regenerate_client_config
            
            reload_service
            green "ALPN disabled"
        fi
    else
        green "ALPN is disabled. Enable it?"
        echo ""
        echo -e " ${GREEN}1.${PLAIN} Enable ALPN (h3, h2, http/1.1)"
        echo -e " ${GREEN}2.${PLAIN} Cancel"
        echo ""
        read -rp "Select an option [1-2]: " enableAlpn
        
        if [[ $enableAlpn == 1 ]]; then
            # Add ALPN under tls section
            if grep -q "^tls:" /etc/hysteria/config.yaml; then
                # Find 'key:' and append 'alpn' after it
                sed -i "/^  key:/ a\\
  alpn:\\
    - h3\\
    - h2\\
    - http/1.1" /etc/hysteria/config.yaml
            fi
            
            echo "h3,h2,http/1.1" > /etc/hysteria/alpn.txt
            
            # Regenerate client configs
            regenerate_client_config
            
            reload_service
            green "ALPN enabled: h3, h2, http/1.1"
        fi
    fi
    
    yellow "Please use the new client config file"
    showconf_menu
}

# Change bandwidth
changebandwidth(){
    if [[ -f /etc/hysteria/bandwidth.txt ]]; then
        old_bandwidth=$(cat /etc/hysteria/bandwidth.txt)
        old_up=$(echo $old_bandwidth | cut -d, -f1)
        old_down=$(echo $old_bandwidth | cut -d, -f2)
        green "Current bandwidth limits: up ${old_up} mbps, down ${old_down} mbps"
        echo ""
        echo -e " ${GREEN}1.${PLAIN} Update bandwidth limits"
        echo -e " ${GREEN}2.${PLAIN} Remove bandwidth limits"
        echo ""
        read -rp "Select an option [1-2]: " bwAction
        
        if [[ $bwAction == 1 ]]; then
            read -p "Set upload bandwidth (mbps) [default: 0]: " new_up
            [[ -z $new_up ]] && new_up=0
            read -p "Set download bandwidth (mbps) [default: 0]: " new_down
            [[ -z $new_down ]] && new_down=0
            
            # Validate input
            if ! [[ "$new_up" =~ ^[0-9]+$ ]]; then
                new_up=0
            fi
            if ! [[ "$new_down" =~ ^[0-9]+$ ]]; then
                new_down=0
            fi
            
            # Update configuration
            sed -i '/^bandwidth:/,/^[^ ]/d' /etc/hysteria/config.yaml
            
            if [[ $new_up -gt 0 ]] || [[ $new_down -gt 0 ]]; then
                # Insert bandwidth config before 'auth'
                sed -i "/^auth:/ i\\
bandwidth:\\
  up: ${new_up} mbps\\
  down: ${new_down} mbps" /etc/hysteria/config.yaml
                echo "${new_up},${new_down}" > /etc/hysteria/bandwidth.txt
            else
                rm -f /etc/hysteria/bandwidth.txt
            fi
            
            green "Bandwidth limits updated"
        else
            # Remove bandwidth limits
            sed -i '/^bandwidth:/,/^[^ ]/d' /etc/hysteria/config.yaml
            rm -f /etc/hysteria/bandwidth.txt
            green "Bandwidth limits removed"
        fi
    else
        green "No bandwidth limits set. Configure now?"
        echo ""
        echo -e " ${GREEN}1.${PLAIN} Set bandwidth limits"
        echo -e " ${GREEN}2.${PLAIN} Cancel"
        echo ""
        read -rp "Select an option [1-2]: " enableBW
        
        if [[ $enableBW == 1 ]]; then
            read -p "Set upload bandwidth (mbps) [default: 0]: " new_up
            [[ -z $new_up ]] && new_up=0
            read -p "Set download bandwidth (mbps) [default: 0]: " new_down
            [[ -z $new_down ]] && new_down=0
            
            # Validate input
            if ! [[ "$new_up" =~ ^[0-9]+$ ]]; then
                new_up=0
            fi
            if ! [[ "$new_down" =~ ^[0-9]+$ ]]; then
                new_down=0
            fi
            
            if [[ $new_up -gt 0 ]] || [[ $new_down -gt 0 ]]; then
                # Insert bandwidth config before 'auth'
                sed -i "/^auth:/ i\\
bandwidth:\\
  up: ${new_up} mbps\\
  down: ${new_down} mbps" /etc/hysteria/config.yaml
                echo "${new_up},${new_down}" > /etc/hysteria/bandwidth.txt
                green "Bandwidth limits set"
            else
                green "Bandwidth not set"
            fi
        fi
    fi
    
    # Regenerate client configs
    regenerate_client_config
    reload_service
    
    yellow "Please use the new client config file"
    showconf_menu
}

change_cert(){
    old_cert=""
    old_key=""
    old_hydomain=""
    old_cert=$(cat /etc/hysteria/config.yaml | grep cert | awk -F " " '{print $2}')
    old_key=$(cat /etc/hysteria/config.yaml | grep key | awk -F " " '{print $2}')
    old_hydomain=$(cat /etc/hysteria/domain.txt 2>/dev/null)
    
    inst_cert
    if [[ $? -ne 0 ]]; then
        red "Certificate configuration failed"
        return
    fi
    
    sed -i "s!$old_cert!$cert_path!g" /etc/hysteria/config.yaml
    sed -i "s!$old_key!$key_path!g" /etc/hysteria/config.yaml
    
    # Save new domain
    echo "$hy_domain" > /etc/hysteria/domain.txt
    
    # Regenerate client configs
    regenerate_client_config
    
    reload_service
    green "Hysteria 2 server certificate type updated"
    yellow "Please use the new client config file"
    showconf_menu
}

changeproxysite(){
    oldproxysite=""
    oldproxysite=$(cat /etc/hysteria/config.yaml | grep url | awk -F " " '{print $2}' | awk -F "https://" '{print $2}')
    
    inst_site
    # Update masquerade site in Hysteria config
    sed -i "s#https://$oldproxysite#https://$proxysite#g" /etc/hysteria/config.yaml
    
    # Regenerate client configs
    regenerate_client_config
    reload_service
    green "Hysteria 2 masquerade site updated to: $proxysite"
}

changeconf(){
    while true; do
        confAnswer=""
        clear
        green "Hysteria 2 configuration changes:"
        echo -e " ${GREEN}1.${PLAIN} Change port"
        echo -e " ${GREEN}2.${PLAIN} Change password"
        echo -e " ${GREEN}3.${PLAIN} Change certificate type"
        echo -e " ${GREEN}4.${PLAIN} Change masquerade site"
        echo -e " ${GREEN}5.${PLAIN} Change obfuscation settings"
        echo -e " ${GREEN}6.${PLAIN} Change ALPN settings"
        echo -e " ${GREEN}7.${PLAIN} Change bandwidth limits"
        echo -e " ${GREEN}8.${PLAIN} Optimize system settings"
        echo -e " ${GREEN}0.${PLAIN} Back to main menu"
        echo ""
        read -p " Select an option [0-8]: " confAnswer
        case $confAnswer in
            1 ) changeport ;;
            2 ) changepasswd ;;
            3 ) change_cert ;;
            4 ) changeproxysite ;;
            5 ) changeobfs ;;
            6 ) changealpn ;;
            7 ) changebandwidth ;;
            8 ) optimize_system ;;
            0 ) return ;;
            * ) 
                red "Invalid option"
                sleep 1
                ;;
        esac
    done
}

showconf(){
    # Show current service configuration summary
    if [[ -f /etc/hysteria/config.yaml ]]; then
        get_config_info
        proxysite=$(grep -E "^\s*url:\s*https?://" /etc/hysteria/config.yaml 2>/dev/null | awk '{print $2}' | sed -e 's#https://##' -e 's#http://##')
        [[ -z "$proxysite" ]] && proxysite="-"
        if [[ -n "$port_range" ]]; then
            port_mode="Port hopping $port_range"
        else
            port_mode="Single port"
        fi
        yellow "Current service configuration:"
        echo -e " Server IP   : ${last_ip:--}"
        echo -e " Listen Port : $([[ -n \"$port\" && \"$port\" != \"0\" ]] && echo \"$port\" || echo '-')"
        echo -e " SNI Domain  : ${hy_domain:--}"
        echo -e " Masquerade  : $proxysite"
        echo -e " Port Mode   : $port_mode"
        echo -e " Auth Pass   : $([[ -n $auth_pwd ]] && echo $auth_pwd || echo '-')"
        echo ""
    fi
    yellow "Client YAML (/root/hy/hy-client.yaml):"
    red "$(cat /root/hy/hy-client.yaml)"
    yellow "Client JSON (/root/hy/hy-client.json):"
    red "$(cat /root/hy/hy-client.json)"
    yellow "Share link (/root/hy/url.txt):"
    red "$(cat /root/hy/url.txt)"
    echo ""
    yellow "Current service status:"
    if [[ -f /etc/hysteria/obfs.txt ]]; then
        obfs_pwd=$(cat /etc/hysteria/obfs.txt)
        green "Obfuscation enabled. Password: $obfs_pwd"
    else
        yellow "Obfuscation not enabled"
    fi
    if [[ -f /etc/hysteria/alpn.txt ]]; then
        green "ALPN enabled. Protocols: $(cat /etc/hysteria/alpn.txt)"
    else
        yellow "ALPN not enabled"
    fi
    if [[ -f /etc/hysteria/bandwidth.txt ]]; then
        bandwidth=$(cat /etc/hysteria/bandwidth.txt)
        up_mbps=$(echo $bandwidth | cut -d, -f1)
        down_mbps=$(echo $bandwidth | cut -d, -f2)
        green "Bandwidth limits set: up ${up_mbps} mbps, down ${down_mbps} mbps"
    else
        yellow "No bandwidth limits set"
    fi
    green "UDP/QUIC optimization applied"
}

showconf_menu(){
    showconf
    echo ""
    read -p "Press Enter to return to main menu..." 
    return
}

# Manage boot auto-load configuration
manage_autoload(){
    while true; do
        autoloadInput=""
        clear
        echo "#############################################################"
        echo -e "#              ${GREEN}Boot Auto-load Configuration${PLAIN}              #"
        echo "#############################################################"
        echo ""
        echo -e " ${GREEN}1.${PLAIN} Create/Update iptables auto-restore service"
        echo -e " ${GREEN}2.${PLAIN} Create/Update service dependency config"
        echo -e " ${GREEN}3.${PLAIN} Check auto-load configuration status"
        echo -e " ${GREEN}4.${PLAIN} Test auto-load after restart"
        echo -e " ${GREEN}5.${PLAIN} Remove auto-load configuration"
        echo " ------------------------------------------------------------"
        echo -e " ${RED}0.${PLAIN} Back to main menu"
        echo ""
        read -rp "Select an option [0-5]: " autoloadInput
        case $autoloadInput in
            1 ) 
                create_iptables_service
                ;;
            2 ) 
                create_service_dependencies
                ;;
            3 ) 
                check_autoload_status
                ;;
            4 ) 
                test_autoload
                ;;
            5 ) 
                remove_autoload
                ;;
            0 ) 
                return  # Back to main menu
                ;;
            * ) 
                red "Invalid option, please choose again"
                sleep 1
                ;;
        esac
    done
}

# Check auto-load configuration status
check_autoload_status(){
    clear
    echo "#############################################################"
    echo -e "#              ${GREEN}Auto-load Configuration Status${PLAIN}              #"
    echo "#############################################################"
    echo ""
    
    if systemctl is-enabled hysteria-iptables.service >/dev/null 2>&1; then
        green "✓ iptables auto-restore service is enabled"
        systemctl status hysteria-iptables.service --no-pager -l
    else
        red "✗ iptables auto-restore service is not enabled"
    fi
    echo ""
    
    if [[ -f /etc/systemd/system/hysteria-server.service.d/override.conf ]]; then
        green "✓ Service dependency configuration exists"
        echo "Dependency config contents:"
        cat /etc/systemd/system/hysteria-server.service.d/override.conf
    else
        red "✗ Service dependency configuration not created"
    fi
    echo ""
    
    # Dynamically check port rules
    if [[ -f /etc/hysteria/port_hopping.txt ]]; then
        port_range=$(cat /etc/hysteria/port_hopping.txt)
        green "✓ Port hopping configuration present"
        echo "Port range: $port_range"
        echo "iptables rules:"
        iptables -t nat -L PREROUTING -n | grep "hysteria2" || echo "No port hopping rules found"
    else
        if [[ -f /etc/hysteria/config.yaml ]]; then
            port=$(get_hysteria_port)
            yellow "⚠ Port hopping not used. Current port: $port"
        else
            yellow "⚠ Hysteria configuration file does not exist"
        fi
    fi
    echo ""
    
    read -p "Press Enter to continue..." 
    return
}

# Test auto-load
test_autoload(){
    confirm=""
    clear
    echo "#############################################################"
    echo -e "#              ${GREEN}Test Auto-load After Restart${PLAIN}              #"
    echo "#############################################################"
    echo ""
    
    yellow "Note: This will restart related services and may briefly disrupt connectivity"
    read -p "Proceed? (y/N): " confirm
    if [[ $confirm != "y" && $confirm != "Y" ]]; then
        return
    fi
    
    green "Testing auto-load configuration..."
    
    # Restart iptables service
    if [[ -f /etc/systemd/system/hysteria-iptables.service ]]; then
        systemctl restart hysteria-iptables.service
        if systemctl is-active hysteria-iptables.service >/dev/null 2>&1; then
            green "✓ iptables service restarted successfully"
        else
            red "✗ iptables service restart failed"
        fi
    else
        yellow "iptables service not created"
    fi
    
    # Restart Hysteria 2 service
    systemctl restart hysteria-server
    sleep 2
    if systemctl is-active hysteria-server >/dev/null 2>&1; then
        green "✓ Hysteria 2 service restarted successfully"
    else
        red "✗ Hysteria 2 service restart failed"
        systemctl status hysteria-server --no-pager -l
    fi
    
    # Check iptables rules
    echo ""
    echo "Current iptables rules:"
    if [[ -f /etc/hysteria/port_hopping.txt ]]; then
        iptables -t nat -L PREROUTING -n | grep "hysteria2" || echo "No port hopping rules found"
    fi
    
    echo ""
    green "Test complete!"
    read -p "Press Enter to continue..." 
    return
}

# Remove auto-load configuration
remove_autoload(){
    confirm=""
    clear
    echo "#############################################################"
    echo -e "#              ${RED}Remove Auto-load Configuration${PLAIN}              #"
    echo "#############################################################"
    echo ""
    
    red "Warning: This will delete all auto-load configuration; manual recovery will be required after reboot!"
    read -p "Are you sure? (y/N): " confirm
    if [[ $confirm != "y" && $confirm != "Y" ]]; then
        return
    fi
    
    # Stop and disable iptables service
    systemctl stop hysteria-iptables.service 2>/dev/null
    systemctl disable hysteria-iptables.service 2>/dev/null
    rm -f /etc/systemd/system/hysteria-iptables.service
    rm -f /etc/hysteria/restore-iptables.sh
    
    # Remove service dependency config
    rm -f /etc/systemd/system/hysteria-server.service.d/override.conf
    rmdir /etc/systemd/system/hysteria-server.service.d 2>/dev/null
    
    systemctl daemon-reload
    
    green "Auto-load configuration removed"
    read -p "Press Enter to continue..." 
    return
}

# Exit confirmation
confirm_exit(){
    yellow "Are you sure you want to exit? (y/N)"
    read -r exit_confirm
    if [[ $exit_confirm == "y" || $exit_confirm == "Y" ]]; then
        green "Thanks for using the Hysteria 2 installer!"
        exit 0
    fi
    return
}

# Main menu
menu() {
    while true; do
        # Reset variables to a clean state for each loop
        menuInput=""
        installed_status=""
        running_status=""
        autoload_status=""
        optimize_status=""
        proxysite=""
        port_mode=""
        alpn_status=""
        obfs_status=""
        bw_status=""
        ip_show="-"
        port_show="-"
        sni_show="-"
        is_installed=0
        is_running=0
        
        # Important: clear all configuration-related variables
        port=""
        auth_pwd=""
        hy_domain=""
        obfs_pwd=""
        alpn_str=""
        up_mbps=""
        down_mbps=""
        use_obfs=false
        use_alpn=false
        use_bandwidth=false
        port_range=""
        firstport=""
        endport=""
        last_ip=""
        ip=""

        clear

        # Header
        echo -e "======================================================================"
        echo -e "#                ${GREEN}Hysteria 2 Installer${PLAIN}                             #"
        echo -e "======================================================================"

        # Installation / Running status
        if [[ -f "/usr/local/bin/hysteria" ]]; then
            is_installed=1
            installed_status="${GREEN}Installed${PLAIN}"
            if systemctl is-active hysteria-server >/dev/null 2>&1; then
                is_running=1
                running_status="${GREEN}Running${PLAIN}"
            else
                running_status="${YELLOW}Not running${PLAIN}"
            fi
        else
            installed_status="${RED}Not installed${PLAIN}"
            running_status="${RED}-${PLAIN}"
        fi

        # Auto-load / Optimization status
        if systemctl is-enabled hysteria-iptables.service >/dev/null 2>&1; then
            autoload_status="${GREEN}Enabled${PLAIN}"
        else
            autoload_status="${YELLOW}Disabled${PLAIN}"
        fi
        if grep -q "# Hysteria 2 UDP/QUIC" /etc/sysctl.conf 2>/dev/null; then
            optimize_status="${GREEN}Optimized${PLAIN}"
        else
            optimize_status="${YELLOW}Not optimized${PLAIN}"
        fi

        # Load config status (display only)
        # Only read when installed and config file exists
        if [[ $is_installed -eq 1 ]] && [[ -f /etc/hysteria/config.yaml ]]; then
            get_config_info
            # Fields for display
            ip_show="${last_ip:--}"
            [[ -n "$port" && "$port" != "0" ]] && port_show="$port" || port_show="-"
            sni_show="${hy_domain:--}"

            # Masquerade site
            proxysite=$(grep -E "^\s*url:\s*https?://" /etc/hysteria/config.yaml 2>/dev/null | awk '{print $2}' | sed -e 's#https://##' -e 's#http://##')
            [[ -z "$proxysite" ]] && proxysite="-"

            # Port mode
            if [[ -n "$port_range" ]]; then
                port_mode="Port hopping $port_range"
            else
                port_mode="Single port"
            fi

            # Obfuscation
            if [[ "$use_obfs" == true ]]; then
                obfs_status="${GREEN}Enabled${PLAIN} (${obfs_pwd})"
            else
                obfs_status="${YELLOW}Disabled${PLAIN}"
            fi

            # ALPN
            if [[ "$use_alpn" == true ]]; then
                alpn_status="${GREEN}${alpn_str}${PLAIN}"
            else
                alpn_status="${YELLOW}Disabled${PLAIN}"
            fi

            # Bandwidth
            if [[ "$use_bandwidth" == true ]]; then
                bw_status="${GREEN}Up ${up_mbps} / Down ${down_mbps} mbps${PLAIN}"
            else
                bw_status="${YELLOW}Unlimited${PLAIN}"
            fi
        else
            # If not installed or config missing: show only IP, others '-'
            realip
            if [[ -n $(echo $ip | grep ":") ]]; then
                ip_show="[$ip]"
            else
                ip_show="$ip"
            fi
            port_show="-"
            sni_show="-"
            port_mode="-"
            obfs_status="-"
            alpn_status="-"
            bw_status="-"
            proxysite="-"
            auth_pwd=""  # Ensure password cleared
        fi

        # Status overview bar
        echo -e " Status  |  Installed: ${installed_status}  |  Service: ${running_status}  |  Auto-load: ${autoload_status}  |  Optimize: ${optimize_status}"
        echo    "----------------------------------------------------------------------"
        echo -e " Server IP  : $ip_show"
        echo -e " Listen Port: $port_show"
        echo -e " Port Mode  : $port_mode"
        echo -e " SNI Domain : $sni_show"
        echo -e " Masquerade : $proxysite"
        echo -e " Auth Pass  : $([[ -n $auth_pwd ]] && echo $auth_pwd || echo '-')"
        echo -e " Obfuscation: $obfs_status"
        echo -e " ALPN       : $alpn_status"
        echo -e " Bandwidth  : $bw_status"
        echo -e "======================================================================"
        echo ""

        # Actions
        echo -e " ${GREEN}1.${PLAIN} Install Hysteria 2"
        echo -e " ${RED}2.${PLAIN} Uninstall Hysteria 2"
        echo -e " ----------------------------------------------------------------------"
        echo -e " ${GREEN}3.${PLAIN} Stop/Start/Restart Hysteria 2"
        echo -e " ${GREEN}4.${PLAIN} Modify Hysteria 2 configuration"
        echo -e " ${GREEN}5.${PLAIN} Show Hysteria 2 configuration files"
        echo -e " ----------------------------------------------------------------------"
        echo -e " ${GREEN}6.${PLAIN} System performance optimization (UDP/QUIC)"
        echo -e " ${GREEN}7.${PLAIN} Boot auto-load configuration management"
        echo -e " ----------------------------------------------------------------------"
        echo -e " ${RED}0.${PLAIN} Exit"
        echo ""

        read -rp "Select an option [0-7]: " menuInput
        case $menuInput in
            1 ) insthysteria ;;
            2 ) unsthysteria ;;
            3 ) hysteriaswitch ;;
            4 ) changeconf ;;
            5 ) showconf_menu ;;
            6 ) optimize_system_menu ;;
            7 ) manage_autoload ;;
            0 ) confirm_exit ;;
            * ) 
                red "Invalid option, please choose again"
                sleep 1
                ;;
        esac
    done
}

# Entry point
menu
```



启动端口跳跃时，**需要确保端口跳跃的端口也开放了**

自定义证书，注意，**证书位置不要放在root目录及其子目录下，脚本没有权限获取会无法启动服务**

```
/etc/cf/cert.pem
```

```
/etc/cf/key.pem
```

```
hy.guangyin.blog
```

重启服务

```
systemctl restart hysteria-server.service
systemctl status hysteria-server.service
```



