---
title: 使用HMCL启动Minecraft
date: 2018-07-29T17:26:35+08:00
layout: post
tags:
- Minecraft
- HMCL
categories:
- Minecraft
---

终于到了暑假可以开一个Minecraft服务器和小伙伴联机的时候了！在发现我对吃鸡那类的游戏除了觉得好玩以外没有任何天赋( ~~没钱买鼠标？~~ )后打算继续玩我的世界，所以为了方便那些想玩Minecraft（非网易代理版）但是还不知道怎么操作的那些小伙伴们，这篇教程就这么诞生了。

<!--more-->

> 本篇由于创作时间过于久远，部分下载链接可能失效，因长期未更新，教程仅供参考。

> 本教程将分为二个部分，第一部分将指导你如何使用HMCL启动器安装并使用Minecraft（非网易代理版），第二部分处理一些常见的问题。
> 本教程主要写给Windows用户，我想Linux用户不太需要我的教程了吧。。
> 可能有人是刚接触电脑的新人，所以我尽可能的把每一步都写详细清楚，方便大家的理解。

本教程仅提供所述内容的下载连接，游戏的版权归Mojang所有。

顺便说一下网易版并不支持MacOS哈哈哈哈。。。。

## 第一部分：

**如果你尚未在官网购买正版的Minecraft，你可以使用HMCL（[Hello Minecraft Launcher](https://github.com/huanghongxun/HMCL) )启动器下载并运行MC。**

1.
你需要确保你的电脑已安装java8。下载java：http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html

2. 接下来你需要下载HMCL启动器。

我建议去[HMCL的官方服务器](https://ci.huangyuhui.net/job/HMCL/) 下载所需的`exe`文件，最好不要从贴吧/论坛下载来路不明/非最新版本的HMCL启动器。

选择最新版本的后缀为`.exe`的文件下载即可。或者你可以下载后缀为`.jar`的文件（用于Linux，MacOS）

3. 新建一个文件夹（放在你喜欢的位置例如桌面），将下载的`exe/jar`文件复制到这里。

Windows用户直接双击exe文件运行即可，

Linux用户你下载的是jar文件所以如果你想运行你需要新建一个可执行文件：

```
$ cd 你的文件夹名称
$ echo "java -jar hmcl-对应的版本号.jar" > ./start.sh
$ chmod 744 ./start.sh
```

然后在终端执行`./start.sh`。

或者直接在终端执行`java -jar hmcl-*.jar`即可。

4. 设置一个你喜欢的名字并一直使用它，选择离线模式

在HMCL里点击右下角的加号下载游戏文件,建议将游戏下载到你启动器所在的文件夹内。

**如果你已购买正版Minecraft，在确保java安装好后直接去官网下载启动器再到启动器中下载游戏即可，可能会因网络原因速度慢，这是正常现象。**

**请支持正版，RMB165，可使用支付宝。**

## 第二部分：
1. 笔记本双显卡用户请确保你正确的安装了显卡驱动（新买的笔记本不知道什么是显卡驱动就默认已经安装好了），NVIDA显卡用户在桌面右键选择NVIDIA控制面板（没有这个选项可能是你的显卡驱动没安装好），选择 **3D设置->管理3D设置** ，选择添加，找到你安装的JAVA目录下的java.exe，将其设置为高性能处理器。然后保存设置并退出。（ps现在市面上新出的笔记本用集成显卡玩这个游戏也已经很流畅了）

在游戏中按F3，若右侧有NVIDIA字样就说明你已成功的使用独显运行游戏了，在左侧可以观察帧数。

2. Linux用户如果可以启动HMCL但是无法启动游戏错误报告是有关OpenGL的话在确定显卡驱动配置正常后检查一下是否安装了`xorg-xrandr`。

3. 64位系统的用户不要安装32位的java，不仅影响性能而且对可使用的内存大小也有限制。

4. Linux用户如果想用独显玩Minecraft而日常使用时切换回省电的集显，请参考 [Linux下使Steam调用Bumblebee使用独显](https://sh.alynx.one/posts/Steam-with-Bumblebee/),当然不同的Linux Distribution方法会有不同，请linux用户自行摸索。

## 相关内容：

* [教程/成功地启动游戏-Minecraft Wiki](https://minecraft-zh.gamepedia.com/index.php?title=%E6%95%99%E7%A8%8B/%E6%88%90%E5%8A%9F%E5%9C%B0%E5%90%AF%E5%8A%A8%E6%B8%B8%E6%88%8F&variant=zh-cn)
* [官方网站|Minecraft](https://minecraft.net/zh-hans/)
* [树莓派之我的世界服务器](https://blog.starry-s.moe/posts/2016/raspberrypi-mc-server/)

如果你感兴趣想一起联机我的世界的话欢迎联系我，大家一起来Van游戏。
