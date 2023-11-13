---
title: 小米路由器3G折腾之刷OpenWrt记录
date: 2019-02-19T00:49:20+08:00
lastmod: 2021-01-23T12:36:44+08:00
layout: post
# comment: true
tags:
- 教程
- 路由器
- OpenWrt
categories:
- 教程
- 路由器
---

生命不息, 折腾不止...

<!--more-->

------

{{< music netease song 22802176 >}}

> 本篇由于创作时间过于久远，部分下载链接可能失效，因长期未更新，教程仅供参考。

## 准备工作

你至少需要以下工具：

* 路由器本体
* 网线
* 一个已格式化为FAT/FAT32格式的U盘, 用来刷开发者固件和ssh激活工具
* 一根怼`Reset`钮的针
* Windows用户需要一个SSH软件（例如：[putty](https://putty.org)）
* [小米路由器客户端](http://www1.miwifi.com/miwifi_download.html), 用来绑定你的小米账号

## SSH到路由器

> 路由器重启后指示灯会变为蓝色, 若变为红色则为刷机失败。

安装开发者固件并开启SSH权限：

1. 在[MiWiFi下载页面](http://www1.miwifi.com/miwifi_download.html)下载所需要的路由器开发者固件（ROM -> ROM for R3G开发版）,命名为`miwifi.bin`。

2. 路由器断电, 将下载好的开发者固件放入U盘插入路由器USB接口, 捅住reset扭接上电源后待指示灯为黄色闪烁时松开, 数分钟后路由器会自动重启, 此过程不要乱动路由器。

3. 小米路由器客户端登陆小米账号绑定路由器设备, 此过程需要路由器联网。

4. [MiWiFi开放平台](http://www1.miwifi.com/miwifi_open.html)登陆小米账号下载ssh激活工具命名为`miwifi_ssh.bin`, 记下root密码。

5. 操作方式同第二步骤, 刷入ssh激活工具。

SSH到路由器:

* Windows系统用putty, ip为`191.168.31.1`, 用户名：`root`, 密码为下载激活ssh工具时记下的密码。

* Unix/Linux系统终端执行：`ssh root@191.168.31.1`

  如果在ssh到路由器时遇到no matching key exchange method found错误，编辑`~/.ssh/config`, 加入下面两行：

  ```
  Host *
      KexAlgorithms +diffie-hellman-group1-sha1
  ```

## 刷入Bootloader（推荐/可选）

> 该步骤可选是因为Breed不支持直接刷入Openwrt固件, 可参考[这篇帖子](https://www.right.com.cn/forum/forum.php?mod=viewthread&tid=267455), 不过为了防止变砖, 还是推荐刷Breed。

Breed原作者为hackpascal, [此处为下载地址](https://breed.hackpascal.net/), 文件名为`breed-mt7621-xiaomi-r3g.bin`

第一种方法是ssh到路由器后通过`wget`下载breed文件再刷入（需要确保路由器联网）, 下载地址为https所以需要加上`--no-check-certificate`参数。

```
cd /tmp
wget --no-check-certificate https://breed.hackpascal.net/breed-mt7621-xiaomi-r3g.bin -O breed.bin
mtd -r write breed.bin Bootloader
```

另一种方法是将breed通过U盘拷贝到路由器再刷入。

```
mkdir /tmp/sdcard
mount /dev/sda1 /tmp/sdcard
mtd -r write /tmp/sdcard/breed.bin Bootloader
```

路由器刷写完毕后会自动重启, **在写入Breed的过程中不要动路由器**。

## 刷机

下载所需固件：

* tuna镜像站的OpenWrt下载地址：[https://mirrors.tuna.tsinghua.edu.cn/lede/releases/](https://mirrors.tuna.tsinghua.edu.cn/lede/releases/)

* 官方下载地址: [https://downloads.openwrt.org/releases/](https://downloads.openwrt.org/releases/)

### 使用Breed的刷机方法

按照hackpascal的说法是：

> 如果kernel0存在kernel1不存在, 那么启动kernel0
> 如果kernel1存在kernel0不存在, 那么启动kernel1
> 如果kernel0和kernel1都存在, 那么检查环境变量 `xiaomi.r3g.bootfw` 的值, 如果存在且值为 2, 那么启动kernel1, 否则启动kernel0

简单来说就是：路由器有两个内核, 需要在Breed里设置环境变量让路由器启动kernel1。

1. 刷入Openwrt固件到Kernel1
  ```
  mtd write openwrt-18.06.2-ramips-mt7621-mir3g-squashfs-kernel1.bin kernel1
  mtd write openwrt-18.06.2-ramips-mt7621-mir3g-squashfs-rootfs0.bin rootfs0
  ```

2. 路由器断电, 捅住reset按钮后通电, 待指示灯变为蓝色闪烁后用网线连接路由器到电脑, 浏览器打开网址`192.168.1.1`, 进入Breed界面。

3. 在环境变量编辑里添加`xiaomi.r3g.bootfw`字段, 值为`2`,保存后重启即可进入Openwrt。

### 没有刷入Breed的刷机方法

> [OpenWrt官网提供的教程](https://openwrt.org/toh/xiaomi/mir3g)是在没有刷入Breed的情况下刷入OpenWrt固件的。

ssh到路由器, 导入固件后刷机。

```
mtd write openwrt-18.06.2-ramips-mt7621-mir3g-squashfs-kernel1.bin kernel1
mtd write openwrt-18.06.2-ramips-mt7621-mir3g-squashfs-rootfs0.bin rootfs0
nvram set flag_try_sys1_failed=1
nvram commit

reboot
```

------

## Others

1. 如果刷了Breed + Pandavan/PandoraBox后想换回OpenWrt的话, 首先在Breed中刷回小米路由器开发版的官方固件, 然后SSH到路由器按照上述的使用Breed的刷机方法再刷机。

2. USB3.0会对路由器的2.4G频段信号造成干扰。

3. OpenWrt默认语言为英文, 可安装`luci-i18n-base-zh-cn`,`luci-i18n-base-zh-tw`安装简体/繁体中文。

4. [OpenWrt-dist](http://openwrt-dist.sourceforge.net)可拓展更多功能。

5. 为优化软件包安装速度, 可将opkg源改为国内：

  LuCI -> System -> Software -> Configuration 中将 Distribution feeds 的`http://downloads.openwrt.org`替换为`http://mirrors.tuna.tsinghua.edu.cn/lede`。

6. OpenWrt可安装软件包`libustream-openssl` `libustream-mbedtls`解决`wget`无法访问https服务器问题。

  然后建议把opkg源能改为https的都改为https。
