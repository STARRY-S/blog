---
title: 移动GM220-S光猫改桥接小记
date: 2022-07-07T17:54:35+08:00
layout: post
draft: false
tags:
- 光猫
- 桥接
- 路由器
categories:
- 教程
---

最近搬了新的住处，用的是移动的宽带，因此尝试着把移动的光猫改成桥接，接到我的软路由上面。

<!--more-->

因为我不知道PPPoE拨号的帐号和密码，尽管这个光猫的超级密码网上一搜就能找到，但是我不知道PPPoE帐号的密码就算改了桥接也没办法拨号。
于是先借助网上能搜到的资料尝试把宽带帐号的密码给搞出来。

----

一开始尝试着登录光猫的后台页面，在设置拨号上网的页面那里F12大法，把`input`元素的`type="password"`改成`type="text"`，
但是发现这里预填写的密码已经是加密过的`******`，因此这个方法行不通。

然后看教程有说尝试打开光猫的telnet，把配置文件用ftp传出来，但是试了一下所有的尝试打开telnet的方式在这个光猫上都不好使，于是这个方法也行不通。

之后在光猫登录管理员帐号之后，在“管理->设备管理->USB备份配置"这里找到了可以把配置文件备份到U盘的地方，
于是找了一张空内存卡格式化成`FAT32`，放读卡器里插在光猫上，把配置文件备份到U盘上。

![](images/1.png "备份至USB")

> 这里备份之后不要立即把U盘拔下来，貌似光猫在备份完配置文件后没有立即把数据`sync`到U盘中，需要等一阵子再拔U盘。
> 等多久我也不确定，反复试几次直到U盘上出现了`e8_Config_Backup`文件夹就可以了。

然后下载[RouterPassView](http://www.nirsoft.net/utils/router_password_recovery.html#DownloadLinks)，
用这个工具打开配置文件，就可以找到里面光猫上的所有配置了，包括宽带帐号和密码。

之后在网络设置里面改桥接，就可以用软路由拨号上网辣。

-----

使用了一下移动的宽带发现貌似他们把所有的ICMP的ECHO回显请求屏蔽掉了，所以尝试ping任何IP都是不通的。别的貌似没什么问题。