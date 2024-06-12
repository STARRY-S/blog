---
title: Leader Election 折腾小记
date: 2024-06-12T18:52:00+08:00
layout: post
draft: true
tags:
- Kubernetes
- Leader Election
categories:
- Kubernetes
---

最近好忙，有很多想写博客的东西都没时间写，五一去了佛山的 HiFurry，本来想着整理点照片水一篇博客但没时间也没精力，后来想写时已经过去一个多月了所以懒得写了。

<!--more-->

------

最近在折腾 Operator，就是用现成的框架写的 Controller。Operator 省去了重复且繁琐的使用 client-go 手搓 ClientSet、Informer、Lister、WorkQueue 等一大堆重复代码的步骤，只要基于已有的框架去写资源对象更新/删除时的业务处理逻辑就行了。

## Leader Election 是什么

当负载在 Kubernetes 运行时，通常会设置多个 Replicas 冗余副本，以实现高可用（HA），例如通常会将某些系统组件的 Replicas 设置为 2，就会创建两个对应的 Pods，通常这俩 Pod 会被调度到不同的节点上，在某个 Pod 挂掉时还能用另一个节点的 Pod。

Leader Election 机制是由“领导人选举机制”抽象而来的，可以理解为在多个“候选者”中选取某一个作为 Leader。这里的候选者指的是负载创建的多个冗余 Pod，Leader Election 机制从中选取某一个 Pod 作为 Leader，其他 Pod 则处于“待命”状态，如果 Leader Pod 出现故障，则会重新选举一个 Leader Pod。

Kubernetes 使用 Lease 资源（译作：租约）作为 Leader Election 的锁。和常用的 Mutex 互斥锁不同，Lease 资源会被 Leader Pod 每隔几秒钟更新一次。如果长达一段时间 Lease 没有被更新，则说明 Leader 挂掉了，其他 Pods 会竞争，尝试更新这个 Lease 锁，而成功更新了 Lease 的 Pod 会成为新的 Leader，其余 Pod 则继续处于待命状态。

大多数情况下，当某个资源发生更新时，我们不希望所有的冗余副本 Pod 都去处理某一个资源的更新，而是让某一个 Pod 去处理就可以了，不然会混乱（比如遇到 Conflict 报错: `the object has been modified; please apply your changes to the latest version and try again`）。这时可以用到 Leader Election 机制，从多个冗余 Pod 中只选其中某一个 Pod 作为 Leader 处理资源更新，其余 Pod 只作为待命或其他用途。

如果你的 Controller 没有 Leader Election 机制，通常只能强行设定其 Replicas 为 1，但如果有人修改了冗余数值为 2，则会出现一些问题，日志会刷大量的 Conflict 报错之类的，所以更严谨的方式是为 Controller 添加 Leader Election，以允许多 Replicas 的情况。

## 举个栗子

client-go 的样例代码中有 [Leader Election 例子](https://github.com/kubernetes/client-go/blob/v0.30.1/examples/leader-election/main.go)，
