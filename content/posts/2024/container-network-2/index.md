---
title: 再探容器网络
date: 2024-07-11T01:12:36+08:00
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

CHECK 命令用于校验 Pod 网络，CNI Spec 0.4.0 中，Config 新增了 `prevResult` 字段，记录了 CNI 插件上一次执行 ADD 命令的执行结果。
CHECK 命令将 `prevResult` 记录的状态信息和设定的期望值进行比对，输出校验结果。

> 未完待续
