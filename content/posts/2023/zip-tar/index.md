---
title: 如何选择 zip 和 tar 文件格式
date: 2023-11-12T01:35:41+08:00
lastmod: 2023-11-12T12:21:22+08:00
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

tar 有多种不同格式的 header。这里可以看 Linux 系统上常用的 `tar` 工具（GNU tar）代码，
GNU tar 中实现的 header 结构定义文档参考这个 [Basic Tar Format](https://www.gnu.org/software/tar/manual/html_node/Standard.html)。

GNU tar 的源码可以通过下面的方式克隆下载下来。

```console
$ git clone https://git.savannah.gnu.org/git/tar.git
```

在 `src/tar.h` 源码中可以找到 header 结构定义，其中 `posix_header` 的定义为：

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

上面 header 结构可以看出默认情况下文件名 `name` 长度不能超过 99 (最后一位要存储 `\0`)，但似乎后面 tar 协议支持了长文件名的情况，至于如何支持的各位感兴趣的可以自行去搜一下。

除了 `posix_header` 之外，还有 `star_header`、`gnu_header` 等 header 结构，header 结构体占据的空间小于 512 字节，而 tar 的每个 block 都是 512 字节，所以一个 header block 占据 512 字节，末尾空余的字节填写 `\0`，文件也以 512 字节为单位写在 header block 后面，多出来的空间填写 `\0`：

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

tar 文件的 end 是由至少两个 block size （1024字节）的空白（`\0`）组成，但是 GNU tar 创建出来的 tar 包的 end 长度可能大于两个 block size，因为似乎它创建的 tar 包的文件体积以 10K 为单位进行了对齐，可以用下面的方式验证一下：

```console
$ echo "hello world" > 1.txt
$ tar -cv 1.txt -f test.tar
1.txt
$ ls -al test.tar
-rw-r--r-- 1 starry-s starry-s 10K Nov 12 11:42 test.tar
```

用 `hexdump` 可以看一下创建的 tar 包中包含的数据：

```console
$ hexdump -C ./test.tar
0000000   1   .   t   x   t  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0
0000010  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0
*
0000060  \0  \0  \0  \0   0   0   0   0   6   4   4  \0   0   0   0   1
0000070   7   5   0  \0   0   0   0   1   7   5   0  \0   0   0   0   0
0000080   0   0   0   0   0   1   4  \0   1   4   5   2   4   0   4   5
0000090   3   5   4  \0   0   1   2   1   1   2  \0       0  \0  \0  \0
00000a0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0
*
0000100  \0   u   s   t   a   r          \0   s   t   a   r   r   y   -
0000110   s  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0
0000120  \0  \0  \0  \0  \0  \0  \0  \0  \0   s   t   a   r   r   y   -
0000130   s  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0
0000140  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0
*
0000200   h   e   l   l   o       w   o   r   l   d  \n  \0  \0  \0  \0
0000210  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0  \0
*
0002800
```

其中前 `0x200` 长度 (512 bytes) 存储的是 header，`0x200` ~ `0x2800` (10240 bytes) 区域存储了文件的数据 (`hello world\n`)，文件数据后面均为空白 `\0`，整体的 tar 包文件大小对齐到了 10K。

### 栗子

因此这里可以用上面的 `posix_header` 结构体简单的写一个创建 tar 归档的程序。

因为 header 中还包含了简易的计算 header 校验和的步骤，所以代码比较长，可以在 [这里](https://github.com/STARRY-S/tar-example-c) 找到。

### 压缩

在创建 tar 格式的文件时是不支持压缩的，文件的数据直接写在了 header 后面（除非你想魔改创建 tar 格式的步骤，但没这个必要）。如果需要压缩的话是把整个 tar 归档用 gzip/bzip2/zstd 等其他压缩格式进行压缩，文件后缀为 `tar.gz/tar.bz2/tar.zstd` 等。因为是先将文件写入 tar 归档，再将 tar 归档进行压缩，所以压缩的效果会比把文件单独压缩再合并成一个 tar 包效果要好一些。

### 特点

从上面的 tar 归档文件格式可以看出，tar 包中的文件是一个一个顺序排列起来的，因此 tar 包中是允许两个相同名称的文件存在的。

如果想向 tar 包末尾附加新的文件的话也很简单，只需要找到末尾的 end block，将其覆盖重写新的文件的 header，之后再写入新文件的数据即可，因此向未压缩的 tar 包附加新的文件（甚至是覆盖掉末尾的一些文件）都是可行的。但是如果想向已压缩的 tar 包（例如 `tar.gz`）附加文件就不太可行了，除非先把 `tar.gz` 解压为 `tar` 格式，附加新的文件后再重新压缩成 `tar.gz`，但这样如果 tar 文件体积很大的话会造成额外的磁盘空间浪费和性能、时间的浪费。

还有一点是 tar 中存储的文件是顺序排列起来的，但他没有一个 index 索引记录了每个文件的 header 所处的 offset。所以如果想知道一个 tar 包里面存了哪些文件的话，要从头到尾的遍历一遍 tar 包，因此如果这个 tar 包文件体积很大且包含很多零散的小文件的话，每次都要遍历读取 tar 包中的所有 header，会很麻烦。

因此 tar 包不适合随机读取，未压缩的 tar 包还好，只要在首次打开文件时遍历一下把每个文件的 header 和 offset 记录下来就行，但如果是压缩过的例如 `tar.gz` 格式的压缩包，几乎就没办法随机读取（除非你得再去折腾 `gzip` 数据流，但几乎没人去这么做），如果想随机解压 `tar.gz` 中的某个文件，要从头开始先解压 `gzip` 数据流，从解压的数据流中遍历每个 tar header，在查找到待解压的文件 header 后再将其解压存储下来，麻烦得很！

所以 `tar` 以及 `tar.gz` 等压缩的 `tar` 归档格式通常适合用在不需要随机读取，不需要向归档末尾附加文件的场景。

## zip 文件格式

> 睡觉，明天再写。
