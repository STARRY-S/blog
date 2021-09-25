---
title: 使用树莓派搭建一个NAS
created: 2021-09-25T22:20:03+08:00
updated: 2021-09-25T23:27:10+08:00
layout: post
tags:
- 树莓派
- Arch Linux
- NAS
categories:
- 教程
- 树莓派
---

把吃灰了好久的树莓派带了过来，打算搞个NAS玩一下，简短的记录一下整个过程。

<!--more-->

<!--aplayer
{
    "name": "紫雨UNITED まさかのアリス突撃編",
    "artist": "岩杉夏 / イザベル / あゆ",
    "theme": "#3d79d9",
    "url": "https://music.starry-s.moe/music/070b_0208_540c_0af9917fa85b6e8d26efcf2d4d0a6706.m4a",
    "cover": "https://music.starry-s.moe/music/cover/109951166006696770.jpg"
}
-->
> 这歌太魔性了哈哈哈哈

## 准备工作

- 树莓派以及所需的电源（废话）
- 16G以上的高速内存卡用来写系统镜像
- 硬盘（可以选择买移动硬盘或者直接买硬盘盒和机械硬盘自己组装）
- 网络设备：路由器、网线
- （非必须）键盘、显示器、连接线等

树莓派我使用的是高一时买的树莓派3B（满满的回忆），硬盘是上半年为了存照片而买的西数2T移动硬盘，因为暂时闲置所以拿来一起组个云盘玩。

内存卡需要质量好的不容易坏而且读写比较快的卡。

## 装系统

系统咱安装的是[ArchLinux ARM](https://archlinuxarm.org/platforms/armv8/broadcom/raspberry-pi-3)，安装教程直接看官方文档即可。

一开始咱为了发挥树莓派3B的64位CPU的性能，我下载了64位的系统镜像，但是在配置无线连接的时候（可能是）驱动问题卡死，因为急着睡觉所以重新格式化内存卡后被迫安装32位的系统。

安装教程咱就不重复写到博客里了，直接翻Wiki，尽管是纯英文的但是不难，都能看懂。咱就不打算在这翻译了。

在格式化`root`分区时一开始想尝试一下树莓派上跑`btrfs`，但是开机时进了linux的救援(rescue)模式，懒得折腾还是老老实实换回了`ext4`，~~不然我一晚上不用睡觉了~~。

在分区时除了`boot`和`root`之外，我额外分了2G的`swap`分区，树莓派1G内存有些小不过只是搭个人用的NAS的话实际上是不影响使用的。（~~这话咋读着这么别扭呢~~）

最后改一下`/etc/fstab`让设备在开机时自动挂载交换分区。


```
# <file system> <dir> <type> <options> <dump> <pass>
/dev/mmcblk0p1  /boot   vfat    defaults        0       0
/dev/mmcblk0p3  none    swap    defaults        0       0
```

> 如果你的swap分区不是`mmcblk0p3`的话，记得手动更改

## 配置网络

<div class="alert-blue">
配置网络部分不适合在SSH中操作，建议使用显示器和键盘连接到树莓派上操作。<br>
除非你能保证你执行的每个命令都肥肠正确。
</div>

### 无线网络

因为我电脑离路由器肥肠远，所以为了方便我还要给树莓派配置无线网络。首先照着[Wiki上的netctl页面](https://wiki.archlinux.org/title/Netctl)安装了`wifi-menu`所需要用的`dialog`，然后就用`wifi-menu`连接wifi了。不过为了方便以后连接，我需要给他设置静态IP：

首先使用你比较喜欢的文本编辑器打开`wifi-menu`自动生成的配置文件，并修改成以下的样子

``` conf
# /etc/netctl.d/wlan0-YourWifiName

Description='Automatically generated profile by wifi-menu'
Interface=wlan0
Connection=wireless
Security=wpa
ESSID=Your Wifi Name
IP=static
Address=('192.168.xxx.xxx/24')
Gateway='192.168.xxx.1'
DNS='8.8.8.8'
Key=YOUR WIFI PASSWORD
```

其中修改`Address`为你想设置的CIDR地址、`Gateway`为默认网关、以及`DNS`。

最后修改`Key`为Wifi密码（明文），如果需要加密的话可以去wiki上找相应方法。

之后`sudo netctl enable wlan0-YourWifiName`设置好开机自动连接即可。

这时候聪明的小伙伴会想到：我想使用网线联网并配置静态IP，该怎么办呢？

### 配置有线网络

默认情况下，有线接口`eth0`使用`systemd-network`配置了`DHCP`，所以我们不需要改`netctl`的配置文件，只编辑`/etc/systemd/network/eth0.network`这个配置文件改成静态IP地址就好了。

``` conf
[Match]
Name=eth0

[Network]
Address=192.168.xxx.xxx/24
Gateway=192.168.xxx.1
DNS=8.8.8.8
```

重启后`ip addr`就能看到设备的全部IP地址了。

### 配置防火墙

首先安装`ubw`。（因为对iptables不是十分熟悉，ufw比ip桌子好用一些，毕竟他叫**Uncomplicated Filewall**，所以咱先用ufw配置防火墙）

食用方法请参见[Wiki页面](https://wiki.archlinux.org/title/Uncomplicated_Firewall)。

## Samba

> 今天太晚了需要早早睡觉，有时间咱再继续写。
>
> 晚安~
