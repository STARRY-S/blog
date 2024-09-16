---
title: Pandavan 安装 UU 加速器插件
date: 2024-09-16T12:38:31+08:00
layout: post
tags:
- Pandavan
- 路由器
categories:
- 路由器
---

## 起因

> 省流：这段都是废话，想看安装教程的可直接跳过到下一节

前阵子搬了新家，办了新的宽带，和联通安宽带的师傅要了光猫桥接。原本是打算用 NanoPi R5S 拨号上网，但 RK3568 这个 ARM 芯片尽管性能蛮强的，但 PPoE 拨号没有硬件加速，跑不满千兆宽带，而且打游戏网络延时有时还忽高忽低，用起来很不舒服。

因为光猫桥接之后联通还非常贴心的主动给了 IPv4 公网 IP，所以不打算改回光猫拨号模式，于是翻出了很久之前用的小米路由器 R3G，刷了 Pandavan 毛子固件，这个小米路由器虽然芯片性能没有 NanoPi R5S 强，但它有 PPPoE 硬件加速，拨号上网后测速能直接能跑满千兆网口。

<!--more-->

于是现在家里是用这个小米路由器 R3G 作为主路由 PPPoE 拨号 + 主网关使用，通过网线连接屋子里的另两个有线中继路由器作为 AP。因为咱已经有一台 X86 架构的 NAS，也没有软路由的需求，所以 NanoPi R5S 现在想不出拿它做点什么于是先闲置起来了。

## 安装脚本

网易[官方提供的 UU 加速器插件脚本](https://router.uu.163.com/app/html/online/baike_share.html?baike_id=5f963c9304c215e129ca40e8)不支持 Pandavan 系统，但是简单搜了一下网上已有的教程发现 Pandavan 系统的安装方式和 OpenWRT 比较类似，只需要在官方脚本的基础上改一下插件的安装位置以及开机自启动脚本就行。不过网上能找到的教程比较老，于是咱下载了最新的 UU 加速器插件脚本，在此基础上魔改了一下，增添了 Pandavan 系统的支持。

修改后的插件脚本放在了 [github.com/STARRY-S/pandavan-uu-plugin](https://github.com/STARRY-S/pandavan-uu-plugin) 这里，照着中文的安装教程在路由器上执行 `install.sh` 就行。

安装脚本日志默认输出在 `/tmp/install.log`，如果安装成功，打开手机上的 UU 主机加速 APP 就能识别到路由器。

这个安装脚本仅在咱的小米路由器 R3G 上做了测试，其他陆游器可能会有问题。
