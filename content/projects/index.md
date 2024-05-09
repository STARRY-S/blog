---
title: 项目
ShowBreadCrumbs: false
showtoc: false
ShowReadingTime: false
ShowWordCount: false
---

这里整理了一些咱个人的项目，感兴趣的可以去瞅瞅。

- [github.com/STARRY-S/zip](https://github.com/STARRY-S/zip)

    起因是 Go 的 `zip` 标准库不支持修改已有的文件，如果想向大体积的 ZIP 压缩包增添/替换文件的话只能重建整个新的 ZIP 文件，会占用很多时间和磁盘空间，于是咱仿照着 Go 的标准库增加了 `Updater`，可以向已有的 ZIP 压缩包文件增添新的文件 / 替换已有的文件。

    虽然是很普通的一个项目但很有意思，顺便了解了一下 ZIP 文件格式。

- [github.com/STARRY-S/esp32-pwm-controller](https://github.com/STARRY-S/esp32-pwm-controller)

    身为一只 Furry，苦于出毛没有适合自己的可调速内置风扇，于是写了这个 esp32 风扇远程调速程序，可以用手机连接 WIFI 远程 PWM 调节兽装的内置风扇速度，可以自定义改配置，十分好用，亲测可以连续高强度出毛几小时不吃风扇了。

- [github.com/STARRY-S/telebot](https://github.com/STARRY-S/telebot)

    咱自用的 Telebot，用来生成随机密码、计算 Digest、下载 GIF 动图、访问 NAS 状态等一些常用功能。

- [github.com/STARRY-S/Aperture](https://github.com/STARRY-S/Aperture)

    是咱大四的毕业设计，用纯 C 搓的一个游戏引擎，写的很乱，蛮有意思的，但现处于搁置状态。

----

下面是咱工作维护的项目……

- [Hangar](https://github.com/cnrancher/hangar)

    一个容器镜像相关的命令行工具，可以多线程批量拷贝容器镜像，CVE 漏洞扫描、签名校验等亿些功能。
