---
title: 当你刚开始尝试去写 Kubernetes Controller……
date: 2023-06-10T02:33:58+08:00
layout: post
tags:
- Kubernetes
- Controller
categories:
- Kubernetes
---

Controller 对初学着来说有那么亿点点抽象，虽然网络上能找到很多有关 Kubernetes Controller 的讲解，但是 Kubernetes 的学习过程往往是一个离散的而不是连续的过程。如果想弄懂 Controller 还是有蛮高门槛的，不要想着看完 Kubernetes 的文档，速成了 Kubernetes 的基本知识就去尝试写 Controller，这种操作就好比刚过完新手教程就去打高难副本，尽管能仿着 `sample-controller` 写一个能“跑”的 Controller，但仅仅只能做到能“跑”的程度……

> 与标题有些不同，这篇博客主要讲的是萌新如何上手编写 Controller，如果你是 Kubernetes 初学者，希望这篇博客能帮助你建立编写 Controller 的学习曲线。

<!--more-->

## 前期准备

对刚接触 Kubernetes 的萌新来讲，这个体系还是蛮复杂和抽象的，只靠读文档看教程自学可不是那么容易。光是怎么安装一个 Kubernetes 集群，在不同的教程里就有无数种方法了。传统的安装 Kubernetes 的方法过于硬核，现在几乎没人选择这种方式部署集群了。咱常用的比较简单的方式有 [k3s](https://k3s.io)，光靠一个脚本就能在虚拟机上一键部署一个轻量级的集群，很适合萌新（前提是你没有必须用包管理器安装任何软件的强迫症），但是如果你想在国内的网络环境靠这个脚本安装 `k3s` 的话，需要一些参数配置国内源，这里不再赘述。除此之外还可以[用 Docker 方式部署一个单节点 Rancher](https://ranchermanager.docs.rancher.com/zh/pages-for-subheaders/rancher-on-a-single-node-with-docker)，Rancher 的 Web 界面可以更好的帮助萌新去管理 Kubernetes 资源（当然你还可以选择敲 `kubectl` 指令的方式），还有很多教程会推荐你使用 `minikube`，当然你可以选择任何一种方式去部署你自己的集群，只要你觉得这种方法适合你，而且部署的集群版本不要太低即可。

如果想编写 Controller，你得有一定的 Kubernetes 基础（废话），并且熟悉 Go 语言（废话 x 2）。在看完 Kubernetes 文档，熟悉了 k8s 的资源和如何使用 `kubectl` 操作他们后，先别急着上手写 Controller。首先你得熟悉 [client-go](https://github.com/kubernetes/client-go)，`client-go` 的代码能在 GitHub (<https://github.com/kubernetes/client-go>) 中下载到，但记住它的 Go Module 为 `k8s.io/client-go`，不在 `github.com`。

首先了解一些常见的 Kuberntes API 类型，知道 Kubernetes 的资源对象是怎么在 `client-go` 中用 Go 语言表示的，并如何调用 API 去管理他们（而不是仅凭 `kubectl` 命令行客户端去管理他们），
这里不单单有 `client-go` 这一个 Git 仓库，还有 `k8s.io/api`, `k8s.io/apimachinery` 等仓库，后面写 Controller 时会经常用到这些 API。认识一下 `TypeMeta` 和 `ObjectMeta` （代码位置在[这里](https://github.com/kubernetes/apimachinery/blob/master/pkg/apis/meta/v1/types.go)），每个资源对象的 Go 结构中都包含这些数据（除此之外每个资源还有 `Spec`, `Status` 等），写代码时会经常用到 `json/yaml` 的 `Marshal/Unmarshal` 操作，熟悉到这个程度就可以了。

然后是 Kubernetes 的自定义资源（Custom Resource, CR）这个概念，k8s 内置了一些 Resource 资源对象，例如 `pod`, `deployment`, `service`, `secret` 等，你可以用 `kubectl` 去 `get/describe/create/delete...` 这些资源，但如果你想往 k8s 中添加一些你自己的自定义资源，比如你想定义一个资源叫做 `database`，你用 `kubectl create database ...` 就能创建一个你自己想要的数据库，像 `create pod`, `create secret` 那样，然后还能对你的自定义资源对象进行 `describe/delete/update...` 等操作，就需要用到自定义资源（开发者更习惯叫他的简写 CR，以及自定义资源定义的简写 CRD）。Controller 就是用来管理这些 CRs 的。在开发 Controller 时我们需要定义 CR 中包含哪些数据，然后使用代码生成器生成资源的 `DeepCopy` 等方法，减少不必要的重复代码编写。

> 可以不用把每个细节都尝试弄懂，把基本概念过一遍就行，学习 Kubernetes 的过程是一个离散的过程而不是连续的过程，当碰到哪个地方不明白卡住的时候直接跳过去看后面的内容就行啦~

## 什么是 Controller

在上面介绍 CR 的定义时有解释 Controller 是用来管理 CR 的，比如我们执行 `kubectl create database ...` （实际是执行 `kubectl apply -f` 部署了一个 `Kind` 为 `database` 的 YAML，不能直接 `create database`，但这么说比较方便理解~）创建了一个 `database` 类型的资源，因为这个资源是我们自定义的，所以 Kubernetes 只是在 etcd 数据库中记录了：“我们创建了一个 `database` 资源，他的数据内容是什么什么……”，并没有进行创建数据库的操作！而 Controller 就是用来管理 Database 资源的生命周期的，比如我们 `create database` 之后，Controller 会发现我们新建了一个 Database 资源，然后会去创建一个 Database Deployment。当我们 `delete database` 时，Controller 会注意到我们删除了 Database，之后执行资源释放一系列操作。

往简单了讲，Controller 干的事情就是对比资源当前实际的状态和我们设定的资源状态是否一致。比如这个资源定义的 `replicas` 为 2，但实际只有一个 Pod 在运行，Controller 就会再去创建一个 Pod 使其实际的 `replicas` 为 2。

当然 Controller 实现起来比这复杂多了，可不是一个简单的 `for` 循环不断从 Kube API 中查询资源然后做对比这么简单，这用到了 Cache 缓存机制和 Informer 消息提醒机制，减少 Kube API 请求次数，读取内存中的状态缓存什么的，听不懂没关系，以后会懂的……

## sample-controller

`github.com/kubernetes/sample-controller` 项目是一个样例 Controller，所有的初学者都是靠这个项目学习 Controller 的，相当于是高难副本中最简单的了，可以把这个样例 Controller 改造为自己的 Controller，用来学习。

本篇教程以编写 `database-controller` 为例，按照 `sample-controller` 的 Controller 框架编写一个数据库的 Controller，重点在于怎么上手写 Controller，不在数据库。

将 `sample-controller` 代码克隆到本地 `$GOPATH` 目录下：

```console
$ midir -p $GOPATH/src/github.com/<USERNAME>/ && cd $GOPATH/src/github.com/<USERNAME>/
$ git clone git@github.com:kubernetes/sample-controller.git && cd sample-controller
```

### 初始化 Controller

按照 `sample-controller` 的 Controller 框架，将其修改为我们想要实现的 Controller。

- 修改项目名称为 `database-controller`，修改 `git remote`。
- 编辑 `go.mod` 修改 Module 名称，把代码的 `k8s.io/sample-controller` 改为 `github.com/<USERNAME>/database-controller`。
- 编辑 `hack/boilerplate.go.txt` 中的版权信息。
- 修改 `README`，`OWNERS`，`SECURITY_CONTACTS` 等信息。
- 编辑执行**代码生成器**的脚本 [hack/update-codegen.sh](https://github.com/kubernetes/sample-controller/blob/master/hack/update-codegen.sh)
    - 编辑脚本中的代码生成器所在位置，脚本中原本写的是使用了 `go mod vendor` 将 Go 依赖都放到了项目的 `vendor` 目录下时生成器的位置，按实际情况进行修改（比如改成 `$GOPATH` 目录下）。
    - 编辑 `code-generator` 的参数，把 `k8s.io/sample-controller` 改成 `github.com/<USERNAME>/database-controller`, 并编辑 `--output-base` 的目录位置。
    - 执行代码生成器脚本，确保能正确生成代码。

之后修改 `pkg/apis/samplecontroller` 目录为 `pkg/apis/databasecontroller`，同时把 `samplecontroller` 包修改为 `databasecontroller`。
- 把代码中所有使用了 `samplecontroller` 包的地方都改为 `databasecontroller`（被代码生成器生成的代码可以不用改，后面会重新生成代码）。
- 修改 `pkg/apis/databasecontroller/register.go` 的 `GroupName` 为 `database.<YOUR_DOMAIN>`，例如 `database.example.io`。
- 修改代码生成器的注释，把 `pkg/apis/databasecontroller/v1alpha1/doc.go` 的 `groupName` 修改为 `database.example.io`。
- 重新执行代码生成器 `./hack/update-codegen.sh`。

先简单熟悉一下修改后的项目的代码结构：
- `main.go` 中先构建了 Kubernetes 和 `database-controller` 的 `Client`，之后基于 `Client` 构建了 `SharedInformer`，最后创建并启动 Controller。

    简单来讲，`Informer` 在资源发生改动时，调用相应事件的处理函数，它可以对“增加”，“更新”，“删除”三种事件进行“监控”处理（一点也不简单，太抽象了）。然后 Informer 还充当了缓存的作用，查询资源状态时只需要查询 Informer 的缓存即可，不需要反复调用 Kube API，减少性能损耗。

- `controller.go` 包含这些内容：
    - 构建 Controller 的 `NewController`、启动 Controller 的 `Run`，还有 Informer 在不同事件（Event）进行处理的函数……
    - 创建 Deployment 的函数，`sample-controller` 中的 CRD Kind 为 `foo`，这个 `foo` 创建的 Deployment 是一个 `nginx` Pod，有点抽象，后面要把 `foo` 改成咱们要实现的 `database`，原理实际都没变。

    Controller 结构体中包含了：
    - `kubernetes` 和代码生成器生成的 `database` 的 `clientSet`。
    - Informer 的 Lister，用来从缓存中获取资源。
    - `workqueue`：Rate Limit 消息队列。
        Controller 在运行时实际是一直尝试从 `workqueue` 中获取资源并处理。Informer 在接收到状态更新后，会把更新的状态入队列，然后另一个 Routine 中会获取到队列中的消息，拿去处理。
        （蛮复杂的，这里还是去直接看代码比较好）

### 修改 Controller

接下来按照上面讲的那样，修改 `pkg/apis/databasecontroller/v1alpha1/types.go` 中的 `Spec` 和 `Status` 字段，`Spec` 中的字段是你想定义的 Database 的状态，然后 Controller 负责按照你定义的 `Spec` 去创建 Deployments 并更新 `Status`。

首先需要把 `Foo` 改名成 `Database`，然后编辑 `Spec` 中的字段，例如数据库所使用的镜像名称及 Tag，`Replicas` 冗余数以及其他你觉得创建 Deployment 所需的自定义配置。在修改完 `Spec` 和 `Status` 后需要重新执行代码生成器。

之后在项目根目录下编辑 `controller.go`，修改控制器创建 Deployment 的逻辑，把 `Foo` 对象修改为 `Database`，然后按照你定义的 `Spec`，编辑 `artifacs/example` 目录下的 `crd.yaml` 和 `example-database.yaml` 文件，这部分咱就不把详细的步骤写到这里了，你可以根据你的想法尝试编写你的 Controller，在这里遇到问题最好还是自行尝试动手解决。

## 其他

后面还有好多关于 Controller 相关的知识点我也还没搞懂，就不写到博客里误导别人了。除了 `sample-controller` 这种框架的 Controller 之外，还有很多人使用其他的框架编写 Controller，因为很多时候我们更关注于实现业务逻辑，因此可以套用一些 Operator 模板，常用的有 [Operator SDK](https://sdk.operatorframework.io/)，可以通过这个工具生成一份 Controller 模板，然后按照你想实现的功能去修改代码即可，还有很多其他 Operator 可供选择，比如 Rancher 的开发者们使用 [Wrangler](https://github.com/rancher/wrangler) 编写 Controller，基于 `Wrangler` 编写的 Rancher 使用的 Operator 有 [eks-operator](https://github.com/rancher/eks-operator) 等一堆 Operator，感兴趣的话可以去看看。`Wrangler` 的 README 中写的这一段蛮有意思的：

> Most people writing controllers are a bit lost as they find that there is nothing in Kubernetes that is like `type Controller interface` where you can just do `NewController`. Instead a controller is really just a pattern of how you use the generated clientsets, informers, and listers combined with some custom event handlers and a workqueue.

之后如果想把你编写的 Controller (Operator) 应用到生产环境，打包给更多的人使用，可以把编译好的 Operator 二进制文件放到容器镜像中，之后使用 [Helm](https://helm.sh) 创建一个 "应用程序 (Chart)"，通过编写 [模板](https://helm.sh/docs/chart_best_practices/templates/)，在安装 Helm Chart 时编辑 `values.yaml` 中定义的字段来自定义 CRD 的参数。Helm 的模板本质上是 Go Template 模板渲染引擎，所以用起来都是很简单的（确信）。
