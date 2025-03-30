---
title: 一些 Arch Linux 的常用组件整理
date: 2024-01-30T18:44:07+08:00
layout: post
tags:
- Arch Linux
categories:
- Linux
---

用这么久 Arch 了，但是却很少写 Arch 相关的博客……

最近常需要在虚拟机上装 Arch，所以把常用工具及配置整理在这儿，省得每次 `pacstrap` 时都要想半天咱需要装什么……

<!--more-->

{{< music netease song 2104716079 >}}

------

## 装系统

Arch Wiki 的 Installation Guide 在使用 `pacstrap` 装系统时只写了最基础的软件包 `base`, `linux` 和 `linux-firmware`，可以在这一步补充亿些常用的软件。

```sh
pacstrap -K /mnt base linux linux-firmware \
    base-devel gcc grub amd-ucode intel-ucode \
    zsh zsh-syntax-highlighting zsh-autosuggestions \
    vim neovim git openbsd-netcat \
    sudo man-db htop wget \
    fastfetch
```

进 chroot 后编辑 `/etc/pacman.conf`，添加以下配置，启用 Arch Linux CN。

```conf
# /etc/pacman.conf
[archlinuxcn]
# Server = https://repo.archlinuxcn.org/$arch
Server = https://mirrors.bfsu.edu.cn/archlinuxcn/$arch
```

之后安装 `paru` (<span class="spoiler" > <s>莫名其妙的会把这玩意联想到尼禄旋转的 PADORU</s> </span>):

```sh
sudo pacman -Syy && sudo pacman -S archlinuxcn-keyring
sudo pacman -S paru
```

如果电脑上安装了其他系统的话，需要额外安装 `os-prober`，让 GRUB 在生成配置文件时搜索安装了其他系统的磁盘。

```sh
sudo pacman -S os-prober
```

如果是为 QEMU KVM 虚拟机装系统的话，在执行 `grub-install` 配置 UEFI 启动引导时记得加一个 `--removable` 参数。

```sh
sudo pacman -S efibootmgr
sudo grub-install --target=x86_64-efi --efi-directory=/boot --bootloader-id=GRUB --removable
sudo grub-mkconfig -o /boot/grub/grub.cfg
```

如果不装其他网络工具，只使用 `systemd-networkd` 的话，需要创建一份默认的配置文件使用 DHCP，否则连不上网。

```conf
# /etc/systemd/network/10-default.network
[Match]
Name=enp*

[Network]
DHCP=yes
```

如果需要配置静态网络地址：  
（这里只配置了静态 IPv4，如需要禁用 IPv6 的 DHCP，请参照下方[桥接网络](#桥接网络)）

```conf
# /etc/systemd/network/10-static.network
[Match]
Name=eth0

[Network]
Address=10.128.0.100/16
Gateway=10.128.0.1
DNS=10.128.0.1
```

并启用 `systemd-networkd` Systemd Service：

```console
sudo systemctl enable systemd-networkd
```

基本上到这里就可以愉快的 `reboot` 了，一个精简的系统所需要的软件就基本装好了。

### 桥接网络

如果需要使用虚拟机的桥接网络，需要在物理网卡的基础上配置一个[桥接网卡](https://wiki.archlinux.org/title/Systemd-networkd#Bridge_interface)，然后为这个桥接网卡配置网络。

先创建一个 `br0` 网卡设备。

```conf
# /etc/systemd/network/25-br0.netdev
[NetDev]
Name=br0
Kind=bridge
```

将 `br0` 绑定到某个物理网卡设备。

```conf
# /etc/systemd/network/25-br0-en.network
[Match]
Name=en*

[Network]
Bridge=br0
```

为 `br0` 桥接网卡配置静态 IP 地址，这里禁用了 IPv4 和 IPv6 的 DHCP。

```conf
# /etc/systemd/network/25-br0.network
[Match]
Name=br0

[Network]
DHCP=no
DNS=10.128.0.1
IPv6AcceptRA=false

[Address]
Address=10.128.0.100/16

# IPv6 static address
# [Address]
# Address=fd00:cafe:abcd::1001/64

[Route]
Gateway=10.128.0.1
GatewayOnLink=yes
```

## 常用命令行工具

如果只作为服务器 / 不包含图形的虚拟机使用的话，装这些咱常用软件，这部分因人而异，仅供参考。

```sh
sudo pacman -S go \
    kubectl helm \
    docker docker-buildx \
    podman \
    privoxy \
    proxychains \
    wireguard-tools \
    axel aria2 \
    ffmpeg \
    jq go-yq \
    jdk8-openjdk \
    lm_sensors \
    net-tools traceroute \
    openssh \
    nodejs npm \
    python3 python-pip \
    btrfs-progs \
    bind \
    ethtool \
    bc \
    age

# golangci-lint
paru -S golangci-lint-bin \
    krew-bin

# 装完 Docker 后把普通用户添加到 docker group 中
sudo usermod -aG docker $USER
```

创建 Docker Daemon 的配置文件 `/etc/docker/daemon.json`，设定国内的 Mirror，这里用的是咱自己搭的反向代理：

```json
{
  "insecure-registries" : [
    "127.0.0.1:5000"
  ],
  "registry-mirrors": [
    "https://docker.hxstarrys.me/"
  ]
}
```

除了 Docker，还建议使用 Podman 运行一些容器，使用方式和 Docker 没什么大区别，以免去 Daemon 依赖并支持 Systemd。

如果需要跑虚拟机，需要装 QEMU 和 `libvirt` 相关的组件（咱用 `virsh` 管理虚拟机，不手搓 qemu 指令）：

```sh
sudo pacman -S qemu-full libvirt
```

### K3s / RKE2 Server

在 Arch Linux 上安装了 K3s 或 RKE2，关机时会卡在 `a stop is running for libcontainer containerd...` 一分多钟……

参考 [这个 Issue](https://github.com/k3s-io/k3s/issues/2400#issuecomment-1312621468)，创建一个 `/etc/systemd/system/shutdown-k3s.service` Systemd 文件。

(如果用的是 RKE2，把文件的 `k3s` 替换为 `rke2`)

```systemd-config
[Unit]
Description=Kill containerd-shims on shutdown
DefaultDependencies=false
Before=shutdown.target umount.target

[Service]
ExecStart=/usr/local/bin/k3s-killall.sh
Type=oneshot

[Install]
WantedBy=shutdown.target
```

之后启用 `shutdown-k3s.service`，在关机时 Kill 掉 K3s。

```sh
sudo systemctl daemon-reload
sudo systemctl enable shutdown-k3s.service
```

### WireGuard Client

如果 Arch Linux 还配置了 WireGuard 客户端，而这台 Arch Linux Server 被放在了家里，只能通过有公网 IP 的 WireGuard 服务器连接进去，这时尽管设置了 WireGuard 的 `persistent keepalive`，但在运营商更换了你家的公网 IP 后，还是会碰到无法自动连接回去的情况，这时可以用咱的 [这个简单粗暴的脚本](https://github.com/STARRY-S/wireguard-keepalive)，在 WireGuard 断连一段时间后，自动重启接口。

## 图形界面

显卡驱动：

```sh
# AMD
sudo pacman -S xf86-video-amdgpu
# NVIDIA
# (咱并不喜欢 DKMS 因为每次更新内核都得编译一遍 Kernel Module，所以这里使用的和 Linux 内核一同更新的 NVIDIA Open Driver)
sudo pacman -S nvidia-open nvidia-utils nvidia-container-toolkit
```

X11/Wayland 这些相关组件会随着桌面环境一起安装，所以只需要装桌面环境即可，<span class="spoiler" >这里就不需要你额外装 X 了</span>。

### Wayland on NVIDIA

在 NVIDIA 显卡上运行 Wayland 需要一些额外操作。

- 增加 `nvidia_drm.modeset=1` 内核参数（记得重新生成 `grub.cfg`）

    ```conf
    # /etc/default/grub
    GRUB_CMDLINE_LINUX="nvidia_drm.modeset=1"
    ```
- 禁用 `nouveau`。

    ```console
    $ echo "blacklist nouveau" >> /etc/modprobe.d/blacklist.conf
    ```

- KMS Early Load。

    ```conf
    # /etc/mkinitcpio.conf
    MODULES=(nvidia nvidia_modeset nvidia_uvm nvidia_drm)

    # 然后移除 HOOKS 那一行里的 kms 以完全禁用 nouveau
    ```

    记得重新 `mkinitcpio -P`。

### GNOME

如果使用 GNOME Desktop（咱默认使用这个桌面），需要安装这些组件

```sh
sudo pacman -S gnome
# 通常不直接装 gnome-extra，而是从里面选咱需要的
sudo pacman -S gnome-tweaks
# GNOME 系统使用的 NetworkManager 需要额外安装并手动启用，否则无法联网
sudo pacman -S networkmanager
sudo systemctl enable --now NetworkManager
```

### XFCE

对于服务器或 NAS 的图形界面，咱用 XFCE + TigerVNC Server。

```sh
sudo pacman -S xfce4 tigervnc

# 配置 VNC Server
mkdir ~/.vnc
cat > ~/.vnc/config << EOF
session=xfce
geometry=1920x1080
localhost=no
alwaysshared
EOF

# VNC 登录密码
vncpasswd

echo ":1=<USERNAME>" >> /etc/tigervnc/vncserver.users # 为用户配置使用 VNC 端口 5901 
sudo systemctl enable --now vncserver@:1
```

## 常用的 GUI 软件

装好图形界面并顺利跑起来之后，就可以装常用的桌面软件了，下面这些是部分可能用到的软件，这些因人而异，仅供参考。

```sh
sudo pacman -S vlc \
    virt-manager \
    ttf-monaco \
    noto-fonts noto-fonts-cjk noto-fonts-emoji ttf-dejavu \
    ibus ibus-rime \
    firefox \
    emacs
```

在 AUR 中安装的软件：

```sh
paru -S google-chrome \
    visual-studio-code-bin
```

### IOMMU Group

默认情况下 AMD CPU 不需要编辑内核参数就已经启用了 IOMMU Group，英特尔平台需要添加内核参数 `intel_iommu=on` 以启用 IOMMU Group。

使用 [Arch Linux Wiki 提供的以下脚本](https://wiki.archlinux.org/title/PCI_passthrough_via_OVMF#Ensuring_that_the_groups_are_valid)查看 PCI 设备的 IOMMU Group。

```sh
#!/bin/bash
shopt -s nullglob
for g in $(find /sys/kernel/iommu_groups/* -maxdepth 0 -type d | sort -V); do
    echo "IOMMU Group ${g##*/}:"
    for d in $g/devices/*; do
        echo -e "\t$(lspci -nns ${d##*/})"
    done;
done;
```

### 启用 Multilib

启用 Multilib 以安装那些 32 位的软件，例如 Steam。

```conf
# /etc/pacman.conf
[multilib]
Include = /etc/pacman.d/mirrorlist
```

之后安装 Steam。

```sh
sudo pacman -S steam
```

如果需要加速 Steam 游戏，可以安装 [uuplugin-bin](https://aur.archlinux.org/packages/uuplugin-bin)，把电脑伪装成 Steam Deck，酱紫路由器有 UU 加速器插件的话就能给 Steam 加速。

```sh
paru -S uuplugin-bin
```

如果要运行 Windows 游戏，还要安装 Proton。

```sh
paru -S proton
```

### 音乐

`netease-cloud-music` 这个包已经很久没更新了，现在很多功能用不了，除了这个还有一些基于 GTK4 写的网易云音乐客户端也能用。

```sh
# paru -S netease-cloud-music # 网易云音乐 (很久未更新，不太好用)
sudo pacman -S netease-cloud-music-gtk4     # GTK4 版本的网易云音乐
sudo pacman -S electron-netease-cloud-music # Electron 网易云音乐
paru -S cider2-bin  # Apple Music （Cider2 软件需要购买）
```

### 流程图

Draw.io 这个工具画流程图很好用，而且支持 Linux，可以直接从 Arch Linux CN 安装。

```sh
sudo pacman -S drawio-desktop-bin
```

### iPhone

如果需要挂载 iPhone 手机（<span class="spoiler">安分守己</span>）到电脑上，需要安装这些软件。

```sh
sudo pacman -Sy ifuse usbmuxd libplist libimobiledevice
```

之后挂载 iPhone 的数据到某个文件夹下，就可以把手机的照片通过数据线拷贝到电脑上了。

```sh
mkdir -p iPhone
ifuse ~/iPhone
```

----

未完待续，如果还想到了别的再补充到这儿。
