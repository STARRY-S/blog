---
title: K3s + Multus CNI 插件使用 Macvlan
date: 2024-01-30T18:52:00+08:00
layout: post
tags:
- K3s
- Multus
- Macvlan
- Kubernetes
categories:
- Kubernetes
---

[K3s](https://k3s.io/) 是一个轻量的 Kubernetes 集群，[Multus](https://github.com/k8snetworkplumbingwg/multus-cni) 是一个用于给 Pod 创建多个网络接口的 CNI (Container Network Interface) 插件，其创建的接口支持 `macvlan`。 

<!--more-->

{{< music netease song 4017232 >}}

----

## 啥是 Macvlan

字面意思，根据 MAC 地址划分的虚拟子网 (Vlan) 就是 macvlan，网上能搜到很多有关 Macvlan 的介绍，这里不再过多描述。

与之相对应的还有一个叫 ipvlan，是通过 IP 地址划分的虚拟子网。

Macvlan 和 ipvlan 都是 Linux 系统的特性，其他系统不支持这个功能。

## Prerequisites

可以用 `modinfo macvlan` 检查系统是否有安装 `macvlan` 模块，根据 [Docker 文档](https://docs.docker.com/network/network-tutorial-macvlan/#prerequisites) 中描述的建议是使用 Linux 3.9 或 4.0 及更新的内核版本。

可以用以下指令检查系统是否支持 Macvlan（这里使用桥接模式）：

```sh
sudo ip link add macvlan0 link enp1s0 type macvlan mode bridge  # 这里替换 enp1s0 为网卡接口名称
sudo ip address add 192.168.122.205/24 broadcast 192.168.122.255 dev macvlan0 # 注意 IP 地址冲突
```

之后可尝试使用其他处于同一个网络（CIDR）的设备 ping 这个 `192.168.122.205` IP 地址，能 Ping 通就说明你的防火墙没有屏蔽不同设备之间的二层数据转发。

## 安装 K3s

根据 [Multus 的 QuickStart 手册](https://github.com/k8snetworkplumbingwg/multus-cni/blob/master/docs/quickstart.md)，准备一个新版本的 Kubernetes 集群（这里用的是 `v1.27.8+k3s2`），K3s 默认的 CNI 插件使用的是 Flannel。

在国内的话需要先创建 `/etc/rancher/k3s/registries.yaml` 配置 Registry Mirror：

```yaml
mirrors:
    docker.io:
        endpoint:
        - "https://docker.nju.edu.cn"
    ghcr.io:
        endpoint:
        - "https://ghcr.nju.edu.cn"
```

之后使用国内源一键安装 K3s：

```sh
#!/bin/bash

curl -sfL https://rancher-mirror.oss-cn-beijing.aliyuncs.com/k3s/k3s-install.sh | \
	INSTALL_K3S_VERSION=v1.27.8+k3s2 \
	INSTALL_K3S_MIRROR=cn \
	sh -s - server \
	--cluster-init \
	--system-default-registry "docker.nju.edu.cn"
```

## 安装 Multus CNI

接下来安装 Multus CNI 插件，下载 `multus-daemonset.yml` 配置，需要编辑 `kube-multus-ds` DaemonSet hostPath 的路径到 K3s 对应的路径上去。

```sh
wget 'https://raw.githubusercontent.com/k8snetworkplumbingwg/multus-cni/master/deployments/multus-daemonset.yml'
```

编辑 `kube-multus-ds` DaemonSet 的 `hostPath` 的配置为 K3s 的路径。 

```yaml
...
    volumes:
        - name: cni
          hostPath:
            path: /var/lib/rancher/k3s/agent/etc/cni/net.d
        - name: cnibin
          hostPath:
            path: /var/lib/rancher/k3s/data/current/bin
...
```

还要编辑 `kube-multus-ds` DaemonSet 的 Container 配置，增添一条 command arg：

```yaml
...
    containers:
      - name: kube-multus
        image: ghcr.io/k8snetworkplumbingwg/multus-cni:snapshot
        command: ["/thin_entrypoint"]
        args:
        - "--multus-conf-file=auto"
        - "--multus-autoconfig-dir=/host/etc/cni/net.d"
        - "--cni-conf-dir=/host/etc/cni/net.d"
        # ADD THIS LINE:
        - "--multus-kubeconfig-file-host=/var/lib/rancher/k3s/agent/etc/cni/net.d/multus.d/multus.kubeconfig"
...
```

之后 `kubectl apply` 上面的 Multus Daemonset 配置，等待 `kube-multus-ds` DaemonSet 跑起来后，可以看到 `/var/lib/rancher/k3s/data/current/bin` 目录下有新增 `multus` 可执行文件。

```console
$ sudo ls /var/lib/rancher/k3s/data/current/bin | grep multus
multus
```

## 自定义 Multus CNI 配置文件

新建一个名为 `macvlan-conf` 的 `NetworkAttachmentDefinition` Custom Resource，自定义 multus 配置文件：

这里需要注意 `config` 中的 `master` 网卡接口要设置为物理机上对应的网卡接口名。

咱把 K3s Server 安装在了 QEMU 虚拟机中，虚拟机使用的是 libvirt 创建的默认网卡，CIDR 编址为 `192.168.122.0/24`，网关 `192.168.122.1`。
为了能在其他虚拟机 / 物理机上也能访问到虚拟机中使用了 macvlan 的 pod，multus macvlan 配置文件也使用 libvirt 网卡的 CIDR。

```yaml
apiVersion: "k8s.cni.cncf.io/v1"
kind: NetworkAttachmentDefinition
metadata:
  name: macvlan-conf
spec:
  config: '{
      "cniVersion": "0.3.1",
      "type": "macvlan",
      "master": "enp1s0",
      "mode": "bridge",
      "ipam": {
        "type": "host-local",
        "subnet": "192.168.122.0/24",
        "rangeStart": "192.168.122.200",
        "rangeEnd": "192.168.122.210",
        "routes": [
          { "dst": "0.0.0.0/0" }
        ],
        "gateway": "192.168.122.1"
      }
    }'
```

```console
$ kubectl apply -f macvlan-conf.yaml
$ kubectl get net-attach-def
NAME           AGE
macvlan-conf   59s
```

## 创建 Macvlan Pod

K3s 将安装包体积做了精简移除了 `macvlan` CNI 插件，所以创建 Pod 之前需要手动下载 `macvlan` CNI 插件放到 K3s 的 data bin 目录。

```console
$ mkdir -p cni-plugin && cd cni-plugin
$ wget https://github.com/containernetworking/plugins/releases/download/v1.4.0/cni-plugins-linux-amd64-v1.4.0.tgz
$ tar -zxvf cni-plugins-linux-amd64-v1.4.0.tgz
$ sudo cp ./macvlan /var/lib/rancher/k3s/data/current/bin/
```

之后创建 Pod，使用 Annotation 指定网络的配置文件，并让 Pod 被 Multus CNI 识别。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-macvlan
  annotations:
    k8s.v1.cni.cncf.io/networks: macvlan-conf
spec:
  containers:
  - name: nginx
    image: nginx
```

如果一切顺利的话，`kubectl describe pod nginx-macvlan` 能看到以下的 Events：

```
Events:
  Type    Reason          Age   From               Message
  ----    ------          ----  ----               -------
  Normal  Scheduled       2s    default-scheduler  Successfully assigned default/nginx-macvlan to archlinux-k3s-1
  Normal  AddedInterface  2s    multus             Add eth0 [10.42.0.26/24] from cbr0
  Normal  AddedInterface  2s    multus             Add net1 [192.168.122.200/24] from default/macvlan-conf
```

因为 K3s 服务器跑在了 QEMU KVM 虚拟机里面，libvirt 默认网卡 CIDR 是 `192.168.122.0/24`。所以咱在物理机上访问虚拟机内的 Macvlan Pod IP `192.168.122.200`，是能正常访问的。

```console
$ curl 192.168.122.200
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
...
```

然后因为 Macvlan 的子接口 (sub interface) 无法与父接口 (parent interface) 直接访问，所以在节点的主机上访问运行在这个节点内的 macvlan pod 是访问不通的，也就是说无法通过节点主机的接口访问到 macvlan pod 的子接口，除非使用 ipvlan，可以参考以下这几篇讨论：
- [Single node Microk8s multus master interface cannot be reached](https://stackoverflow.com/questions/69316893/single-node-microk8s-multus-master-interface-cannot-be-reached)
- [Host and Containers cannot communicate - MACVLAN](https://forums.docker.com/t/host-and-containers-cannot-communicate-macvlan/112968)
