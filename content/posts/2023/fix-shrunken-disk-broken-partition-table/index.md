---
title: "修复缩小磁盘空间后受损的 GPT 分区表"
date: 2023-10-18T21:42:02+08:00
layout: post
tags:
- "GPT"
- "qcow2"
- "分区表"
categories:
- 教程
- Linux
---

磁盘的扩容和分区的扩/缩容场景很常见，比如分区用着用着快满了，而磁盘有空闲的未分区空间，而这块区域恰好在这块分区的后面，这时可以对分区扩容。
在使用虚拟机（例如 QEMU）时，假设起初虚拟机的磁盘只创建了 20G，但用久了会存在不够用的情况，这时可以对磁盘扩容，之后再调整分区的大小。

但是最近遇到了一个需要对磁盘缩容的场景，例如把一个 64G 的 U 盘用 `dd` 将整个磁盘的数据写入到一个 8G 的 U盘中（当然这个 64G U盘实际使用的分区大小不能大于前 8G）。
或者要把一个原本 50G 的 qcow2 虚拟磁盘缩小成 10G，用来制作别的镜像什么的。

<!--more-->

{{< music netease song 1348679974 >}}

按照正常的思路，缩小磁盘空间之前要先缩小分区（还要缩小文件系统），确保分区都位于磁盘的前面，这样磁盘在截断后文件系统不会受损，大致步骤可以分为：

1. 缩小文件系统：例如使用 `btrfs filesystem resize` 缩小 BTRFS 文件系统至待缩小的分区的大小，确保文件系统的大小不超过分区大小。
1. 缩小分区：可以使用 `fdisk` 先删掉待缩小的分区，之后再重新创建新的分区，重建分区时设定新的分区的大小，且不要删除已有的 `btrfs` 或其他文件系统签名。这样在缩小分区的同时，不需要重新格式化，因此分区中的文件没有丢失。

    （除了 `fdisk`，还可以用 `sfdisk`，`gdisk` 或 `parted` 等工具调整分区）

1. 确保分区都位于磁盘的起始位置后，执行磁盘缩小的操作，将磁盘末端未使用的数据截断。

GPT / MBR 分区表咱凭感觉来猜的话，是存储在磁盘的起始位置的，所以如果磁盘缩小时，将磁盘末端一些数据截断正常情况下应该是不会影响到存储在起始位置的分区表的。

但是，在一些情况下，会出现缩小完磁盘空间后分区表受损的情况。

## 举个栗子

1. 首先使用 `qemu-img create` 创建一块 10G 的 QEMU 虚拟机磁盘。

    ```console
    $ qemu-img create -f qcow2 disk1.qcow2 10G
    Formatting 'disk1.qcow2', fmt=qcow2 cluster_size=65536 extended_l2=off compression_type=zlib size=10737418240 lazy_refcounts=off refcount_bits=16
    ```

1. 使用 `qemu-nbd` 工具将 qcow2 磁盘镜像与 Linux 内核通过 [nbd](https://www.kernel.org/doc/Documentation/blockdev/nbd.txt) 连接，这样可以在不启动 QEMU 虚拟机的情况下直接对 qcow2 磁盘分区进行操作。

    加载 `nbd` 内核模块，其中 `max_part` 参数是磁盘允许的最大分区数，默认为 0 所以这里需要把数值改大一点。

    ```console
    $ sudo modprobe nbd max_part=8
    ```

    将创建的 `disk1.qcow2` 镜像与 `/dev/nbd0` 连接。

    ```console
    $ sudo qemu-nbd -c /dev/nbd0 ./disk1.qcow2

    $ lsblk /dev/nbd0
    NAME MAJ:MIN RM SIZE RO TYPE MOUNTPOINTS
    nbd0  43:0    0  10G  0 disk
    ```

    使用 `fdisk` 初始化 GPT 分区表，并随便新建几个分区。

    > 咱都是 Arch Linux 用户了，fdisk 就不用我再详细说了吧。

    ```console
    $ sudo fdisk /dev/nbd0

    Welcome to fdisk (util-linux 2.39.2).
    Changes will remain in memory only, until you decide to write them.
    Be careful before using the write command.

    Device does not contain a recognized partition table.
    Created a new DOS (MBR) disklabel with disk identifier 0xf5c43a4b.

    Command (m for help): g
    Created a new GPT disklabel (GUID: 2EB767AB-0958-461B-B56D-697B3305AC83).

    Command (m for help): n
    Partition number (1-128, default 1):
    First sector (2048-20971486, default 2048):
    Last sector, +/-sectors or +/-size{K,M,G,T,P} (2048-20971486, default 20969471): +512M

    Created a new partition 1 of type 'Linux filesystem' and of size 512 MiB.

    Command (m for help): t
    Selected partition 1
    Partition type or alias (type L to list all): 1
    Changed type of partition 'Linux filesystem' to 'EFI System'.

    Command (m for help): n
    Partition number (2-128, default 2):
    First sector (1050624-20971486, default 1050624):
    Last sector, +/-sectors or +/-size{K,M,G,T,P} (1050624-20971486, default 20969471):

    Created a new partition 2 of type 'Linux filesystem' and of size 9.5 GiB.

    Command (m for help): w
    The partition table has been altered.
    Calling ioctl() to re-read partition table.
    Syncing disks.
    ```

    本栗中，磁盘新建了两个分区，`/dev/nbd0p1` 是 512M 大小的 EFI 分区，剩余空间 `/dev/nbd0p2` 是 root 分区。

    ```console
    $ sudo fdisk -l /dev/nbd0
    Disk /dev/nbd0: 10 GiB, 10737418240 bytes, 20971520 sectors
    Units: sectors of 1 * 512 = 512 bytes
    Sector size (logical/physical): 512 bytes / 512 bytes
    I/O size (minimum/optimal): 512 bytes / 512 bytes
    Disklabel type: gpt
    Disk identifier: 2EB767AB-0958-461B-B56D-697B3305AC83

    Device        Start      End  Sectors  Size Type
    /dev/nbd0p1    2048  1050623  1048576  512M EFI System
    /dev/nbd0p2 1050624 20969471 19918848  9.5G Linux filesystem
    ```

    之后简单的格式化一下两个分区，挂载并往里面写一些文件进去。

    ```console
    $ sudo mkfs.vfat -F 32 /dev/nbd0p1
    mkfs.fat 4.2 (2021-01-31)

    $ sudo mkfs.btrfs /dev/nbd0p2
    btrfs-progs v6.5.2
    See https://btrfs.readthedocs.io for more information.

    Performing full device TRIM /dev/nbd0p2 (9.50GiB) ...
    NOTE: several default settings have changed in version 5.15, please make sure
        this does not affect your deployments:
        - DUP for metadata (-m dup)
        - enabled no-holes (-O no-holes)
        - enabled free-space-tree (-R free-space-tree)

    Label:              (null)
    UUID:               a5fb30e5-eb5f-4a0b-8d2a-106e04e1488b
    Node size:          16384
    Sector size:        4096
    Filesystem size:    9.50GiB
    Block group profiles:
    Data:             single            8.00MiB
    Metadata:         DUP             256.00MiB
    System:           DUP               8.00MiB
    SSD detected:       yes
    Zoned device:       no
    Incompat features:  extref, skinny-metadata, no-holes, free-space-tree
    Runtime features:   free-space-tree
    Checksum:           crc32c
    Number of devices:  1
    Devices:
       ID        SIZE  PATH
        1     9.50GiB  /dev/nbd0p2

    $ mkdir -p mnt
    $ sudo mount /dev/nbd0p2 mnt
    $ sudo mkdir ./mnt/{boot,home}
    $ sudo mount /dev/nbd0p1 mnt/boot
    $ sudo touch ./mnt/example.txt
    ```

1. 使用 `btrfs filesystem resize` 缩小 root 分区中的 BTRFS 文件系统大小至 7G，之后使用 `fdisk` 缩小 root 分区大小至 7G。

    ```console
    $ sudo btrfs filesystem resize 7G mnt
    Resize device id 1 (/dev/nbd0p2) from 9.50GiB to 7.00GiB
    $ sudo sync
    $ sudo umount -R ./mnt
    $ sudo fdisk /dev/nbd0

    Welcome to fdisk (util-linux 2.39.2).
    Changes will remain in memory only, until you decide to write them.
    Be careful before using the write command.


    Command (m for help): d
    Partition number (1,2, default 2): 2

    Partition 2 has been deleted.

    Command (m for help): n
    Partition number (2-128, default 2):
    First sector (1050624-20971486, default 1050624):
    Last sector, +/-sectors or +/-size{K,M,G,T,P} (1050624-20971486, default 20969471): +7G

    Created a new partition 2 of type 'Linux filesystem' and of size 7 GiB.
    Partition #2 contains a btrfs signature.

    Do you want to remove the signature? [Y]es/[N]o: N

    Command (m for help): w

    The partition table has been altered.
    Calling ioctl() to re-read partition table.
    Syncing disks.

    $ sudo fdisk -l /dev/nbd0
    Disk /dev/nbd0: 10 GiB, 10737418240 bytes, 20971520 sectors
    Units: sectors of 1 * 512 = 512 bytes
    Sector size (logical/physical): 512 bytes / 512 bytes
    I/O size (minimum/optimal): 512 bytes / 512 bytes
    Disklabel type: gpt
    Disk identifier: 2EB767AB-0958-461B-B56D-697B3305AC83

    Device        Start      End  Sectors  Size Type
    /dev/nbd0p1    2048  1050623  1048576  512M EFI System
    /dev/nbd0p2 1050624 15730687 14680064    7G Linux filesystem
    ```

    调整完分区大小后，因为这里没有移除 BTRFS 签名，所以分区的文件没有被删除，执行 `lsblk -no NAME,UUID /dev/nbd0` 可以看到 `/dev/nbd0p2` 的 UUID 也没有变化，和上面执行 `mkfs.btrfs` 时输出的一致。

    ```console
    $ lsblk -no NAME,UUID /dev/nbd0
    nbd0
    ├─nbd0p1 C6B7-EF70
    └─nbd0p2 a5fb30e5-eb5f-4a0b-8d2a-106e04e1488b
    ```

1. 断开 NBD 连接，缩小 qcow2 磁盘大小到 8G。

    ```console
    $ sudo qemu-nbd -d /dev/nbd0
    /dev/nbd0 disconnected
    $ qemu-img resize ./disk1.qcow2 --shrink 8G
    Image resized.
    ```

1. 重新将 qcow2 磁盘连接到 `/dev/nbd0`，会发现上面创建的磁盘中的几块分区不见了！

    ```console
    $ sudo qemu-nbd -c /dev/nbd0 ./disk1.qcow2
    $ sudo fdisk -l /dev/nbd0
    GPT PMBR size mismatch (20971519 != 16777215) will be corrected by write.
    Disk /dev/nbd0: 8 GiB, 8589934592 bytes, 16777216 sectors
    Units: sectors of 1 * 512 = 512 bytes
    Sector size (logical/physical): 512 bytes / 512 bytes
    I/O size (minimum/optimal): 512 bytes / 512 bytes
    Disklabel type: dos
    Disk identifier: 0x00000000

    Device      Boot Start      End  Sectors Size Id Type
    /dev/nbd0p1          1 16777215 16777215   8G ee GPT
    ```

    `fdisk` 输出中包含一条错误提示：`GPT PMBR size mismatch (20971519 != 16777215) will be corrected by write.`，大致意思是 GPT 分区表中记录的区块数量 (sectors) 和磁盘实际的区块数不一致。


## 修复受损的分区表

所以修复上面栗子中受损的 GPT 分区表的办法是，重新建一个 GPT 分区表，并按照之前的分区位置，重建分区。

这里重建分区时要注意，需要输入精确的区块位置，而不是类似 `+50M` 这样模糊的值。

```console
$ sudo fdisk /dev/nbd0

Welcome to fdisk (util-linux 2.39.2).
Changes will remain in memory only, until you decide to write them.
Be careful before using the write command.

GPT PMBR size mismatch (20971519 != 16777215) will be corrected by write.

Command (m for help): g

Created a new GPT disklabel (GUID: 3C587DB1-5978-45D2-AB05-9135D273D06D).
The device contains 'PMBR' signature and it will be removed by a write command. See fdisk(8) man page and --wipe option for more details.

Command (m for help): n
Partition number (1-128, default 1):
First sector (2048-16777182, default 2048):
Last sector, +/-sectors or +/-size{K,M,G,T,P} (2048-16777182, default 16775167): 1050623

Created a new partition 1 of type 'Linux filesystem' and of size 512 MiB.
Partition #1 contains a vfat signature.

Do you want to remove the signature? [Y]es/[N]o: N

Command (m for help): n
Partition number (2-128, default 2):
First sector (1050624-16777182, default 1050624):
Last sector, +/-sectors or +/-size{K,M,G,T,P} (1050624-16777182, default 16775167): 15730687

Created a new partition 2 of type 'Linux filesystem' and of size 7 GiB.
Partition #2 contains a btrfs signature.

Do you want to remove the signature? [Y]es/[N]o: N

Command (m for help): t
Partition number (1,2, default 2): 1
Partition type or alias (type L to list all): 1

Changed type of partition 'Linux filesystem' to 'EFI System'.

Command (m for help): w

The partition table has been altered.
Calling ioctl() to re-read partition table.
Syncing disks.
```

重建分区表后，不出意外的话，重新挂载分区是能访问分区中的文件的，分区的 UUID 也没有发生改动。

```console
$ lsblk -no NAME,UUID /dev/nbd0
nbd0
├─nbd0p1 C6B7-EF70
└─nbd0p2 a5fb30e5-eb5f-4a0b-8d2a-106e04e1488b

$ sudo -l fdisk /dev/nbd0
Disk /dev/nbd0: 8 GiB, 8589934592 bytes, 16777216 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: gpt
Disk identifier: 3C587DB1-5978-45D2-AB05-9135D273D06D

Device        Start      End  Sectors  Size Type
/dev/nbd0p1    2048  1050623  1048576  512M EFI System
/dev/nbd0p2 1050624 15730687 14680064    7G Linux filesystem

$ sudo mount /dev/nbd0p2 mnt
$ sudo mount /dev/nbd0p1 mnt/boot
$ ls -alh mnt
total 20K
drwxr-xr-x 2 root     root     4.0K Jan  1  1970 boot
-rw-r--r-- 1 root     root        0 Oct 18 22:36 example.txt
drwxr-xr-x 1 root     root        0 Oct 18 22:34 home
```

## sfdisk 备份分区表

如果觉得重建分区表时，分区的位置记不住的话（废话正常人谁能背下来这一串数字），`sfdisk` 的 `--dump` 参数可以备份分区表。

```console
$ sudo sfdisk --dump /dev/nbd0
label: gpt
label-id: 3C587DB1-5978-45D2-AB05-9135D273D06D
device: /dev/nbd0
unit: sectors
first-lba: 2048
last-lba: 16777182
sector-size: 512

/dev/nbd0p1 : start=        2048, size=     1048576, type=C12A7328-F81F-11D2-BA4B-00A0C93EC93B, uuid=496140B3-C491-470B-98D7-BB95F55266A7
/dev/nbd0p2 : start=     1050624, size=    14680064, type=0FC63DAF-8483-4772-8E79-3D69D8477DE4, uuid=F918E93D-FB1D-4652-9657-CE24A29ADEA5
```

在执行磁盘缩小操作之前，可以先使用 `sfdisk` 导出分区表，缩小磁盘后再恢复。

```console
Backup partition table
$ sudo sfdisk --dump /dev/nbd0 > nbd0.txt
Remove the `last-lba` line
$ grep -v last-lba nbd0.txt > partition-backup.txt

After shrinking the disk size...

Restore the backup partition table
$ sudo sfdisk /dev/nbd0 < partition-backup.txt
```
