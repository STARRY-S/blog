---
title: 如何选择 zip 和 tar 文件格式
date: 2023-11-12T01:35:41+08:00
layout: post
tags:
- Archive
categories:
- 教程
---

最近遇到了一个归档文件格式选择的问题，于是顺手记录下来水一篇博客。

<!--more-->

----

## tar 文件格式

tar 格式早期是为了将数据记录在磁带上的（现在貌似也可以？），这种归档格式很简单，要将一个文件写入 tar 包的时候，首先写入记录文件信息的 header，在 header 之后记录文件的数据（tar 格式不支持压缩所以是直接把文件数据拷贝在了 header 后面）。

```text
+--------+
| header |
+--------+
|  data  |
+--------+
| header |
+--------+
|  data  |
+--------+
...
+--------+
| header |
+--------+
|  data  |
+--------+
|  end   |
+--------+
```

tar 有多种不同的格式，他们的 header 定义不同。这里用 Linux 系统上常用的 `tar` 工具（GNU tar），
GNU tar 中实现的 header 结构定义文档参考这个 [Basic Tar Format](https://www.gnu.org/software/tar/manual/html_node/Standard.html)。

GNU tar 的源码可以通过下面的方式克隆下载下来。

```console
$ git clone https://git.savannah.gnu.org/git/tar.git
```

在 `src/tar.h` 源码中可以找到 `posix_header` 的结构定义：

```c
struct posix_header
{				/* byte offset */
  char name[100];		/*   0 */
  char mode[8];			/* 100 */
  char uid[8];			/* 108 */
  char gid[8];			/* 116 */
  char size[12];		/* 124 */
  char mtime[12];		/* 136 */
  char chksum[8];		/* 148 */
  char typeflag;		/* 156 */
  char linkname[100];		/* 157 */
  char magic[6];		/* 257 */
  char version[2];		/* 263 */
  char uname[32];		/* 265 */
  char gname[32];		/* 297 */
  char devmajor[8];		/* 329 */
  char devminor[8];		/* 337 */
  char prefix[155];		/* 345 */
				/* 500 */
};
```

上面 header 的定义可以看出默认情况下文件名 `name` 长度不能超过 99 (最后一位要存储 `\0`)，但似乎后面 tar 协议支持了长文件名的情况，至于如何支持的不在本篇讨论范围内。

除了 `posix_header` 之外，还有 `star_header`、`gnu_header` 等 header 定义，至于这些 header 是如何被定义的以及他们的优缺点不在本篇的讨论范围内。

tar 的每个 block 都是 512 字节：

```c
/* tar files are made in basic blocks of this size.  */
#define BLOCKSIZE 512

union block
{
  char buffer[BLOCKSIZE];
  struct posix_header header;
  struct star_header star_header;
  struct oldgnu_header oldgnu_header;
  struct sparse_header sparse_header;
  struct star_in_header star_in_header;
  struct star_ext_header star_ext_header;
};
```

tar 文件的 end 是由至少两个 block size （1024字节）的空白（`\0`）组成。

### 栗子

因此这里可以用上面的 `posix_header` 结构简单的写一个创建 tar 归档的程序。

代码太长了所以放在了 [这里](https://github.com/STARRY-S/tar-example-c)。

### 压缩

在创建 tar 格式的文件时是不支持压缩的（除非你想魔改创建 tar 格式的步骤，但没这个必要）。如果想压缩的话可以把整个 tar 归档用 gzip/bzip2/zstd 等许多其他压缩格式进行压缩，文件后缀以 `tar.gz/tar.bz2/tar.zstd` 等。因为是先将文件写入 tar 归档，再将 tar 归档进行压缩，所以压缩的效果会比把文件单独压缩再合并成一个 tar 包效果要好一些。

## zip 文件格式

> 睡觉，明天再写。
