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
    base-devel gcc grub amd-ucode  \
    zsh zsh-syntax-highlighting zsh-autosuggestions \
    vim neovim git openbsd-netcat \
    sudo man-db htop wget \
    neofetch
```

进 chroot 后编辑 `/etc/pacman.conf`，添加以下配置，启用 Arch Linux CN。

```conf
# /etc/pacman.conf
[archlinuxcn]
# Server = https://repo.archlinuxcn.org/$arch
Server = https://mirrors.bfsu.edu.cn/archlinuxcn/$arch # 北外镜像站
```

之后安装 `yay`:

```sh
sudo pacman -Syy && sudo pacman -S archlinuxcn-keyring yay
```

如果电脑上安装了其他系统的话，需要额外安装 `os-prober`，让 GRUB 在生成配置文件时搜索安装了其他系统的磁盘。

```sh
sudo pacman -S os-prober
```

如果是为 QEMU KVM 虚拟机装系统的话，在执行 `grub-install` 配置 UEFI 启动引导时记得加一个 `--removable` 参数。

```sh
sudo grub-install --target=x86_64-efi --efi-directory=/boot --bootloader-id=GRUB --removable
sudo grub-mkconfig -o /boot/grub.cfg
```

如果不装其他网络工具，只使用 `systemd-networkd` 的话，需要创建一份默认的配置文件使用 DHCP，否则连不上网。

```conf
# /etc/systemd/network/10-default.conf
[Match]
Name=enp*

[Network]
DHCP=yes
```

并启用 `systemd-networkd` Systemd Service：

```conf
sudo systemctl enable systemd-networkd
```

基本上到这里就可以愉快的 `reboot` 了，一个精简的系统所需要的软件就基本装好了。

## 常用命令行工具

如果只作为服务器 / 不包含图形的虚拟机使用的话，装这些咱常用软件，这部分因人而异，仅供参考。

```sh
sudo pacman -S go \
    kubectl helm \
    docker docker-buildx \
    privoxy \
    proxychains \
    wireguard-tools \
    axel aria2 \
    ffmpeg \
    jq go-yq \
    jdk8-openjdk \
    lm_sensors \
    net-tools traceroute \
    nodejs npm \
    python3 python-pip \
    btrfs-progs \
    bind \
    ethtool \
    bc \
    age

# golangci-lint
yay -S golangci-lint-bin \
    krew-bin

# 装完 Docker 后把普通用户添加到 docker group 中
sudo usermod -aG docker $USER
```

创建 Docker Daemon 的配置文件 `/etc/docker/daemon.json`，设定国内的 Mirror，这里用的是南京大学的 Docker Mirror：

```json
{
  "insecure-registries" : [
    "127.0.0.1:5000"
  ],
  "registry-mirrors": [
    "https://docker.nju.edu.cn/"
  ]
}
```

如果需要跑虚拟机，需要装 QEMU 和 `libvirt` 相关的组件（咱用 `virsh` 管理虚拟机，不手搓 qemu 指令）：

```sh
sudo pacman -S qemu-full libvirt
```

### K3s / RKE2 Server

在 Arch Linux 上安装了 K3s 或 RKE2，关机时会卡在 `a stop is running for libcontainer containerd...` 一分多钟……

参考 [这个 Issue](https://github.com/k3s-io/k3s/issues/2400#issuecomment-1312621468)，创建一个 `/etc/systemd/system/shutdown-k3s.service` Systemd 文件。

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
sudo pacman -S nvidia
```

X11/Wayland 这些相关组件会随着桌面环境一起安装，所以只需要装桌面环境即可，<span class="spoiler" >这里就不需要你额外装 X 了</span>。

```sh
# 咱用 GNOME
sudo pacman -S gnome
# 通常不直接装 gnome-extra，而是从里面选咱需要的
sudo pacman -S gnome-tweaks
# GNOME 系统使用的 NetworkManager 需要额外安装并手动启用，否则无法联网
sudo pacman -S networkmanager
sudo systemctl enable --now NetworkManager
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
yay -S google-chrome \
    visual-studio-code-bin
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
yay -S uuplugin-bin
```

如果要运行 Windows 游戏，还要安装 Proton。

```sh
yay -S proton
```

### 音乐

`netease-cloud-music` 这个包已经很久没更新了，现在很多功能用不了，除了这个还有一些基于 GTK4 写的网易云音乐客户端也能用。

```sh
yay -S netease-cloud-music # 网易云音乐
yay -S cider-bin           # Apple Music
```

### 流程图

Draw.io 这个工具画流程图很好用，而且支持 Linux，可以直接从 Arch Linux CN 安装。

```sh
sudo pacman -S drawio-desktop-bin
```

----

未完待续，如果还想到了别的再补充到这儿。
