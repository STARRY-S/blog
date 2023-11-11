---
title: 入手一台家用级 APC UPS
date: 2023-01-08T11:05:02+08:00
layout: post
tags:
- 碎碎念
- 日常
categories:
- 日常
---

为了让咱的 NAS 长时间稳定运行，斥巨资买了一台 APC BK650M2-CH，在 Arch Wiki 上看 APC 的 UPS 对 Linux 的支持比较友好，于是挑了个最便宜的带停电自动关机的 APC UPS，防止咱啥时候忘了交电费导致停电数据受损。

<!--more-->

> 参烤链接: [APC UPS - ArchWiki](https://wiki.archlinux.org/title/APC_UPS)

----

UPS 到手后花了半个多小时读使用说明书，然后第一件事是把 UPS 的断电报警蜂鸣器关掉，省得我不在公寓的时候停电了 UPS 叫个没完吵到邻居。

之后在装 UPS 之前先把我电脑支架背面一团电线重新整理了一遍，现在是台式机、显示器、NAS、光猫、路由器、无线 AP 都放在一起了，他们的电源线、网线、数据线、显示器线都团在了一起，整理起来炒鸡麻烦。

先把漏油器、光猫和 NAS 的电源都插 UPS 上，然后接好 UPS 的 USB 数据线到 NAS 上。

## 安装 apcupsd

安装 `apcupsd`，然后 `systemctl enable --now apcupsd.service`。

```console
$ sudo apcaccess status
APC      : 001,036,0869
DATE     : 2023-01-08 11:09:23 +0800
HOSTNAME : ApertureNAS
VERSION  : 3.14.14 (31 May 2016) unknown
UPSNAME  : ApertureNAS
CABLE    : USB Cable
DRIVER   : USB UPS Driver
UPSMODE  : Stand Alone
STARTTIME: 2023-01-02 23:57:44 +0800
MODEL    : Back-UPS BK650M2-CH
STATUS   : ONLINE
......
```

先把 NAS 里所有的应用都停掉，之后编辑 `/etc/apcupsd/apcupsd.conf`，把 `TIMEOUT` 改为 `1`，然后给 UPS 断电，这时 NAS 会自动关机。

> UPS 重新连接电源后，NAS 可能会自动开机，我的 NAS 是这样，但不确定所有 NAS 都这样。

## 配置自动休眠

按照 Wiki 配置停电后自动休眠 (Hibernate / 休眠到硬盘)。

> 在此之前，需要创建 swap 分区 (或 swap file)，然后配置休眠需要的内核参数并重构 `initramfs`。

以 root 用户创建 `/usr/local/bin/hibernate`：

```sh
#!/bin/bash
# Hibernate the system - designed to be called via symlink from /etc/apcupsd
# directory in case of apcupsd initiating a shutdown/reboot.  Can also be used
# interactively or from any script to cause a hibernate.

# 可以在这里加一些在休眠之前执行的操作，例如让 bot 发个邮件提醒停电了之类的

# Wall message
# 广播消息
wall -n System will be hibernate soon

sleep 1

# Do the hibernate
# 执行休眠
/usr/bin/systemctl hibernate

# At this point system should be hibernated - when it comes back, we resume this script here
# 现在，系统应当已经休眠了，当系统恢复运行的时候，脚本会继续从这里执行

# 可以在这里加一些在系统恢复之后的操作，例如让 bot 发个邮件提醒电力恢复了啥的

# On resume, tell controlling script (/etc/apcupsd/apccontrol) NOT to continue with default action (i.e. shutdown).
exit 99
```

别忘了赋予可执行权限。

```console
# chmod +x /usr/local/bin/hibernate
```

创建软链接把脚本链接到 `/etc/apcupsd` 目录下面。

```console
# ln -s /usr/local/bin/hibernate /etc/apcupsd/doshutdown
```

此时给 UPS 断电后，NAS 会自动休眠，等一两分钟 NAS 会完成休眠，但 UPS 仍处于运行状态没有关机，长时间停电的话，UPS 的电量会耗尽。

UPS 接回电源后，NAS 会从休眠中恢复。

### 配置休眠后关闭 UPS 电源

创建 `/usr/lib/systemd/system-sleep/ups-kill`：

```bash
#!/bin/bash

case $2 in

  # In the event the computer is hibernating.
  hibernate)
    case $1 in

       # Going into a hibernate state.
       pre)

         # See if this is a powerfail situation.
         if [ -f /etc/apcupsd/powerfail ]; then
           echo
           echo "ACPUPSD will now power off the UPS"
           echo
           /etc/apcupsd/apccontrol killpower
           echo
           echo "Please ensure that the UPS has powered off before rebooting"
           echo "Otherwise, the UPS may cut the power during the reboot!!!"
           echo
         fi
       ;;

       # Coming out of a hibernate state.
       post)

         # If there are remnants from a powerfail situation, remove them.
         if [ -f /etc/apcupsd/powerfail ]; then
           rm /etc/apcupsd/powerfail
         fi

         # This may also exist, need to remove it.
         if [ -f /etc/nologin ]; then
           rm /etc/nologin
         fi

	 # Restart the daemon; otherwise it may be unresponsive in a
         # second powerfailure situation.
	 systemctl restart apcupsd
       ;;
    esac
  ;;
esac
```

赋予可执行权限：

```console
# chmod +x /usr/lib/systemd/system-sleep/ups-kill
```

接下来给 UPS 断电，NAS 会自动休眠，等 NAS 休眠后再过几分钟 UPS 也会关机。

UPS 关机后，给 UPS 接上电源，这时 UPS 会自动开机，然后 NAS 也会从休眠中恢复。

> 不要在 UPS 还没关机的时候给 UPS 重新接回电源，会导致 UPS 关机后 NAS 刚从休眠中恢复就被强制断电。

## 其他

折腾 UPS 的时候顺手给 NAS 换了个散热器升级了一下内存。AMD 原装散热器有亿点点吵所以换成了咱之前买的 ITX 散热器。

{{< figure src="images/1.jpg" title="" >}}

用咱写的 telebot 查看一下空载时的 CPU 温度才不到 30 度。

```text
CPU: +28.2°C
Uptime: 0.15 Hour
TotalRAM: 46.45G
FreeRAM: 42.66G
AvailableRAM: 43.91G
TotalSwap: 46.00G
FreeSwap: 46.00G
```

运行一个虚拟机一个 MineCraft 服务器，CPU 温度不到 40，所以很安静。

但是 UPS 它有噪音，晚上睡觉的时候能听见 UPS 它嗡嗡响，比 AMD 散热器的风扇动静还大，这个实在是无解，算了就先这样吧。
