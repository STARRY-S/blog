---
title: NanoPi R4S上手 & 安装Arch Linux ARM
date: 2022-05-13T00:32:40+08:00
# lastmod: 2022-05-13T00:32:40+08:00
layout: post
tags:
- 软路由
- Arch Linux
- NanoPi
categories:
- 教程
- Linux
---

前两天下单了个Nano Pi R4S，4G内存的版本。通常情况下这玩意别人都把他当软路由用，但是今天咱收到货后想了一会拍大腿一寻思这玩意不就是个ARM架构的小电脑嘛~

所以咱暂时先不打算给这玩意装OpenWRT或 *WRT这类的路由器系统了，而是把它当成一个超小号的带俩网口的mini主机折腾。

<!--more-->

{{< music url="https://music.starry-s.moe:2053/music/obj_w5rDlsOJwrLDjj7CmsOj_12200944878_1074_7c82_031c_3ec65ff25ec5dd5155396092696fcda6.m4a" name="Warrior Concerto" artist="The Glitch Mob" cover="https://music.starry-s.moe:2053/music/cover/109951164757717061.jpg" theme="#eec62b" >}}

## 开箱

!["USB 3.0、SD卡插槽以及三脚架接口"](images/nanopi_1.jpg "USB 3.0、SD卡插槽以及三脚架接口")

!["供电接口和网口"](images/nanopi_2.jpg "供电接口和网口")

!["正面"](images/nanopi_3.jpg "正面")

## 拆解

咱收到货后第一件事就是找螺丝刀和塑料卡片把这漏油器拆开看看（

![](images/nanopi_7.jpg)

芯片的布局可以在[R4S的商品页面](https://www.friendlyelec.com/index.php?route=product/product&product_id=284)查到，[官方Wiki](https://wiki.friendlyelec.com/wiki/index.php/NanoPi_R4S)上也有更多关于R4S的介绍。

## Arch Linux ARM

在Arch Linux ARM (简称alarm) 官网上没找到对R4S的官方的支持，简单搜了一下armbian有对R4S的官方支持。

因为用惯了**滚动更新**发行版，所以不想用\*bian系统，而\*WRT系统的软件包相对其他发行版而言更少一些，系统也相当于被魔改过，所以除了做漏油器之外几乎干不了别的，所以这是我想安装Arch Linux的理由。

然后咱搜到了一篇给[NanoPi R2S安装alarm的教程](https://gist.github.com/larsch/a8f13faa2163984bb945d02efb897e6d)，评论里有人提到了给R4S安装也是可以的。

所以咱大致把这个教程翻译一下，再修改一些R2S和R4S在安装时的区别。

以下内容需结合alarm的 [aarch64通用安装教程](https://archlinuxarm.org/platforms/armv8/generic)食用，像更新pacman-key，ssh的密码之类的部分咱就不在这里重复了。

### 准备SD卡

0. 下载armbian的镜像，下载链接自行谷歌。

    > 通常下载好的文件是`xz`格式的压缩文件，需要使用`unxz`解压成`img`镜像。

1. 将armbian镜像的`bootloader`和`uboot`(32-32767区块的部分)用`dd`写到SD卡中：

    ```
    # Clean the sector before 32
    dd if=/dev/zero of=/dev/sdX bs=1M count=32

    # Write uBoot and bootloader
    dd if=Armbian_*.img of=/dev/sdX skip=31 seek=31 bs=512 count=32736
    ```

    > 其实可以直接用`dd`把armbian的整个镜像写到内存卡中然后插入R4S开机，第一次开机后他会自动重新给内存卡分区，然后只需把`/dev/sdX1`格式化成ext4就能安装alarm了。

2. 使用`fdisk`给内存卡分区并格式化文件系统

    创建分区时先按`o`创建个MBR分区表，然后按`n`添加分区。第一个分区的起始区块(sector)需要设置为32768，通常情况下分一个区就够用了，或者你可以像我这样分俩区，一个给swap，不过实际没啥必要。

    ```
    Disk /dev/mmcblk1: 29.72 GiB, 31914983424 bytes, 62333952 sectors
    Units: sectors of 1 * 512 = 512 bytes
    Sector size (logical/physical): 512 bytes / 512 bytes
    I/O size (minimum/optimal): 512 bytes / 512 bytes
    Disklabel type: dos
    Disk identifier: 0x33fc535e

    Device         Boot    Start      End  Sectors  Size Id Type
    /dev/mmcblk1p1         32768 53944319 53911552 25.7G 83 Linux
    /dev/mmcblk1p2      53944320 62333951  8389632    4G 82 Linux swap / Solaris
    ```

    创建完分区后，把`root`分区`mkfs.ext4`格式化成ext4，swap分区用`mkswap`格式化。

3. 解压alarm系统文件到root分区中
4. 复制并替换armbian的`/boot`中的文件到新建分区的`/boot`文件夹中。
5. 编辑`/boot/armbianEnv.txt`，更新`rootdev`的UUID
    使用`blkid`或者`lsblk -o+UUID`可以查看UUID，注意是**UUID**不是PARTUUID。
6. 插电，开机 (~~此处不会出现五安大电牛~~)，网线连接R4S的WAN口到路由器的LAN口，第一次开机需要生成SSH Key所以时间会久一些，然后就可以ssh到R4S上去辣。

### 内核

上述的安装步骤使用的armbian的内核，可以正常开机，但是想用Arch Linux stock aarch64内核的话，得替换一下DTB文件。（DTB文件是啥我目前还不清楚，如果后续弄明白了再更新到博客上吧）

1. ssh到R4S中，安装`linux-aarch64`。
2. 修改使用的DTB文件：
    ```
    cd /boot
    rm dtb
    ln -sf dtbs dtb
    ```
    编辑`armbianEnv.txt`，添加一行`fdtfile=rockchip/rk3399-nanopi-r4s.dtb`。

3. 创建uBoot镜像和initramfs。
    ```
    pacman -S uboot-tools
    mkimage -A arm64 -T ramdisk -n uInitrd -d /boot/initramfs-linux.img /boot/uInitrd-initramfs-linux.img
    ln -sf /boot/uInitrd-initramfs-linux.img /boot/uInitrd
    ```

    创建个`packman`的钩子，在以后更新`linux-aarch64`的时候自动的重新构建uboot和initramfs。
    在`mkdir -p /etc/pacman.d/hooks`目录下创建`/etc/pacman.d/hooks/initramfs.hook`
    ```
    [Trigger]
    Operation = Install
    Operation = Upgrade
    Type = Package
    Target = linux-aarch64

    [Action]
    Description = Generate uInitrd
    Exec = /usr/bin/mkimage -A arm64 -T ramdisk -n uInitrd -d /boot/initramfs-linux.img /boot/uInitrd-initramfs-linux.img
    When = PostTransaction
    Depends = uboot-tools
    ```
4. 重启，`uname -a`输出的应该是新版本的内核了。

## 后续

之后咱装了JDK以及一堆我常用的小组件。为了测试性能，我把我以前备份的Minecraft服务器复制到R4S上跑了一下试试。我的服务器之前是在疼讯云学生主机上跑的(1核2G)，装了好多性能优化插件(lithium，phosphor，carpet...)，版本是1.16.4，抱着尝试的心态跑了一下这个服务器结果发现很流畅，一开始区块加载的时候CPU的6个核心全跑满，之后就恢复到正常水平了。刚才尝试了一下长时间的生成区块貌似没什么大的问题，只要别一直用鞘翅跑图就行，性能比这学生云主机好很多，不过强多少我并没测。

毕竟这就是半个巴掌大小的主机，跑MC的时候CPU温度才不到50度，根本不需要主动散热，功耗还特别低。

!["MineCraft Server Performance"](images/nanopi_performance.png "MineCraft Server Performance")

!["Arch Linux ARM"](images/nanopi_neofetch.png "Arch Linux ARM")