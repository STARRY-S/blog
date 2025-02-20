---
title: 海王星 4 MAX 3D 打印机入坑小记
date: 2025-01-06T21:24:37+08:00
layout: post
tags:
- 3D 打印机
categories:
- 3D 打印机
---

我为什么把 2024 年 11 月份该发的博客拖到了 2025 年来写……

<!--more-->

{{< music netease song 2099601427 >}}

----

最近经常折腾 Furry 相关的东西，因为兽装头骨、风扇外壳等好多身体零部件都是需要用 3D 打印来制作的，Cosplay 相关的一些道具也可以用 3D 打印来制作，所以就想搞一台 3D 打印机，打一些咱自己的身体部件。

需求的话就是这个打印机的尺寸至少得能打印兽装头骨，网上推荐刚入坑的新手买拓竹的 3D 打印机，但是搜了一圈拓竹并没有合适的大尺寸 FDM 打印机，于是纠结对比了一阵子创想三维和爱乐酷之后，在双十一的时候买了爱乐酷海王星 MAX 这个超级大的大尺寸 FDM 3D 打印鸡。

收到打印机后的第一感觉就买大了。这个打印机超级大，原本是打算找个桌子放它的结果发现桌子根本就放不下它，只能单独收拾出一块空间把这个打印机放在地板上。

打印耗材这方面因为咱不想用易脆、不防水且易变黄的 PLA 材质，于是直接跳过了新手教程找客服把赠送的 PLA 耗材全换成了 PETG，之后折腾了一两天时间速成了一下切片软件的食用方法，打印了几个小船和 Z-level 测试平面后，从网上下载一些开源的模型自己切片打印玩。

于是遇到了一些问题和解决问题后产生的问题。

## 网络连接

虽然海王星 4 MAX 支持 WIFI 无线连接，但是它自带的中控屏幕固件有亿些简陋。咱的 WIFI 密码有特殊字符而它的中控屏幕只能输入字母数字和一些简单的符号，这就导致打印机没办法直接连接咱的 WIFI。

最终的解决办法是网上几十块钱买了个带网口的 WIFI 无线中继器，把中继器的网口和打印机的网口用网线连接，这样就解决了 3D 打印机连接局域网的问题。在浏览器访问打印机局域网 IP 终于能完美使用满血的 Klipper 固件的 Web 控制台，从此不用每次打印模型时都来回插拔 U 盘传模型文件。

在网上查了一下这个 Klipper 固件实际就是一个 ARM64 架构的 Linux 系统，而且可以 SSH 远程登录。于是搜了一阵子之后找到了这个打印机的 SSH 用户名/密码为 `mks/makerbase`。 

```sh
$ ssh mks@192.168.10.101
mks@192.168.10.101's password: 
           _              _ 
 _ __ ___ | | _____ _ __ (_)
| '_ ` _ \| |/ / __| '_ \| |
| | | | | |   <\__ \ |_) | |
|_| |_| |_|_|\_\___/ .__/|_|
                   |_|      
Welcome to Armbian 22.05.0-trunk  with bleeding edge Linux 5.16.20-rockchip64

No end-user support: built from trunk

System load:   3%           	Up time:       1:28	
Memory usage:  19% of 976M   	IP:	       10.1.10.1
CPU temp:      55°C           	Usage of /:    77% of 6.6G   	

[ 0 security updates available, 259 updates total: apt upgrade ]
Last check: 2025-01-06 20:46

Last login: Mon Dec 16 23:19:31 2024 from 192.168.1.10
mks@mkspi:~$ neofetch 
                                 mks@mkspi 
                                 --------- 
      █ █ █ █ █ █ █ █ █ █ █      OS: Armbian (22.05.0-trunk) aarch64 
     ███████████████████████     Host: Makerbase mks-pi 
   ▄▄██                   ██▄▄   Kernel: 5.16.20-rockchip64 
   ▄▄██    ███████████    ██▄▄   Uptime: 1 hour, 29 mins 
   ▄▄██   ██         ██   ██▄▄   Packages: 1362 (dpkg) 
   ▄▄██   ██         ██   ██▄▄   Shell: bash 5.0.3 
   ▄▄██   ██         ██   ██▄▄   Terminal: /dev/pts/0 
   ▄▄██   █████████████   ██▄▄   CPU: (4) @ 1.200GHz 
   ▄▄██   ██         ██   ██▄▄   Memory: 199MiB / 976MiB 
   ▄▄██   ██         ██   ██▄▄
   ▄▄██   ██         ██   ██▄▄                           
   ▄▄██                   ██▄▄                           
     ███████████████████████
      █ █ █ █ █ █ █ █ █ █ █

```

SSH 连接到 Klipper 系统后，不要乱改系统里的文件，弄坏了的话得就重新刷固件了，应该会很麻烦。

## 打印噪音

一开始 3D 打印机的 Y 轴在打印过程中会出现奇怪的嗡嗡声，而且会随着 Y 轴平台的移动速度而变换声调。通常情况下解决打印机噪音的方法是降低打印速度，每次打印时蹲在它旁边感觉在听交响乐一样，但咱的这台打印机开狂暴模式并调速 150% 以上后居然能减小 Y 轴平台因缓慢移动而产生的嗡嗡声……

不过仅通过提高打印速度并不是噪音的最好的解决办法，而且提速反而容易导致打印失败（不过咱的这台打印机在打 PETG 时反而是在低速打印时更容易失败……），海王星 MAX 是基于 Klipper 固件，而且它的电机是使用的 TMC Driver (`tmc2209`)，于是在啃了一阵子 Klipper 官方文档后 (<span class="spoiler">RTFM</span>) 找到了一些优化噪音的配置文件。

### spreadCycle vs stealthChop

[根据 Klipper 官网](https://www.klipper3d.org/TMC_Drivers.html?h=stealthchop_threshold#setting-spreadcycle-vs-stealthchop-mode)的解释，默认情况下，Klipper 的 TMC 驱动器使用 **spreadCycle** 模式，该模式能提供更高的精度和更好的打印质量。然而这个模式和 **stealthChop** 模式相比噪音则更大一些。

可以通过设置 `stealthchop_threshold: 999999` 强制 TMC Driver 永远使用 **stealthChop** 模式。对应修改后的样例 `printer.cfg` 如下。

```yaml
[tmc2209 stepper_x]
uart_pin: PB9
run_current: 1.0
hold_current: 0.8
interpolate: True
stealthchop_threshold: 999999
driver_SGTHRS: 90
diag_pin:^PC0

[tmc2209 stepper_y]
uart_pin: PD2
run_current: 1.4
hold_current: 1.0
interpolate: True
stealthchop_threshold: 999999
driver_SGTHRS: 80
diag_pin:^PB8

[tmc2209 stepper_z]
uart_pin: PC5
run_current: 0.8
hold_current: 0.5
interpolate: True
stealthchop_threshold: 999999

[tmc2209 extruder]
uart_pin: PC4
run_current: 0.7
hold_current: 0.5
interpolate: True
stealthchop_threshold: 999999
```

在设置 XYZ 轴和挤出机 (Extruder) 都使用 **stealthChop Mode** 后，能感到打印噪音的确小了一点点。至于打印质量的变化实测没有太多的改变。改善的效果因人而异，如果觉得噪音大的话可以尝试使用 **stealthChop Mode** 但改善的效果可能并不是特别明显。

> **记得备份**

----

除此之外经过一段时间的观察发现咱的这个打印机只有 Y 轴移动时平台会有特别大的嗡嗡声，于是实在忍受不了照着网上的拆解视频把它的 Y 轴平台拆了下来，给它的 Y 轴滚轮调整了一下螺丝松紧度确保每个滚轮都能顺畅的转动而不是被履带硬拖着摩擦，顺便给每个轴承都上了点油（咱用的自行车链条油 XD），经过着一番调教之后，Y 轴平台的声音控制在能接受的范围了。

如果还是觉得 X/Y 轴的噪音有些难以接受，而且噪音是由于滚轴与轨道摩擦产生的，可以尝试在某宝搜一下海王星 4 MAX 改装线轨的套件，换成线轨能避免滚轴摩擦产生的异常噪音。至于改装后效果咱并没有试过，感兴趣的可以去试下。

## 加装摄像头

因为不想 3D 打印过程中总来回跑过去看它有没有出问题，或者不在家的时候担心打印机是否在贴心的给我准备回家的炒面惊喜，于是想装一个摄像头可以实时观察它的状态。

因为打印机是 Linux 固件，所以理论上支持 Linux 的摄像头（WebCamera）都可以用到这台打印机上面。咱有一个联想的 1080P 电脑摄像头，具体啥型号忘了但似乎市面上绝大多数电脑的 USB 免驱摄像头它都能用。海王星 4 MAX 的 Klipper 固件已经贴心的预装好了 Webcam 组件，所以理论上是可以插上 USB 摄像头就能用。

但实际情况是这个打印机的 `/dev` 目录下面一共有 5 个 Video 设备，`webcam.txt` 配置文件默认使用的是 `/dev/video4` 作为 USB 摄像头。

```sh
mks@mkspi:~$ ls /dev/video*
/dev/video0  /dev/video1  /dev/video2  /dev/video3  /dev/video4  /dev/video5
```

经过咱一段时间的使用后发现，这个机器有时重启过后，USB 摄像头的设备会莫名其妙变成 `/dev/video0`，而有时又会变回去 `/dev/video4`。
所以如果重启了打印机后发现摄像头画面不见了，那就编辑一下 `webcam.txt` 配置文件把 `/dev/video4` 改成 1-5 之间的数都试一下，每改完一次配置文件记得重启一下 Webcamd Service。

至于如何固定住这个 Video Device 的序号咱可不敢瞎折腾，咱可不想把系统搞坏了再去重装固件。

----

然后把这个摄像头固定到哪里也是个问题。如果找个三脚架把这个摄像头支在打印机旁边的话又有点太占空间了。在 Makerbase 上找到了一个比较符合咱需求的[摄像头支架模型](https://makerworld.com.cn/zh/models/207267#profileId-139768)，打印出来后还需要自备两根长一点的 M4 螺丝和螺母，感兴趣的可以去看看。

## 料盘干燥盒

沈阳的冬天空气湿度只有 20%，但 PETG 耗材裸露在空气中的话依旧会受潮影响打印质量。于是在网上找到了比较通用的米桶改装耗材料架的解决方案，买了变色硅胶当作干燥机，自己下载了模型打印的耗材料架，最终用特氟龙管连接米桶和打印机的断料检测器。咱最终折腾好的料架为这样子。

![](images/1.jpg)

## 其他的自定义配置

除了上面这些调整之外，这个打印机的热床加热比较缓慢。默认情况下打印机是只在开始打印时才开始对热床加热，从室温加热到 80 度需要二十分钟左右的时间。如果想避免掉每次打印时都要等十几分钟的热床加热时间，可以修改 Klipper 固件的配置，在打印机刚开机时就对热床进行加热到一定温度，这样在打印开始时就不需要等很久的热床加热时间了。

设置打印机开机时执行的自定义代码配置文件为：

```yaml
[delayed_gcode system_start]
# 系统启动 3 秒后执行以下 GCODE
initial_duration: 3
gcode:
  SET_HEATER_TEMPERATURE HEATER=heater_bed TARGET=60 # 热床加热至 60 度
```

当然开机之后就开启热床预热会产生额外的电费，所以这些配置可能仅适用于咱自己用。
