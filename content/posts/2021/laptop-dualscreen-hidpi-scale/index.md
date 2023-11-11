---
title: 解决笔记本外接HIDPI显示器的缩放问题
date: 2021-01-09T22:12:54+08:00
lastmod: 2021-02-23T19:27:32+08:00
layout: post
tags:
- Arch Linux
- HIDPI
- Dual Moniter
categories:
- Linux
# comment: true
---

前天在狗东买了台27寸4K显示器，型号为优派VX2771-4K-HD，分辨率3840x2160，支持HDR 10bit色深（然而电脑只支持DP1.2），因为之前已经[配置好了optimus-manager](/posts/2021/archlinux-pavilion-gaming-laptop/)，所以电脑接上显示器就能亮，很幸运没有遇到物理问题。

然后一看4K屏上的字小得瞎眼。

如果设置分辨率为1080P，显示文字时会特别糊，根本没法看，效果还没有1080P显示器好。

<!--more-->

## 解决方法

首先按照[Wiki](https://wiki.archlinux.org/index.php/HiDPI)设置GNOME的HIDPI:

``` text
$ gsettings set org.gnome.settings-daemon.plugins.xsettings overrides "[{'Gdk/WindowScalingFactor', <2>}]"
$ gsettings set org.gnome.desktop.interface scaling-factor 2
```

在显示设置里将缩放调到200%后，界面被放大了2倍，在4K屏上的字倒是不瞎眼了。

但是因为笔记本是15寸1080P，所以笔记本上显示的字大得离谱。

解决方法是使用xrandr调整笔记本电脑的屏幕缩放，笔记本的分辨率为1920x1080，使用xrandr将画面的分辨率放大2倍，也就是调整为3840x2160，然后显示在分辨率为1920x1080的显示器上。

首先使用`xrandr`查看每个显示器所对应的设备名称和分辨率。

``` text
$ xrandr | grep "$extern connected"

  HDMI-0 connected primary 3840x2160+0+0 (normal left inverted right x axis y axis) 597mm x 336mm
  eDP-1-1 connected 1920x1080+0+2160 (normal left inverted right x axis y axis) 344mm x 193mm
```

这里HDMI-0是外接的4K显示器，分辨率为3840x2160，位置为(0, 0)。

eDP-1-1是笔记本的显示器，分辨率1920x1080，位置为(0, 2160)，在4K显示器的左下方。

参见[Wiki设置双显示器部分](https://wiki.archlinux.org/index.php/HiDPI#Multiple_displays)，用xrandr将笔记本的显示器缩放2倍，分辨率变为 \[1920 \* 2\]x\[1080 \* 2\]=3840x2160，位置还是在4K显示器的正下方。

``` text
$ xrandr --output eDP-1-1 --scale 2.0x2.0 --panning 3840x2160+0+2160 --output HDMI-0 --auto
```

因为不需要修改4K显示器的分辨率，所以HDMI-0设置为auto。

这样笔记本上的画面也显示正常了。

但是用过一阵子会发现笔记本显示器上的字比4K显示器上的字小很多，看起来不方便，所以把缩放倍数改为1.6（我是从1.5-2.0之间一点点试的，才找到最适合自己的缩放倍数），这样解决了字体大小的问题，不过笔记本画面还是会有模糊（能接受）。

> \[1920 \* 1.6\]x\[1080 \* 1.6\]=3072x1728

``` text
$ xrandr --output eDP-1-1 --scale 1.6x1.6 --panning 3072x1728+0+2160 --output HDMI-0 --auto
```

用到现在GNOME的缩放还算是完美，除了玩Minecraft用的HMCL启动器（Java程序）没有被放大之外~~（貌似缺配置，要是配置好了我再补充）~~，Steam界面缩放正常，饥荒、Dota2也都没问题。

> Java8不支持Hidpi缩放，如果想让HMCL支持缩放需要需要安装Java9以上的版本，所以还是算了，又不是不能用。
> 网易云音乐缩放方法参考[这篇博客](https://ntzyz.io/post/fix-cloud-music-linux-client-hidpi-issue)。
> qt5设置环境变量`QT_SCREEN_SCALE_FACTORS=2`。

## Others

 * 仅限GNOME，因为我只用GNOME所以不知道其他DE开HIDPI的效果是什么样。

 * 听说Wayland支持不同显示器设置不同的缩放倍数，但是我笔记本的HDMI是独显输出，自带屏幕为集显输出，想启用独显输出画面除了用大黄蜂之外只能Nvidia Optimus，然而Optimus不支持Wayland（F**K NVIDIA），
   于是我现在都不知道用Wayland上双显示器的效果是什么样子，只好改用xorg和optimus-manager切换显卡，再用xrandr调显示器的缩放倍数。

   或者买一根type-c转DP的线连显示器，我电脑的type-c支持DP1.2，可以输出4K60fps，而且走集显输出。

 * xrandr的指令是我自己试了很多遍试出来的，在我电脑上能用，期间遇到一堆问题(BadMatch)，没想好什么解决方法，所以在别的电脑上可能需要一些修改。

 * 如果你正考虑为你的笔记本购买一台新显示器而且你是Linux用户，你的笔记本又是双显卡，不知道HDMI是独显输出还是集显输出的话，建议你买一台和笔记本电脑的分辨率相同的显示器(或者2K)，这样能省去很多麻烦。

 * 用了几个月后经常遇到显示器通过HDMI连接到电脑但是没有视频输出的情况，所以现在改用的是type-c转DP的连接线，走集成显卡输出，就没有遇到过这个问题。
