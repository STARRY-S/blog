---
title: 自建RSS服务器：Miniflux
date: 2022-03-01T22:24:17+08:00
# lastmod: 2021-11-09T03:45:31+08:00
tags:
- 教程
- Miniflux
- RSS
categories:
- 教程
- 其他
---

之前咱自己搭过一个Miniflux服务器，不过当时用得并不频繁，逐渐的被咱弃用了。

最近想订阅一些网站，因为使用RSS订阅的话，能收到更新提醒，不用经常的翻收藏夹去看页面内容有没有更新，使用RSS订阅的话也方便集中管理一些，
而且还能绕开推荐算法，只看自己想看的内容，这点还是蛮重要的。

思考了几天发现我确实需要一个RSS订阅服务器后，于是决定这次把搭建过程记录下来，省得以后又忘了。

<!--more-->

----

## 准备

Miniflux官方文档（EN）：<https://miniflux.app/docs/index.html>

## 安装

此部分配合官方文档食用：<https://miniflux.app/docs/installation.html>

### 配置数据库：

首先需要安装postgresql数据库。安装方法因发行版而异，网上一搜就有。

```
# Switch to the postgres user
$ sudo su - postgres

# Create a database user for miniflux
$ createuser -P miniflux

# Create a database for miniflux that belongs to our user
$ createdb -O miniflux miniflux

# Create the extension hstore as superuser
$ psql miniflux -c 'create extension hstore'

# Change postgres password
$ psql
> \password
```

### 安装Miniflux：

不同的发行版使用方法不一样，咱的这台服务器为Ubuntu，所以参照[这里的教程](https://miniflux.app/docs/howto.html#apt-repo)配置APT源，安装Miniflux。

```
curl -s https://apt.miniflux.app/KEY.gpg | sudo apt-key add -
echo "deb https://apt.miniflux.app/ /" | sudo tee /etc/apt/sources.list.d/miniflux.list > /dev/null
apt update
apt install miniflux
```

## 配置Miniflux

默认配置文件为：`/etc/miniflux.conf`。

```
# See https://miniflux.app/docs/configuration.html

LISTEN_ADDR=0.0.0.0:8080
LOG_DATE_TIME=yes
DATABASE_URL=user=postgres password=<YOURPASSWORD> dbname=miniflux sslmode=disable

# Run SQL migrations automatically
# RUN_MIGRATIONS=1
```

之后线将刚刚创建的数据库用户`miniflux`设置为超级用户。

```
$ sudo su - postgres
$ psql
> ALTER USER miniflux WITH SUPERUSER;
```

使用以下指令创建数据库表，并创建用户：

```
$ miniflux -c /etc/miniflux.conf -migrate
$ miniflux -c /etc/miniflux.conf -create-admin
```

之后将`miniflux`切换回普通用户。

```
$ sudo su - postgres
$ psql
> ALTER USER miniflux WITH NOSUPERUSER;
```

最后重新启动`miniflux`。

```
$ sudo systemctl restart miniflux
```

## 配置SSL（可选）

使用nginx转发流量，可以将服务器套在Cloudflare下面。

编辑nginx的服务器配置文件，创建一个端口为443的服务器，并指定SSL key的位置：

```
server {
	listen 443 ssl default_server;
	listen [::]:443 ssl default_server;

	server_name miniflux;

	ssl_certificate /path/to/server.crt;
	ssl_certificate_key /path/to/server.key;
	ssl_protocols TLSv1 TLSv1.1 TLSv1.2;

	location / {
    		proxy_pass  http://127.0.0.1:8080;
	}
}
```

之后执行`sudo systemctl restart nginx`，访问服务器地址即可。

## Others

Miniflux支持Fever和Google Reader等第三方服务，参考[官方文档](https://miniflux.app/docs/services.html)，可以在服务器的设置->集成页面中配置，之后在别的设备中安装客户端，可以阅读订阅的文章，比网页版好用一些。

**STARRY-S**
