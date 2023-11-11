---
title: 使用树莓派搭建一个NAS
date: 2021-09-25T22:20:03+08:00
lastmod: 2021-09-29T01:07:48+08:00
layout: post
tags:
- 树莓派
- Arch Linux
- Samba
- NAS
categories:
- 教程
- 树莓派
---

把吃灰了好久的树莓派带了过来，打算搞个NAS玩一下，简短的记录一下整个过程。

<!--more-->

{{< music netease song 750905 >}}

> 这歌太魔性了哈哈哈哈哈……

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

因为咱要做NAS肯定得往树莓派上外接个硬盘之类的，树莓派3B只有USB 2.0 + 百兆网口，尽管速度很慢但是作为个人网盘来说不到10MB/S的速度还是比某些恶心网盘快很多的，在线看个1080P视频还是蛮轻松的，BD蓝光想想还是算了。

把移动硬盘接到树莓派后`lsblk`查看一下分区表。因为咱这是块几乎全新的硬盘所以需要重新分区并格式化一下。

如果你不熟悉在命令行上进行分区格式化的话，建议自行翻阅[Wiki (fdisk)](https://wiki.archlinux.org/title/fdisk)，因为往博客上写的话太难理解了别人肯定看不懂。

最后咱把2T移动硬盘格式化成这个样子：

```text
# fdisk -l /dev/sda

Device          Start        End    Sectors  Size Type
/dev/sda1        2048 2147485695 2147483648    1T Linux filesystem
/dev/sda2  2147485696 3907029133 1759543438  839G Microsoft basic data
```

其中的1T打算格式化为`btrfs`给Samba用，其余的800G打算格式化为`NTFS`留着给Windows当个移动硬盘。

创建分区时别忘了更改分区类型，给Linux用的就是`Linux filesystem`，给Windows用的就是`Microsoft basic data`，
不然机械硬盘连接到Windows系统中将不显示分区，或者就是一直提醒你：该分区不可用，然后让你格式化，到时候一不小心点错了可是会丢数据的。

安装`btrfs-progs`和`ntfs-3g`，之后格式化硬盘（NTFS还是建议到Windows系统中格式化）。

格式化btrfs的时候加个`-L`参数设置分区的标签，这样方便在fstab中设置开机自动挂载。

``` text
$ lsblk                                # 一定要看清楚自己格式化的分区名字
$ sudo mkfs.btrfs /dev/sdaX -L samba   # -L 参数设置分区的标签
```

最后改一下`/etc/fstab`让设备在开机时自动挂载交换分区和移动硬盘。

```
# <file system> <dir> <type> <options> <dump> <pass>
/dev/mmcblk0p1  /boot   vfat    defaults        0       0
LABEL=swap      none    swap    defaults        0       0
LABEL=samba     /samba  btrfs   defaults        0       0
```

重启系统后如果正常的话，分区会被自动挂载。

## 配置网络

> 配置网络部分不适合在SSH中操作，建议使用显示器和键盘连接到树莓派上操作。
>
> 除非你能保证你执行的每个命令都肥肠正确。

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

重启系统后，使用`ip addr`检查设备的IP地址是否正确。

### 配置防火墙

首先安装`ufw`。（因为对iptables不是十分熟悉，ufw比ip桌子好用一些，毕竟他叫**Uncomplicated Filewall**，所以咱先用ufw配置防火墙）

食用方法请参见[Wiki页面](https://wiki.archlinux.org/title/Uncomplicated_Firewall)。

因为咱打算搭一个Samba服务器，所以别忘了配置防火墙允许Samba的端口，按照Arch Linux Wiki：

```
# Create or Edit /etc/ufw/applications.d/samba, add following content:

[Samba]
title=LanManager-like file and printer server for Unix
description=Samba
ports=137,138/udp|139,445/tcp
```

之后root账户执行`ufw app update Samba`加载配置文件，然后`ufw allow Samba`允许Samba的端口。

如果你的树莓派上还装有其他服务（比如http，https等），别忘了`ufw allow PORT`开放端口，尤其是别忘了开SSH端口。

最后`ufw status`查看防火墙状态信息，`ufw enable`开启防火墙。

## Samba

配合[Arch Wiki](https://wiki.archlinux.org/title/Samba)食用。

首先我们需要新建一个分组，然后在挂载的分区中新建一个文件夹作为Samba服务器的共享目录：

```
$ sudo groupadd -r sambausers          # 新建用户组
$ sudo usermod -aG sambausers username # 添加当前用户至分组中
$ sudo smbpasswd -a sambausers         # 设置Samba用户的密码
$ sudo mkdir /samba/sharefolder        # 新建文件夹用来存储共享的文件
$ sudo chown :username /samba/sharefolder   # 修改文件夹的所属分组
$ sudo chmod 0770 /samba/sharefolder   # 修改权限
```

（咱写的很详细了吧

### 配置服务器

安装好`samba`安装包后，需要手动去`/etc/samba/`创建`smb.conf`配置文件，可以到[Samba git repository](https://git.samba.org/samba.git/?p=samba.git;a=blob_plain;f=examples/smb.conf.default;hb=HEAD)中获取样例配置文件，咱只需要把它复制粘贴再简单修改一下就好了。

``` conf
# /etc/samba/smb.conf

[global]
# 修改工作组的名字
workgroup = MYGROUP
# 服务器描述
server string = Raspberry pi Samba Server

# 在文件末尾添加共享文件夹目录及相关配置
[sambashare]
comment = Sample share file.
path = /path/to/your/samba/folder
writable = yes
browsable = yes
create mask = 0755
directory mask = 0755
read only = no
guest ok = no  # 允许访客随意登录
```

配置好文件后，启动`smb.service`和`nmb.service`

``` bash
$ sudo systemctl enable --now smb.service
$ sudo systemctl enable --now nmb.service
```

### 访问服务器

咱GNOME用户直接打开文件管理器，选择左边的“+ Other Locations”，在底部输入服务器连接`smb://192.168.xxx.xxx`，
输入用户组、用户名和密码登录就可以访问共享文件夹。

Windows系统中，首先需要到 控制面板->程序->启用或关闭Windows功能 里面，选中 SMB1.0/CIFS文件共享直通，保存后等一会安装完，
打开文件资源管理器输入地址`\\192.168.xxx.xxx\`，登录后就能访问共享文件夹了。

## Frp内网穿透

> 配合[frp文档](https://gofrp.org/docs/)食用更佳

首先在frp的[GitHub Release](https://github.com/fatedier/frp/releases)页面下载安装包。

如果是树莓派用的话就下载`arm`版本的安装包即可。Arch Linux可以在ArchLinux CN源或AUR中安装`frpc`和`frps`作为客户端和服务端。

``` sh
# 树莓派上下载编译好的文件
$ wget https://github.com/fatedier/frp/releases/download/v0.37.1/frp_0.37.1_linux_arm.tar.gz
# 解压
$ tar -zxvf ./frp_0.37.1_linux_arm.tar.gz
$ cd frp_0.37.1_linux_arm/
# 编辑配置文件
$ vim ./frpc.ini
$ ./frpc -c ./frpc.ini
```

客户端配置文件的格式可参考如下：

```
[common]
server_addr = server ip
server_port = 6000

[samba]
type = tcp
local_ip = 127.0.0.1
local_port = 445
remote_port = 6003
```

其中端口号和`token`按需要自行更改，Samba服务的`tcp`端口号为`445`。

服务端配置文件格式如下：

```
[common]
bind_port = 6000
```

为了安全，别忘了配置[权限验证](https://gofrp.org/docs/reference/server-configures/#%E6%9D%83%E9%99%90%E9%AA%8C%E8%AF%81)，同时别忘了修改服务器的防火墙设置。

## Others

所以到此为止，咱的Samba服务器就搭建好了。

随便传了个大文件试了一下，内网上传速度在6MB/S左右，有些慢但是还没搞清楚到底是什么原因导致的。
