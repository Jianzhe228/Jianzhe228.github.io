title: Ubuntu Linux 笔记本 120Hz 刷新率显示120hz
date: 2026-03-04 22:21:35
categories: 搞七捻三

tags: [ubuntu]
---
## 问题背景

联想小新 Pro 14 在 Windows 下可以选择 120Hz 刷新率，但 Ubuntu 下只有 60Hz，显示设置中没有 120Hz 选项。

## 环境

- 机型：联想小新 Pro 14（XiaoXinPro-14）
- GPU：Intel Alder Lake-P Iris Xe Graphics（i915 驱动）
- 面板：CSOT MNE007ZA1-5，2880x1800，eDP
- 系统：Ubuntu 25.04，内核 6.17

## 根本原因

面板的 EDID（显示器身份数据）中，120Hz 时序存放在 **DisplayID 扩展块**里，但这个扩展块的**校验和是面板固件出厂就写错的**。

- Linux DRM 子系统严格校验 DisplayID 校验和，校验失败直接丢弃整个扩展块，120Hz 模式不可见
- Windows Intel 驱动对校验和更宽容，所以不受影响

可以用 `dmesg` / `journalctl` 确认：

```bash
journalctl -b -k | grep "DisplayID checksum"
```

如果看到 `DisplayID checksum invalid, remainder is 248`，就是这个问题。

## 修复思路

导出面板原始 EDID → 修正校验和 → 放入固件目录 → 让内核启动时加载修正后的 EDID。

## 修复步骤

### 1. 导出 EDID 并计算正确的校验和

```bash
python3 -c "
with open('/sys/class/drm/card1-eDP-1/edid', 'rb') as f:
    edid = bytearray(f.read())

# 修正 DisplayID 段校验和（字节 0xFE）
did_sum = sum(edid[0x81:0xFE])
edid[0xFE] = (256 - (did_sum % 256)) % 256

# 修正 EDID 扩展块校验和（字节 0xFF）
ext_sum = sum(edid[0x80:0xFF])
edid[0xFF] = (256 - (ext_sum % 256)) % 256

# 验证
assert sum(edid[0x81:0xFF]) % 256 == 0, 'DisplayID checksum failed'
assert sum(edid[0x80:0x100]) % 256 == 0, 'Extension block checksum failed'

with open('/tmp/edid_fixed.bin', 'wb') as f:
    f.write(edid)
print('Fixed EDID saved to /tmp/edid_fixed.bin')
"
```

> 注意：不要直接用网上的 `sed 's/f098$/f990/'` 命令，那是针对特定版本面板的，不同批次面板 EDID 字节可能不同，必须用计算的方式得出正确校验和。

### 2. 安装修复后的 EDID

```bash
sudo mkdir -p /usr/lib/firmware/edid/
sudo cp /tmp/edid_fixed.bin /usr/lib/firmware/edid/edid.bin
```

### 3. 将 EDID 文件打包进 initramfs

i915 驱动在 initramfs 阶段就加载，此时根文件系统还没挂载，所以固件必须打包进 initramfs。

在 Ubuntu 25.04 上，initramfs-tools 的 hooks 机制可能不生效，直接追加 cpio 归档：

```bash
sudo bash -c '
TMPDIR=$(mktemp -d)
mkdir -p "$TMPDIR/usr/lib/firmware/edid"
cp /usr/lib/firmware/edid/edid.bin "$TMPDIR/usr/lib/firmware/edid/edid.bin"
cd "$TMPDIR"
find usr -print0 | cpio --null --create --format=newc >> /boot/initrd.img-$(uname -r)
rm -rf "$TMPDIR"
'
```

> 注意：固件路径是 `usr/lib/firmware/`（不是 `lib/firmware/`），Ubuntu 25.04 的 initramfs 内部使用 `usr/lib/firmware/` 路径。

### 4. 添加内核启动参数

编辑 `/etc/default/grub`，在 `GRUB_CMDLINE_LINUX_DEFAULT` 中添加：

```
drm.edid_firmware=eDP-1:edid/edid.bin
```

例如：

```
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash drm.edid_firmware=eDP-1:edid/edid.bin"
```

然后更新 GRUB：

```bash
sudo update-grub
```

### 5. 重启并验证

重启后在「设置 → 显示器」中应该能看到 120Hz 选项。验证命令：

```bash
xrandr | grep eDP
# 应显示 119.99Hz
```

## 回滚方法

如果出问题，在 GRUB 菜单按 `e`，删掉 `drm.edid_firmware=eDP-1:edid/edid.bin`，按 `Ctrl+X` 启动即可恢复。

## 备注

- Linux 6.19 内核已合并针对此面板的补丁（忽略错误校验和），届时升级内核后不再需要此 workaround
- 此方法适用于所有因 DisplayID 校验和错误导致高刷不可用的 eDP 面板，不限于联想小新
- eDP 连接器名称可能因机器不同而不同（`eDP-1` / `eDP-2`），用 `ls /sys/class/drm/ | grep eDP` 确认
