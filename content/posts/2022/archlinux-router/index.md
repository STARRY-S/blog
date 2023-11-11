---
title: 在Arch Linux上配置软路由
date: 2022-06-08T00:49:34+08:00
layout: post
draft: false
tags:
- 软路由
- Arch Linux
categories:
- 教程
- Linux
---

之前买了个NanoPi R4S，当时给他装了Arch Linux ARM并用`systemd-networkd`配置了一个简易的软路由。不过`systemd-networkd`不支持PPPoE，所以当时我是把R4S接在租的房子的主路由下做子路由的，然后再给R4S接了一个小米路由器当作无线AP。最近从北京搬回家了所以想直接使用R4S做家里的主路由，因为[R4S上手体验](/posts/2022/nanopi-r4s/)的那篇文章已经写完很久了，所以就不打算在那篇博客上做修改了，而是新开（水）了一篇博客。

<!--more-->

> 这里偷偷骂一下长城宽带没人反对吧

## 准备工作

按照Arch Wiki的[Router页面](https://wiki.archlinux.org/title/Router#Connection_sharing)，你的电脑需要符合安装Arch Linux的基础硬件要求，且至少具备俩物理网口。

个人觉得软路由没必要非得刷*WRT或者其他路由器专用系统，也没必要搞个爱快群辉什么的系统，我只想给他装我喜欢的发行版，然后我自己配置我需要的服务，只要有两个以上的物理网口就可以配置路由功能，给他们配置DHCP和流量转发就完事了，这样搞出来的路由器更符合咱自己的需求，相对来讲也更灵活一些，不用受限于那些路由器/NAS定制的系统，而缺点则是比较折腾，有可能不稳定。

安装系统的步骤咱跳过不讲了，Wiki上有的东西没必要在这里重复一遍。

## 配置IP地址

首先，将你电脑的两个物理网口一个用作WAN口（连接广域网），一个用作LAN口（连接局域网），有需要的可以自行修改网口的名称（通常默认的网卡名字为`eth*`，或者`enp*s*`）。
为了和Wiki同步，这里假设WAN口的名字为`extern0`，用来指连接到广域网的网口，LAN口的名字为`intern0`，代指连接到局域网的网口。

本篇使用`netctl`配置网络，在修改配置文件之前，需要先停掉其他配置网络的服务。

给LAN口配置一个静态IP地址。

```
# /etc/netctl/intern0-profile
# Config file for intern0 (LAN)
Description='Private Interface. (LAN)'
Interface=intern0
Connection=ethernet
IP='static'
Address=('10.10.10.1/24')

IP6='static'
Address6=('fdaa:aaaa:bbbb::0001/64')
SkipNoCarrier=yes
```

以上配置将为LAN口设定IPv4的地址为`10.10.10.1`，IPv6的地址为`fdaa:aaaa:bbbb::0001`。
你可以给这个网口设定任意的局域网IP地址，通常为`10.*`，`172.*`，`192.168.*`这些网段的任意一个地址，
IPv6的局域网网段为`fd00::/8`，通俗一点讲就是`fd**`开头的一般都是局域网的IP地址。

之后给WAN口配置DHCP或PPPoE协议。

> 配置DHCP的方式自行翻Wiki或者看example，这里不重复讲了。

在配置PPPoE之前需要安装`ppp`。

```
# /etc/netctl/extern0-profile
# Config file for public interface (WAN)
Description='Public Interface. (WAN)'
Interface=extern0
Connection=pppoe
User='username'
Password='samplepasswd'
# IP6=stateless

# Always keep a connection established
ConnectionMode='persist'
```

使用以下命令启动`netctl`的配置文件。

```
netctl enable intern0-profile
netctl enable extern0-profile
```

重启路由器，将WAN口与光猫的网口连接，使用`ip addr`查看网络设备的IP地址，顺利的话，可以看到一个名为`ppp0`的网口，并获取了一个运营商分给你的IP地址。

```
1: intern0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether fa:97:da:d8:9d:8a brd ff:ff:ff:ff:ff:ff
    inet 10.10.10.1/24 brd 10.10.10.255 scope global intern0
       valid_lft forever preferred_lft forever
    inet6 fdaa:aaaa:bbbb::1/64 scope global nodad
       valid_lft forever preferred_lft forever
    inet6 fe80::f897:daff:fed8:9d8a/64 scope link
       valid_lft forever preferred_lft forever
2: extern0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether ca:1f:4a:9b:29:df brd ff:ff:ff:ff:ff:ff
    inet6 fe80::c81f:4aff:fe9b:29df/64 scope link
       valid_lft forever preferred_lft forever
3: ppp0: <POINTOPOINT,MULTICAST,NOARP,UP,LOWER_UP> mtu 1492 qdisc fq_codel state UNKNOWN group default qlen 3
    link/ppp
    inet 123.123.123.123 peer 123.123.123.1/32 scope global ppp0
       valid_lft forever preferred_lft forever
    inet6 240e:aaaa:bbbb:cccc:::eeee/64 scope global dynamic mngtmpaddr
       valid_lft 259132sec preferred_lft 172732sec
    inet6 fe80::aaaa:bbbb:cccc:dddd peer fe80::aaaa:bbbb:cccc:dddd/128 scope link
       valid_lft forever preferred_lft forever

```

如果遇到了问题，可以使用`systemctl status netctl@extern0\\x2dprofile.service`查看一下错误信息。
如果是认证失败的话，重启几次这个service说不定就好了。

## 配置DNS和DHCP

安装`dnsmasq`，编辑`/etc/dnsmasq.conf`。

```
# Setup listen address
listen-address=10.10.10.1,127.0.0.1

# Do not read /etc/resolv.conf
no-resolv

# Use following dns servers
server=114.114.114.114
server=8.8.8.8
server=8.8.4.4

# Bind interface
interface=intern0

# Setup domain
expand-hosts
domain=foo.bar

# Setup IPv4 DHCP
dhcp-range=10.10.10.100,10.10.10.255,255.255.255.0,12h
# Setup IPv6 DHCP
dhcp-range=fdaa:aaaa:bbbb::000a, fdaa:aaaa:bbbb::ffff, 64, 12h
```

使用`systemctl enable --now dnsmasq.service`启动`dnsmasq`，
之后重启路由器，使用网线连接将电脑连接到路由器的LAN口，顺利的话可以自动获取一个IP地址。

如果没获取到IP地址的话，有可能是DHCP服务器的问题，先尝试在电脑上手动设置一个IP地址，之后尝试ping路由器的IP（`10.10.10.1`）。
如果还是无法连接到路由器的话，就需要重新检查一下路由器的配置了。

## 网络共享

首先[参照Wiki](https://wiki.archlinux.org/title/Internet_sharing#Enable_packet_forwarding)，开启数据包转发的功能。

之后安装`iptables`，配置ipv4和ipv6的流量伪装。

```
iptables -A FORWARD -i intern0 -j ACCEPT
iptables -A FORWARD -o intern0 -j ACCEPT

iptables -t nat -A POSTROUTING -o ppp0 -j MASQUERADE
iptables -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i intern0 -o ppp0 -j ACCEPT

iptables -t mangle -A FORWARD -o ppp0 -p tcp -m tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu

ip6tables -t nat -A POSTROUTING -o ppp0 -j MASQUERADE
```

之后可使用`iptables-save -f /etc/iptables/iptables.rules`和
`ip6tables-save -f /etc/iptables/ip6tables.rules`将ip桌子的规则保存下来。

## Done

以上配置完成后，按理来说路由器就已经配置好了。

调试的过程为首先在路由器上尝试ping一个广域网的域名或IP地址（`8.8.8.8`），之后将路由器与电脑用网线连接，
电脑应当通过DHCP自动获取到一个随机的IP地址。
之后在电脑上尝试打开一些理应能打开的网站，应该是能打开的。

如果能电脑可以ping通一个广域网的IP，但是打不开网站的话，就检查一下路由器DNS配置，
如果路由器上能ping通一个广域网的IP，但电脑连IP地址都ping不通，那就去检查一下ip桌子的流量伪装规则，检查一下网口名字有没有写对之类的。

之后如果一切都调试成功的话，就可以把家里的无线路由器改成“有线中继”模式了，这样家里的无线路由器将只作为一个无线AP使用，路由的功能将全部由刚刚配置好的软路由实现。

配置好“有线中继”模式后，电脑连接无线WIFI后获得的IP地址应当是软路由分配的IP地址，网段为刚刚咱们设置的`10.10.10.*`，
而不再是`192.168.*`的IP地址了。
