---
title: 树莓派之我的世界服务器
date: 2016-11-25 15:01:28
layout: post
# comment: true
tags:
- Minecraft
- 树莓派
categories:
- Minecraft
---

刚买树莓派3B时就想弄一个我的世界服务器，但是那时不懂Linux，服务器也就没建成。这一阵子打算把这个计划再捡起来，和同学一起联机的话树莓派还是能做到的。ARM系列的CPU性能肯定比X86_64电脑的CPU弱许多，外加上树莓派1G的运行内存，让它跑大型服务器肯定是不可能的，所以只能弄一个几个人联机的小服务器了。

<!--more-->

> 本篇由于创作时间过于久远，部分下载链接可能失效，因长期未更新，教程仅供参考。

> 终于可以继续更新博客了！原计划是11月之前更新博客的。不巧电脑出了问题，重装了一遍Arch Linux,后来又发生了一些事一直没能用电脑。由于开学到现在能放假供我写博客的时间少之又少，这篇原本在11月初就能发表的文章就这样被硬生生推迟到了11月末了。

## 材料以及工具

* 树莓派一只 （包括所需要的C10的内存卡以及刷好的固件以及5v，2.5A充电器）
* 一个支持DDNS的路由器（非必须）

> 如果不想用树莓派建服务器的话也可以按照本教程在电脑上搭建服务器。

## 配置树莓派

### 调整GPU可使用的内存：

毕竟用树莓派开服务器不需要占用GPU，直接调低。

Raspbian: `raspi-config`中将GPU内存分为16M。

Arch Linux ARM: `/boot/config.txt`中更改GPU显存为16

## 安装JAVA

Archlinux ARM:
```
$ sudo pacman -S jre8-openjdk
```

通用方法：
前往 **[JAVA下载页](http://www.oracle.com/technetwork/cn/java/javase/downloads/jdk8-downloads-2133151-zhs.html)** 下载树莓派（ARM架构，32位系统）所支持的JDK。

```
$ mkdir ./java
$ tar -zxvf 你所下载的JDK.jar.gz -C ./java/
```
在终端输入`./java/jdk1.8.0/bin/java -version`显示java的版本号。

## 部署服务器

本篇使用[Paper MC](https://github.com/PaperMC/Paper)部署服务器。
除了Paper之外还有Bukkit和Spigot以及原版可选。

使用以下命令启动服务器。

```
$ echo eula=True > eula.txt
$ ./java/jdk*/bin/java -Xms512M -Xmx1024M -jar ./spigot.jar
```
第一次运行会下载一些文件需要一定的时间。

网上有很多服务器插件和Mod什么的。本章中不做过多介绍.

## 用screen 保持服务器一直运行而不被关掉。

首先安装好screen。
```
$ screen
$ ./java/jdk1.8.0/bin/java -Xms512M -Xmx1024M -jar./paperclip.jar
```
在配置好你的服务器后就可以和小伙伴一起联机了。经过测试几个人简单的联机运行蛮正常的。
