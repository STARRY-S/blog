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

{{< music server="netease" type="song" id="27594398" >}}

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

zip 压缩包中文件的布局也是依次顺序排列的，文件的 data 可以是未压缩的文件原始数据 (`Store`)，或者是使用 Deflate 算法压缩后的文件数据。
在 zip 文件末尾还有一块区域，记录了每个文件 header 的索引信息，叫做 `directory` (`central directory record`)，`directory` 后面还有一小块区域用来记录 `directory` 的长度和数量等信息 (`end of central directory record`)。

zip 压缩包中文件的数据布局简单描述一下是这个样子：

```text
+---------------+
| header        |
+---------------+
| data          |
+---------------+
| header        |
+---------------+
| data          |
+---------------+
...
+---------------+
| header        |
+---------------+
| data          |
+---------------+
| directory     |
+---------------+
| directory     |
+---------------+
....
+---------------+
| directory     |
+---------------+
| directory end |
+---------------+
```

详细的 `zip` 文件格式定义在 [这里](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)，因为 `zip` 包中，每个文件的 header 长度是不固定，而且还分为早期的 `zip` 和后续新增的 `zip64` 两种格式，手搓代码还蛮复杂的，图省事咱就不写样例代码了。

### 特点

所以 `zip` 格式支持随机读取，如果想知道 `zip` 中存储了多少文件的话，只需要读取文件末尾的 `directory`。和 `tar` 一样 `zip` 也允许存在多个重名的文件。
而 `zip` 中存储的文件如果压缩的话，是每个文件单独压缩再写入到 `zip` 归档的，所以压缩的效果会较 `tar` 把所有文件都打包到一起再压缩要差些。

如果想向已有的 `zip` 压缩包中增加新的文件，需要将新文件 header 和数据从 `directory` 处覆盖掉，最后重新在文件末尾写入新的 `directory record`。

所以 zip 看起来比 tar 格式要更灵活一些，支持随机读取，同时还支持在不解压整个压缩包的情况下，增加新的文件。

zip 支持 Deflate 压缩算法或 Store 不压缩仅存储文件原始数据这两种方式。Deflate 压缩算法与 `gzip` 使用的 Deflate 压缩算法是一个东西。区别就是 zip 是把文件单独用 Deflate 算法压缩，存储起来，而 `tar.gz` 是将所有文件先打包到一起，再用 Deflate 算法压缩。

## 背景

上面说了这么多，zip 和 tar 的区别读着应该都已经清楚了。下面咱讲一下为什么要调查这个问题，写这篇博客，不感兴趣的话可以浏览器右上角关掉这个页面节省时间。

起初是咱写了一个将容器镜像的 Blobs 文件导入/导出成一个压缩包的工具（类似 `docker save/load`，但是要支持多架构和多平台一起导出）（关于这个工具等咱逐渐完善后有时间的话打算单独再写一篇博客），一开始用的是 `tar.gz` 格式压缩。导出的逻辑是先把容器镜像的 Blobs (Layers, Manifest 和 Config) 文件先全部下载到本地，之后把这这些巨大的文件打包成一个 `tar.gz` 压缩包。逻辑上没什么问题，但是容器镜像普遍体积不小，尤其是要导出上百个镜像时，最后创建的 tar 包体积要几十个 GB。所以先把 Blobs 文件下载到本地占用了一次磁盘空间，再把本地未打包的 Blobs 文件打包成一个 tar 包又占用了一次空间。最后搞得磁盘被占据了双倍的空间。

这还不算什么，如果在导出容器镜像时有时会遇到网络问题或其他因素导致某些镜像 Blobs 导出失败，这样导出生成的压缩包是一个不完整的 `tar.gz` 包，而咱想向已有的 `tar.gz` 包附加新的镜像 Blobs 文件的话就得把原有的压缩包解压，写入新的文件，再重新打包，体验极其不友好，咱自己用还行，但要是想把工具拿给别人用的话，光是给别人讲背后的逻辑就得磨叽半天，而且本来一个命令就能解决的问题却非要拆成先解压、再追加额外的 Blobs 文件、最后重新压缩这好几个步骤，而且很多时候因为镜像体积太大了解压和压缩很耗时，还会浪费巨多的磁盘空间，很多时候用户根本不知道要给磁盘预留这么大的空间而导致解压到一半失败了。

![](images/dev-user.gif)

所以为了解决这个问题，咱想办法在导出镜像时，采用实时写入的方式，在镜像的 Blobs 文件下载到本地后直接写入到压缩包文件中，而不是先把所有镜像的 Blobs 文件下载下来，再把下载的缓存文件夹打一个压缩包。这样导出镜像时消耗双倍磁盘空间的问题倒是解决了，而且还可以用多线程提个速。
但正如上面说的那样，`tar.gz` 格式的压缩包在创建完成后就没办法增加新的文件了，这期间咱想过要不换成不压缩的 `tar` 格式而不是 `tar.gz` 格式，因为大多数镜像的 Layer 文件本身是已经有 `gzip` 压缩的了，没必要二次压缩，但是镜像的 Config 和 Manifest 通常是未压缩的文本文件，会有一点额外体积开销。
这种方法看似可行，但因为 `tar` 他缺少文件索引，所以如果我想按照一份镜像列表按顺序依次将 `tar` 中存储的 Blobs 文件导入到镜像仓库中，就得遍历构建一遍 `tar` 包中的所有文件 header，程序中自行存一份索引，还是有点麻烦。

所以最后在 Google 上搜有没有带索引、可以随机读取还支持附加文件的压缩归档文件格式时，重新熟悉了一下 `zip` 的结构和特点。

因为咱的程序是用 Go 写的，Go 官方标准库提供了 `archive/tar` 和 `archive/zip`，用来创建/读取 tar 和 zip 归档。但是 Go 标准库不支持向 tar 包和 zip 包中附加额外的文件，tar 附加额外文件的方式蛮简单的所以不需要在修改标准库的基础上就能实现追加文件（只需要移除文件末尾的 end blocks）。但是 zip 想追加文件的话，就得先读取文件末尾存储的 `directory` 索引记录存储起来，附加完文件后再重新在文件末尾写入新的 `directory` 索引。

几年前有人向 Go 提过这个 [Issue](https://github.com/golang/go/issues/15626)，希望标准库能实现 zip append 文件的功能。
因为 Go 的 `zip.Reader` 是使用了 Go 的 `io.ReaderAt` 接口实现的，`zip.Writer` 是用 `io.Writer` 实现的。

Go 标准库中提供的 `io.ReaderAt` 和 `io.WriterAt` 接口可以看作是参考了 POSIX 协议的 C 接口 [pread/pwrite](https://man7.org/linux/man-pages/man2/pread.2.html)（Go 的 Interface 和这个系统调用的 Interface 不是一个东西），`pread` 可以读取文件中指定 offset 和长度的数据，并不改变文件自身的 seek offset。因为读取 zip 文件时要先读取文件末尾的 `directory`，所以用 `io.ReaderAt` 接口实现很合理。而创建 zip 文件时，要按顺序写入文件 header 和 data，最后在文件末尾写入 directory 信息，所以用 `io.Writer` 也很合理。

但是如果想向 zip 附加文件的话，就得先用一个类似 `io.ReaderAt` 接口读取文件末尾已有的 `directiory` 记录，之后用类似 `io.WriterAt` 接口向文件末尾的位置写数据。而偏偏 Go 标准库没有 `io.ReadWriterAt` 这样的接口（就是把 `io.ReaderAt` 和 `io.WriterAt` 结合一起），所以最终这个 Issue 因为需要涉及到 Go 其他 `io` 接口的改动而无法实现关闭掉了。这里额外补充一下，Go 的 zip 标准库是用来对数据流进行操作的，而并非单纯的 zip 文件，所以只要实现了 `io.ReaderAt` 接口的“对象”都可以被 zip 库“解压”，所有实现了 `io.Writer` 的“对象”都可以写入 zip 数据。

所以最后没办法，为了能够让咱写的工具支持在不解压 zip 文件的前提下增添新的文件的功能，只能自行造轮子，在 Go `archive/zip` 标准库的基础上增加了一个 `zip.Updater`。因为 Go 他确实没有 `io.ReadWriterAt` 这样的接口，但是 Go 他有 `io.ReadWriteSeeker` 这个接口，所以在不涉及到多线程竞争访问（或者加锁）的情况下，可以用这个接口实现 `zip.Updater`，向 zip 包附加额外文件的功能。

在搞这些东西的时候刚好赶上公司的 HackWeek，本来咱已经创建了一个 HackWeek Project，就是上面咱说的容器镜像导入/导出工具的开发这些事情。所以咱在这个基础上又创建了一个新的 HackWeek Project，就是在 Go `archive/zip` 标准库基础上新增 `zip.Updater` 相关功能，链接我扔在 [这里](https://hackweek.opensuse.org/23/projects/go-zip-updator-appending-new-files-to-zip-archive-without-decompressing-the-whole-file)，感兴趣的话可以去瞅瞅。

最终咱实现了 `Updater` 的代码仓库在 [这里](https://github.com/STARRY-S/zip)，感兴趣的可以去看看，点个 star 什么的。因为基于 `io.ReadWriteSeeker` 实现的 `zip.Updater` 并不是最优解，最正确的方式是 Go 什么时候出一个类似 `io.ReadWriterAt` 接口，在不用改变 `Seek` 的前提下就能读取/写入指定 offset 的数据，加上自认为咱的程序设计水平还赶不上 Go 维护者，所以咱想了一下就还是先不提 PR 给 Go 源码仓库了。
