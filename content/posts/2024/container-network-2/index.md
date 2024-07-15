---
title: 再探容器网络
date: 2024-07-11T01:12:36+08:00
lastmod: 2024-07-16T00:35:24+08:00
layout: post
draft: false
tags:
- Network
- Container
- Kubernetes
categories:
- Container
---

在写之前的 [初探容器网络](../container-network-1/) 时是想过什么时候写后续的，这期间鸽了不到半年，嗯也不算很久，忙完手头的事情继续更一下容器网络系列……

<!--more-->

{{< music netease song 1416321955 >}}

在上篇 [初探容器网络](../container-network-1/) 中咱简单的写了 Linux Network Namespace 和容器相关的东西，所以这篇会继续上一篇的内容拓展一下 CNI 网络插件和他的好朋友们……

## Container Network Interface (CNI)

有关 CNI 的介绍可以在他的[官网](https://www.cni.dev/) 找到，CNI 定义了一套 Linux 容器的网络接口规范和相关代码库，还提供了一些简单的样例网络插件代码。Kubernetes 使用 CNI 网络插件为 Pod 创建网络。
需要注意的是 Docker 的容器网络不是由 CNI 插件创建的，而是由 Docker 自己的 [Driver](https://docs.docker.com/network/drivers/) 负责创建，这里需要注意别弄混了，其他的容器运行时也不完全是使用 CNI 网络插件，也可能是用的别的插件的标准。

不过 CNI 在 Kubernetes 中广为使用，学起来也不是很难（），所以本篇就先围绕着 CNI 进行简单的介绍，熟悉完 CNI 后其他种类的网络插件也相对的能更容易上手一些。

首先来熟悉一下到底什么是 CNI 插件，有关 CNI 的定义和详细介绍可以在[这里](https://www.cni.dev/docs/spec/)找到，但新手可能单凭这个介绍，无法对 CNI 有详细的了解，实际上官网的定义介绍感觉更像是给一个熟悉 CNI 网络插件的查阅的手册而不是帮一个萌新去了解的入门指南。

需要知道的是，CNI 插件是一个可执行文件，一个最简单的 CNI 插件可以是一个有执行权限的脚本，执行 `ip link`, `ip route` 等命令，为 Pod 的 Network Namespace 实现添加、删除虚拟接口等操作，就可以算得上是一个 CNI 插件。但强大一点的 CNI 插件都是由更灵活的编程语言写的程序，编译成二进制文件放在系统的某个路径下面。Kubernetes 集群可以指定默认使用的 CNI 网络插件（比如广为人知的 Calico、Flannel、Cilium 等），除此之外还可以使用一些额外插件为 Pod 创建多个虚拟网卡（例如 Multus CNI）。在 Pod 创建时，执行 CNI 插件为 Pod 的 Network Namespace 创建网卡接口。这里网卡接口类型不再局限为单纯的 Veth Pair，而可以是其他复杂类型的接口（比如 Macvlan、IPvlan 甚至你自己可以写个网络驱动）。在部署一个 Kubernetes 集群后，节点上执行 `ip link` 能看到一大堆名称为 `vethXXXX@ifN` 的虚拟接口，这些其实是由集群使用的 CNI 插件创建的 Veth Pair，因为这些 NS 的文件被放在了 `/run/netns` 路径下面，所以可以被 `ip link` 命令识别到，而 Docker 的 NS 文件不在这个路径里面，所以用 Docker 跑容器时，执行 `ip link` 不会有许多 Veth 虚拟设备输出在屏幕上。

### CNI 参数

执行 CNI 时，通过一些环境变量向 CNI 传递参数，传递的环境变量为：

- `CNI_COMMAND`: CNI 插件执行的命令，在 CNI Spec 1.0.0 中，CNI 插件支持 `ADD`, `DEL`, `CHECK`, `VERSION` 这四个命令。
- `CNI_CONTAINERID`: 容器的 Container ID，由 Container Runtime 管理。
- `CNI_NETNS`: 容器的 Network Namespace 在节点上的路径，通常是在 `/run/netns/[nsname]` 路径下面。
- `CNI_IFNAME`: 待创建的网卡名称，例如最常见的情况是容器里有一块网卡，名为 `eth0`。
- `CNI_ARGS`: 向 CNI 插件传递的一些其他参数，格式为 `KEY=VALUE`，由分号分隔，例如 `FOO=BAR;ABC=123`。
- `CNI_PATH`: CNI 可执行文件所在路径列表。

### CNI 返回值

如果 CNI 成功执行并完成了指定的命令，它的返回值为 0，其他非 0 的返回值代表错误，输出一串 JSON，包含错误的详细内容，关于 CNI Errors 的定义可以看[这里](https://www.cni.dev/docs/spec/#error)。

### CNI 命令

在 CNI Spec 0.4.0 之前，CNI 插件只定义了 `ADD`, `DEL`, `VERSION` 这三个命令，分别对应 “添加网络”、“删除网络”、“支持版本”。CNI Spec 0.4.0 新引入了 `CHECK` 命令，用于对已创建网络的容器进行校验。

### 配置文件

CNI 配置文件为 JSON 格式，以下是一个样例配置文件：

```json
{
  // CNI Spec Version
  "cniVersion": "1.0.0",
  // Network name.
  "name": "dbnet",
  "plugins": [
    {
      // CNI Plugin Binary name
      "type": "bridge",
      // CNI Plugin specific parameters...
      "bridge": "cni0",
      // Dictionary with IPAM (IP Address Management) specific values.
      "ipam": {
        // IPAM Plugin Binary name
        "type": "host-local",
        // IPAM specific params...
        "subnet": "10.1.0.0/16",
        "gateway": "10.1.0.1",
        "routes": [
            { "dst": "0.0.0.0/0" }
        ]
      },
      "dns": {
        "nameservers": [ "10.1.0.1" ]
      }
    }
  ]
}
```

通常高级的 CNI 插件可以自动的由 Controller 生成他所需的 CNI Config，而简易的 CNI 插件需要手动的编写 Config 文件放在 `/etc/cni/net.d/` 目录下面（不同类型的集群的 Config 路径可能不一致）。

光凭上面这一大堆 Specification 定义比较难理解这个抽象的 CNI 插件，所以接下来我们拆解一个样例 CNI 插件，并手撮一个简易的 CNI 插件。

### 样例 CNI 插件

在 GitHub 的 `containernetworking` Org 里能找到许多 CNI Plugin 代码，[这里](https://github.com/containernetworking/plugins/tree/main/plugins/main/ptp)为样例 `p2p` CNI Plugin 插件代码，这个插件能为容器和主机之间创建一对 Veth Pair，可以主机和容器之间的点对点访问。在[这里](https://github.com/containernetworking/plugins)还能找到一些其他样例插件代码，例如为容器创建 Linux Kernel 的 `bridge`、`macvlan`、`ipvlan` 等类型的网卡接口。

样例插件由 Go 语言编写，所以这里需要你熟悉 Go 编程语言。为了折腾 CNI 插件，你需要有一个调试使用的 Kubernetes 集群，因为 Pod 需要具备跨节点通信的能力，所以集群最好至少有一个 Master (etcd, controlplane, scheduler) 和 2 个 Worker (scheduler) 节点，将 Pod 调度到不同节点上验证节点之间 Pod 连同性，因为折腾 CNI 时很可能同一个节点的 Pod 能互相访问而不能跨节点访问，也可能节点能访问其他节点上的 Pod 但无法访问运行在当前节点的 Pod 等一堆复杂问题。集群的节点最好是可以灵活重启抗造的物理机或 KVM 虚拟机（因公有云的网路环境略微复杂且大多数公有云都不支持 KVM，所以不是很建议在公有云上折腾 CNI 网络插件）。
同时本篇需要你具备一些基本的计算机网络基础，例如可以先看一下 IPv4/IPv6 的网络编址/子网划分、OSI 七层模型的 L2 和 L3 层，例如 2 层交换机 (Switch) 和 3 层交换机 (Router) 的区别，更复杂一点的地方需要你清楚常见的 VLAN ([IEEE 802.1Q](https://en.wikipedia.org/wiki/IEEE_802.1Q)、[802.1ad](https://en.wikipedia.org/wiki/IEEE_802.1ad)) 以及后续衍生出来的 [VXLAN](https://en.wikipedia.org/wiki/Virtual_Extensible_LAN) 等 *VLAN 协议……

往简单来说 CNI 插件基本的功能就是执行 `ip link`, `ip route`, `ip netns` 等一系列命令为 Pod 的 Network Namespace 和主机的 Default Network Namespace 之间创建虚拟网卡实现互相通信。Go 语言同样有 Library 提供了 Linux `ip` 命令的代码，常用的 Go Library 包含以下的：

- <https://github.com/vishvananda/netlink>: Go 语言实现的 `iproute2` 命令行工具的 API，可以执行类似 `ip link`, `ip route` 等命令
- <https://github.com/vishvananda/netns>: Go 语言实现的处理 Linux Network Namespace API
- <https://github.com/containernetworking/cni>: 包含 CNI 定义 Types 和常用组件

打开[样例 p2p CNI 插件代码](https://github.com/containernetworking/plugins/blob/main/plugins/main/ptp/ptp.go)，先看他的 `main` 函数只有简洁的一行 `skel.PluginMain`，这个方法会处理环境变量传入的 CNI 参数，加载 Config，执行相应的 COMMAND。

```go
func main() {
    skel.PluginMain(cmdAdd, cmdCheck, cmdDel, version.All, bv.BuildString("ptp"))
}
```

#### ADD 命令

ADD 命令用于为容器创建网卡（或修改已有的网卡），找一下 p2p CNI 插件的 `cmdAdd` 函数，大致简化一下里面的代码流程为：

```go
func cmdAdd(args *skel.CmdArgs) error {
    // Load CNI Config
    conf := NetConf{}
    if err := json.Unmarshal(args.StdinData, &conf); err != nil {
        return fmt.Errorf("failed to load netconf: %v", err)
    }
    // ---------------------------------------------

    // Execute IPAM command to get IP address
    r, err := ipam.ExecAdd(conf.IPAM.Type, args.StdinData)
    if err != nil {
        return err
    }
    result, err := current.NewResultFromResult(r)
    if err != nil {
        return err
    }
    if len(result.IPs) == 0 {
        return errors.New("IPAM plugin returned missing IP config")
    }
    if err := ip.EnableForward(result.IPs); err != nil {
        return fmt.Errorf("Could not enable IP forwarding: %v", err)
    }
    // ---------------------------------------------

    // Create Veth Pair for Pod Network Namespace
    netns, err := ns.GetNS(args.Netns)
    if err != nil {
        return fmt.Errorf("failed to open netns %q: %v", args.Netns, err)
    }
    defer netns.Close()
    hostInterface, _, err := setupContainerVeth(netns, args.IfName, conf.MTU, result)
    if err != nil {
        return err
    }
    // ---------------------------------------------

    // Setup Veth Pair for default Network Namespace
    if err = setupHostVeth(hostInterface.Name, result); err != nil {
        return err
    }
    // Some other IP forward (masquerade) operations...
    return types.PrintResult(result, conf.CNIVersion)
}
```

简单概括样例 P2P Plugin 的 ADD 命令流程大致为：
1. 加载 CNI Config 配置文件
1. 执行 IPAM 获取 Pod IP
1. 创建一对 Veth Pair，其中一个 Iface 接口放在 Pod NS 中，配置 IP、路由等
1. 另一个 Veth Pair 的 Iface 接口放在 default NS 中，配置 IP、路由……
1. 配置 Default NS 的 Masquerade 等额外操作
1. 输出运行结果

#### DEL 命令

DEL 命令用于释放容器和主机的网卡接口资源，在 Pod 删除时被执行，以下是简化的样例 P2P Plugin 的 `cmdDel` 函数代码：

```go
func cmdDel(args *skel.CmdArgs) error {
    // Load CNI Config
    conf := NetConf{}
    if err := json.Unmarshal(args.StdinData, &conf); err != nil {
        return fmt.Errorf("failed to load netconf: %v", err)
    }
    // ---------------------------------------------

    // Execute IPAM command to release IP address
    if err := ipam.ExecDel(conf.IPAM.Type, args.StdinData); err != nil {
        return err
    }
    // ---------------------------------------------

    // Release link interface & masquerades...
    var ipnets []*net.IPNet
    err := ns.WithNetNSPath(args.Netns, func(_ ns.NetNS) error {
        var err error
        ipnets, err = ip.DelLinkByNameAddr(args.IfName)
        if err != nil && err == ip.ErrLinkNotFound {
            return nil
        }
        return err
    })
    if err != nil {
        ...
    }
    if len(ipnets) != 0 && conf.IPMasq {
        for _, ipn := range ipnets {
            err = ip.TeardownIPMasq(ipn, ...)
        }
    }
    return err
}
```

简单概括 DEL 命令流程大致为：
1. 加载 CNI Config 配置文件
1. 执行 IPAM 释放 Pod IP
1. 释放 Veth Pair 和其他配置 (Masquerade...)

#### CHECK 命令

CHECK 命令用于校验 Pod 网络，在 CNI Spec 0.4.0 中，Config 新增了 `prevResult` 字段，记录了 CNI 插件上一次执行 ADD 命令的结果。
CHECK 命令将 `prevResult` 记录的状态信息和设定的期望值进行比对。

```go
func cmdCheck(args *skel.CmdArgs) error {
    // Load CNI Config
    conf := NetConf{}
    if err := json.Unmarshal(args.StdinData, &conf); err != nil {
        return fmt.Errorf("failed to load netconf: %v", err)
    }
    // -----------------------------------

    // Run IPAM plugin CHECK command and get results
    err = ipam.ExecCheck(conf.IPAM.Type, args.StdinData)
    if err != nil {
        return err
    }
    // -----------------------------------

    // Parse prevResult
    if conf.NetConf.RawPrevResult == nil {
        return fmt.Errorf("ptp: Required prevResult missing")
    }
    if err := version.ParsePrevResult(&conf.NetConf); err != nil {
        return err
    }
    // Convert whatever the IPAM result was into the current Result type
    result, err := current.NewResultFromResult(conf.PrevResult)
    if err != nil {
        return err
    }
    var contMap current.Interface
    // Find interfaces for name whe know, that of host-device inside container
    for _, intf := range result.Interfaces {
        if args.IfName == intf.Name {
            if args.Netns == intf.Sandbox {
                contMap = *intf
                continue
            }
        }
    }
    // -----------------------------------

    // Check Network Namespace Name
    if args.Netns != contMap.Sandbox {
        return fmt.Errorf("Sandbox in prevResult %s doesn't match configured netns: %s",
            contMap.Sandbox, args.Netns)
    }

    // Check prevResults for ips, routes and dns against values found in the container
    if err := netns.Do(func(_ ns.NetNS) error {
        // Check interface
        err := validateCniContainerInterface(contMap)
        if err != nil {
            return err
        }

        // Check IPs
        err = ip.ValidateExpectedInterfaceIPs(args.IfName, result.IPs)
        if err != nil {
            return err
        }

        // Check routes
        err = ip.ValidateExpectedRoute(result.Routes)
        if err != nil {
            return err
        }
        // Other checks...
        return nil
    }); err != nil {
        return err
    }

    return nil
}
```

样例 P2P 插件的 DEL 命令流程大致为：
1. 加载 CNI Config 配置文件
1. 执行 IPAM CHECK 命令
1. 加载 prevResult 信息
1. 依次校验 Network Namespace 名称、Pod 网卡、Pod IP、路由表等状态信息

### 运行样例 CNI

上述的样例 P2P CNI 插件仅能为 Pod NS 与主机的 Default NS 之间创建 Veth Pair 并简单的配置 IP 地址和路由表，并不能用于更复杂的场景。如果想在你的调试集群中试用上述样例的 CNI 插件，可以使用 [Multus CNI](https://github.com/k8snetworkplumbingwg/multus-cni/)。Multus CNI 可以为 Pod 创建多块网卡，其中 Pod 的默认网卡（通常是 `eth0`）为 Kubernetes 集群的原生 CNI（例如 Calico、Flannel、Cilium 或其他 CNI），使用 Multus CNI 可以调用上述的样例 P2P CNI 插件为 Pod 创建额外的网卡。

#### 安装 Multus CNI

目前 Multus CNI 最新版本 (`4.0.2`) 支持的最高 CNI Spec 版本为 `1.0.0`，可以运行在 K3s 但有亿点小问题（参考 [Issue](https://github.com/k8snetworkplumbingwg/multus-cni/issues/1089#issuecomment-1550442393)），咱写这篇博客用的集群是 K3s `v1.28.10+k3s1`，一共有两个节点，运行在 KVM 虚拟机中方便折腾。

参照 [Multus CNI](https://github.com/k8snetworkplumbingwg/multus-cni/blob/master/docs/quickstart.md#installation) 文档，部署 Multus Daemonset，在每个节点中安装 Multus CNI Binary 文件。

在 K3s 上安装 Multus 的步骤可以看咱之前写的 [K3s + Multus CNI 插件使用 Macvlan](../k3s-multus-macvlan/)。

### 安装样例 CNI Binary 文件

需要将上述的样例 P2P CNI 插件拷贝到 K3s 每个集群节点的 `/var/lib/rancher/k3s/data/current/bin` 目录下（如果是其他集群，路径为 `/opt/cni/bin`）。

```console
$ mkdir -p cni && cd cni
$ wget https://github.com/containernetworking/plugins/releases/download/v1.5.1/cni-plugins-linux-amd64-v1.5.1.tgz
$ tar -zxvf cni-plugins-linux-amd64-v1.5.1.tgz
$ sudo cp ptp /var/lib/rancher/k3s/data/current/bin/
```

创建一个 `NetworkAttachmentDefinition` Custom Resource，将 p2p 的 CNI Config 存储在这里，配置 Pod 使用 ptp CNI 插件。

```yaml
apiVersion: "k8s.cni.cncf.io/v1"
kind: NetworkAttachmentDefinition
metadata:
  name: ptp-conf
spec:
  config: '{
  "cniVersion": "1.0.0",
  "type": "ptp",
  "ipam": {
    "type": "host-local",
    "subnet": "192.168.1.0/24"
  },
  "dns": {
    "nameservers": [ "192.168.1.0", "8.8.8.8" ]
  }
}'
```

```console
$ k get network-attachment-definitions.k8s.cni.cncf.io
NAME       AGE
ptp-conf   9s
```

### 创建样例 Workload

接下来可以创建样例工作负载，设置 `k8s.v1.cni.cncf.io/networks` Annotation 定义 Pod 的第二网卡由上述的 P2P 插件创建。为便于折腾这里的样例负载为 DaemonSet，并赋予容器 Privileged 权限。

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: example-ds
  namespace: default
spec:
  selector:
    matchLabels:
      app: example-alpine-ds
  template:
    metadata:
      labels:
        app: example-alpine-ds
      annotations:
        k8s.v1.cni.cncf.io/networks: 'ptp-conf'
    spec:
      containers:
      - name: example-alpine
        image: alpine
        imagePullPolicy: IfNotPresent
        command: ["sleep"]
        args: ["infinity"]
        securityContext:
          privileged: true
```

```console
$ vim example-ds.yaml
$ k apply -f example-ds.yaml
daemonset.apps/example-ds created
$ k get pods -o wide
NAME               READY   STATUS    RESTARTS   AGE   IP           NODE    NOMINATED NODE   READINESS GATES
example-ds-4865k   1/1     Running   0          3s    10.42.1.7    k3s-2   <none>           <none>
example-ds-9g5kp   1/1     Running   0          3s    10.42.0.12   k3s-1   <none>           <none>
```

查看 Pod 中的网卡信息，除了 `lo` 回环接口和 `eth0` 接口外，还有一个由 `ptp` 创建的 `net1` 接口，IP 地址为 `192.168.1.2`。

```console
$ k exec -it example-ds-9g5kp -- sh
# ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0@if18: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1450 qdisc noqueue state UP
    link/ether ba:ac:48:99:66:73 brd ff:ff:ff:ff:ff:ff
    inet 10.42.0.12/24 brd 10.42.0.255 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::b8ac:48ff:fe99:6673/64 scope link
       valid_lft forever preferred_lft forever
3: net1@if19: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue state UP
    link/ether 6a:0b:7d:4b:6f:c5 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.2/24 brd 192.168.1.255 scope global net1
       valid_lft forever preferred_lft forever
    inet6 fe80::680b:7dff:fe4b:6fc5/64 scope link
       valid_lft forever preferred_lft forever
# ip r
default via 10.42.0.1 dev eth0
10.42.0.0/24 dev eth0 scope link  src 10.42.0.12
10.42.0.0/16 via 10.42.0.1 dev eth0
192.168.1.0/24 via 192.168.1.1 dev net1  src 192.168.1.2
192.168.1.1 dev net1 scope link  src 192.168.1.2
```

在节点上执行 `ip` 命令，查看节点的网卡和 IP 地址信息，可以看到除了节点的 `lo` 和 `eth0`，Flannel CNI 的 `flannel.1`, `cni0` 和一些其他 Pod 的 Veth Pair，有一个 Veth Pair 的 IP 地址为 `192.168.1.1/32`，这个是由样例 ptp CNI 创建。

```console
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host noprefixroute
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 52:54:00:de:78:16 brd ff:ff:ff:ff:ff:ff
    altname enp1s0
    inet 10.128.0.101/12 brd 10.143.255.255 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::5054:ff:fede:7816/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
3: flannel.1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UNKNOWN group default
    link/ether ee:82:b4:a0:d9:4d brd ff:ff:ff:ff:ff:ff
    inet 10.42.0.0/32 scope global flannel.1
       valid_lft forever preferred_lft forever
    inet6 fe80::ec82:b4ff:fea0:d94d/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
4: cni0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default qlen 1000
    link/ether 6e:99:8d:63:e5:4b brd ff:ff:ff:ff:ff:ff
    inet 10.42.0.1/24 brd 10.42.0.255 scope global cni0
       valid_lft forever preferred_lft forever
    inet6 fe80::6c99:8dff:fe63:e54b/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
18: vethf91807b2@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue master cni0 state UP group default
    link/ether 6a:dd:6f:b9:29:8a brd ff:ff:ff:ff:ff:ff link-netns cni-dba4ed62-c7d7-98fa-0efb-ffa6a8e526a3
    inet6 fe80::68dd:6fff:feb9:298a/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
19: veth37d38de3@if3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether ee:29:cc:72:e0:a5 brd ff:ff:ff:ff:ff:ff link-netns cni-dba4ed62-c7d7-98fa-0efb-ffa6a8e526a3
    inet 192.168.1.1/32 scope global veth37d38de3
       valid_lft forever preferred_lft forever
    inet6 fe80::ec29:ccff:fe72:e0a5/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
```

显然这个样例 P2P CNI 只能通过 Veth Pair 访问当前节点的 Pod，无法跨节点访问运行在别的节点的 Pod。

### 手动执行 CNI CHECK 命令

到这里其实你可以魔改一下上面介绍的 P2P 样例 CNI 插件，打一些日志输出到某个文件中，看一下 `netlink` 执行的结果以及 CNI 执行时传递的参数之类的……

在 Pod 创建时会执行 ADD 命令，删除时会执行 DEL 命令，但如果想调试 CHECK 命令，可以手动为 CNI 传递相应参数执行 CHECK 命令。

首先准备一份包含 `prevResult` 的 CNI Config，参照下方的 Config 修改 `prevResult` 字段。

```json
{
    "cniVersion": "1.0.0",
    "name": "ptp-conf",
    "type": "ptp",
    "ipam": {
        "type": "host-local",
        "subnet": "192.168.1.0/24"
    },
    "dns": {
        "nameservers": [ "192.168.1.0", "8.8.8.8" ]
    },
    "prevResult": {
        "cniVersion": "1.0.0",
        "type": "ptp",
        "interfaces": [
            {
                "mac": "6a:0b:7d:4b:6f:c5",
                "name": "net1",
                "sandbox": "/var/run/netns/cni-dba4ed62-c7d7-98fa-0efb-ffa6a8e526a3"
            }
        ],
        "ips": [
            {
                "address": "192.168.1.2/24",
                "interface": 0
            }
        ],
        "ipam": {
            "type": "host-local",
            "subnet": "192.168.1.0/24"
        },
        "dns": {
            "nameservers": [ "192.168.1.0", "8.8.8.8" ]
        }
    }
}

```

设置 CNI 环境变量，传递 CHECK 命令需要的参数。如果实在不清楚 NETNS 和 CONTAINERID 的话，可以魔改 ADD 和 DEL 命令的代码，把参数打印到某个日志文件中。

```sh
#!/bin/bash

export CNI_PATH="/var/lib/rancher/k3s/data/current/bin"
export PATH=$CNI_PATH:$PATH
export CNI_CONTAINERID="f19d5f601d6227bdf0cb28b43862632e98ecd23cd44d08e8ba1b2d8f27c9639c"
export CNI_NETNS="/var/run/netns/cni-dba4ed62-c7d7-98fa-0efb-ffa6a8e526a3"
export CNI_IFNAME=net1

export CNI_COMMAND=CHECK

/var/lib/rancher/k3s/data/current/bin/ptp < p2p.json
```

如果验证错误，会返回一串包含错误信息的 JSON：

```json
{
    "code": 999,
    "msg": "host-local: Failed to find address added by container caf3bc30ca71c847b84741b48a188456277867b404c409628ed33dc7aeb7d1a8"
}
```

如果 CHECK 运行成功，CNI 程序的返回值将为 0，没有文字输出。

----

同理，你可以手动创建一个 Network Namespace 模拟容器网络，编辑上方相应的参数执行 CNI Binary 为这个 NS 创建/删除 Veth Pair。

> 未完待续
