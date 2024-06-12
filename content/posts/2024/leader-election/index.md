---
title: Leader Election 折腾小记
date: 2024-06-12T23:58:26+08:00
layout: post
tags:
- Kubernetes
- Leader Election
categories:
- Kubernetes
---

最近好忙，有很多想写博客的东西都没时间写，五一去了佛山的 HiFurry，本来想着整理点照片水一篇博客但没时间也没精力，所以最后想写的东西就都咽肚里就饭吃了。

<!--more-->

{{< music netease song 2055270589 >}}

------

最近在折腾 Operator，就是用现成的框架写的 Controller。Operator 省去了重复且繁琐的使用 client-go 手搓 ClientSet、Informer、Lister、WorkQueue 等一大堆重复代码的步骤，只要基于已有的框架去写资源对象更新/删除时的业务处理逻辑就行了。

## Leader Election 是什么

当负载在 Kubernetes 运行时，通常会设置多个 Replicas 冗余副本，以实现高可用（HA），例如通常会将某些系统组件的 Replicas 设置为 2，就会创建两个对应的 Pods，通常这俩 Pod 会被调度到不同的节点上，在某个 Pod 挂掉时还能用另一个节点的 Pod。

Leader Election 机制是由“领导人选举机制”抽象而来的，可以理解为在多个“候选者”中选取某一个作为 Leader。这里的候选者指的是负载创建的多个冗余 Pod，Leader Election 机制从中选取某一个 Pod 作为 Leader，其他 Pod 则处于“待命”状态，如果 Leader Pod 出现故障，则会重新选举一个 Leader Pod。

Kubernetes 使用 Lease 资源（译作：租约）作为 Leader Election 的锁。和常用的 Mutex 互斥锁不同，Lease 资源会被 Leader Pod 每隔几秒钟更新一次。如果长达一段时间 Lease 没有被更新，则说明 Leader 挂掉了，其他 Pods 会竞争，尝试更新这个 Lease 锁，而成功更新了 Lease 的 Pod 会成为新的 Leader，其余 Pod 则继续处于待命状态。

大多数情况下，当某个资源发生更新时，我们不希望所有的冗余副本 Pod 都去处理某一个资源的更新，而是让某一个 Pod 去处理就可以了，不然会混乱（比如刷 Conflict 报错: `the object has been modified; please apply your changes to the latest version and try again`）。这时可以用到 Leader Election 机制，从多个冗余 Pod 中只选其中某一个 Pod 作为 Leader 处理资源更新，其余 Pod 只作为待命或其他用途。

如果你的 Controller 没有 Leader Election 机制，通常只能强行设定其 Replicas 为 1，但如果有小聪明修改了冗余数值为 2，则会出现一些问题，日志会刷大量的 Conflict 报错之类的，所以更严谨的方式是为 Controller 添加 Leader Election，以允许多 Replicas 冗余。

## 举个栗子

client-go 的样例代码中有 [Leader Election 例子](https://github.com/kubernetes/client-go/blob/v0.30.1/examples/leader-election/main.go)，所以直接拿这个 Example 做简单的介绍了，把这个 Example 代码拷贝下来在本地跑一下。

首先你需要有一个 Kubernetes 集群用来调试，如果你觉得搭一个集群太麻烦，或者手里没有可供调试使用的集群的话，一个超级简单的方式是使用 [K3d](https://k3d.io/) 在你的 Docker Runtime 中跑一个迷你版 K3s 集群。

```console
$ k3d cluster create example
INFO[0000] Prep: Network
INFO[0000] Created network 'k3d-example'
......
INFO[0012] Cluster 'example' created successfully!

$ kubectl get nodes -o wide
NAME                   STATUS   ROLES                  AGE   VERSION        INTERNAL-IP   EXTERNAL-IP   OS-IMAGE           KERNEL-VERSION   CONTAINER-RUNTIME
k3d-example-server-0   Ready    control-plane,master   98s   v1.28.8+k3s1   172.19.0.2    <none>        K3s v1.28.8+k3s1   6.9.3-arch1-1    containerd://1.7.11-k3s2

$ docker ps
CONTAINER ID   IMAGE                            COMMAND                  CREATED          STATUS              PORTS                           NAMES
a4c1367c04a2   ghcr.io/k3d-io/k3d-proxy:5.6.3   "/bin/sh -c nginx-pr…"   2 minutes ago    Up About a minute   80/tcp, 0.0.0.0:6443->6443/tcp  k3d-example-serverlb
7c95a6ea069b   rancher/k3s:v1.28.8-k3s1         "/bin/k3d-entrypoint…"   2 minutes ago    Up 2 minutes                                        k3d-example-server-0
```

按照样例的 [README](https://github.com/kubernetes/client-go/blob/v0.30.1/examples/leader-election/README.md)，在 3 个终端中运行 Leader Election 样例代码。

```console
$ go run main.go -kubeconfig=~/.kube/config -logtostderr=true -lease-lock-name=example -lease-lock-namespace=default -id=1
I0612 22:59:20.118613   27504 leaderelection.go:250] attempting to acquire leader lease default/example...
I0612 22:59:20.124630   27504 leaderelection.go:260] successfully acquired lease default/example
I0612 22:59:20.124696   27504 main.go:87] Controller loop...

$ go run main.go -kubeconfig=~/.kube/config -logtostderr=true -lease-lock-name=example -lease-lock-namespace=default -id=2
I0612 22:59:32.692373   27815 leaderelection.go:250] attempting to acquire leader lease default/example...
I0612 22:59:32.695277   27815 main.go:151] new leader elected: 1

$ go run main.go -kubeconfig=~/.kube/config -logtostderr=true -lease-lock-name=example -lease-lock-namespace=default -id=3
I0612 22:59:36.424251   28089 leaderelection.go:250] attempting to acquire leader lease default/example...
I0612 22:59:36.427674   28089 main.go:151] new leader elected: 1
```

按顺序在 3 个终端中依次运行样例代码，可以看到 ID 为 1 的程序最先运行所以它成了 Leader，其余两个程序则在待命中。

这时对 ID 1 的程序执行 Ctrl-C，发送 `SIGINT` 中断信号，让它 Context Canceled，ID 1 程序会释放 Lease 锁并结束运行，其余两个程序中的某一个则会重新竞争，其中一个变成 Leader。

```console
$ go run main.go -kubeconfig=~/.kube/config -logtostderr=true -lease-lock-name=example -lease-lock-namespace=default -id=3
I0612 22:59:36.424251   28089 leaderelection.go:250] attempting to acquire leader lease default/example...
I0612 22:59:36.427674   28089 main.go:151] new leader elected: 1
I0612 23:02:56.584777   28089 leaderelection.go:260] successfully acquired lease default/example
I0612 23:02:56.584866   28089 main.go:87] Controller loop...
```

查看样例程序代码，`leaderelection.RunOrDie` 的参数传递的 Config 定义了 Leader Election 机制的 Callback 回调函数以及租约相关的时间 Duration。

`Callbacks` 回调函数分为：

- `OnStartedLeading`: 当该程序被选举为 Leader 时，执行此回调函数，通常该回调函数启动 Controller 的 Sync 逻辑等一些操作。
- `OnStoppedLeading`: 当该程序不再是 Leader 时（可能是收到了 `SIGINT` 信号，Context Canceled 或程序出故障，很长一段时间没有去更新 Lease 锁），会执行此回调函数，执行一些资源释放等操作，然后直接 `os.Exit` 结束程序。
- `OnNewLeader`: 当其他某个程序被选举为 Leader 时，会执行此函数，一般没什么用，可以不配置。

Config 的其他参数：
- `Lock`: Lease Lock。
- `ReleaseOnCancel`: 当 Context Cancel（当前的 Leader 结束运行）时，释放当前的 Lease 锁，使得其他 Pod 可以立即进行新一轮的选举。如果设置为 false 的话，当前 Leader 挂掉后其他 Pod 并不知道当前 Leader 已经挂掉了，只有过很长一段时间，发现 Lease 锁超过了 `LeaseDuration` 时间还没被更新，才会去强行的执行新一轮的选举。
- `LeaseDuration`: 结合上方的 `ReleaseOnCancel` 的介绍，假设当前 Leader Pod 出故障了（例如被 `SIGKILL` 立即杀死，Context 来不及 Cancel，或者调试进入了 Breakpoint 断点，程序暂停），Lease 锁没被释放，但当前 Leader 出问题挂掉了，其他待命的 Pod 发现 Lease 锁已经超过 `LeaseDuration` 没有被更新，则会强行进行新一轮的选举，而原 Leader 如果还活着的话，也会执行 `OnStoppedLeading` 回调函数结束运行。
- `RenewDeadline`: Leader 每隔一段时间会更新一次 Lease 锁。
- `RetryPeriod`: 如果 Leader 更新 Lease 锁失败了，会在一段时间后重试。

所以有些小朋友在调试软件时，进入断点再恢复运行时会莫名其妙的结束运行，其实就是 Leader Election 机制搞的。所以如果想调试程序，可以临时把 `LeaseDuration` 设置长一些（例如好几天），这样调试断点恢复后，程序就不会被杀死了。

## 杂谈

常用的 Operator 框架都支持 Leader Election，所以基本不用手写 `RunOrDie` 这部分代码，例如 Rancher 使用的 [Wrangler](https://github.com/rancher/wrangler/) 框架，当程序成为 Leader 时，直接执行 [OnLeader](https://github.com/rancher/rancher/blob/v2.9.0-rc1/pkg/wrangler/context.go#L175) 回调函数启动一系列业务逻辑。而当程序还没被选为 Leader 时，只初始化 Informer Cache 等初始化步骤，不启动 Sync 相关逻辑。

通常 `sample-controller` 或其他简单的 Controller 在 Worker Start 执行完之后，会加一个 `<-ctx.Done()` 阻塞（[代码位置](https://github.com/kubernetes/sample-controller/blob/master/controller.go#L182)），遇到 Context Cancel 后直接结束运行。但如果加了 Leader Election 机制，当 Context Cancel 时是由 Leader Election 的 `OnStoppedLeading` 回调函数结束运行并释放 Lease 锁，所以 `main` 函数可以改为使用 `select {}` 阻塞，否则程序在 Context Cancel 时 Lease 锁还没来得及释放就由 `main` 函数结束运行了。

所以读这里，可以得出结论，就算设置数量特别多的 Replicas，实际上依旧只有一个 Controller Pod 在执行真正的 Sync 逻辑，而其他 Pod 只是在观望，或者只提供一些 Web Server 功能。如果想让多个冗余 Pod 分别 Sync 不同的资源更新，需要设计一个更复杂的锁，而这又会增加一定的 API Server 请求数量……
