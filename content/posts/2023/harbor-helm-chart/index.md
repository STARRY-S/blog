---
title: 使用 Helm Chart 方式部署 Harbor
date: 2023-05-28T16:49:45+08:00
layout: post
tags:
- "Harbor"
- "Kubernetes"
- "Helm"
categories:
- "Kubernetes"
---

打算尝试在咱的 NAS 上搭一个 Harbor Registry Server 玩。

<!--more-->

首先介绍一下 NAS 上的环境，咱的 Kubernetes 集群运行在几个 QEMU 虚拟机里，虚拟机里运行的是 ArchLinux，因为就是咱折腾着玩的所以使用的 k3s 搭建的轻量级的 kubernetes 集群，然后其中一个集群安装了 Rancher 作为 Local 集群。

## 环境准备

1. 新建一个 Namespace，将 Harbor 的资源与其他资源隔离：

    ```console
    $ kubectl create namespace harbor
    ```

1. 为了启用 HTTPS，提前创建一个 TLS 类型的 [Secret](https://kubernetes.io/docs/concepts/configuration/secret/)，存放证书:

    ```console
    $ cat > cert.pem << EOF
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
    EOF

    $ cat > cert.key << EOF
    -----BEGIN PRIVATE KEY-----
    ...
    -----END PRIVATE KEY-----
    EOF

    $ kubectl -n harbor create secret tls harbor-tls \
        --cert=cert.pem \
        --key=cert.key
    ```

1. 提前创建 PVC ([PersistentVolumeClaim](https://kubernetes.io/docs/concepts/storage/persistent-volumes/))，咱这里先在 NAS 上新建了一个 NFS 服务器，之后创建了 NFS 类型的 PV (PersistentVolumes)，再基于这个 PV 创建的 PVC。

    ArchLinux 上搭建 NFS 服务器：<https://wiki.archlinux.org/title/NFS>

    > 在配置 `exports` 时，需要配置上 `no_root_squash` 和 `no_subtree_check`，使挂载的目录及子目录具有写权限。
    >
    > ```conf
    > # /etc/exports - exports(5) - directories exported to NFS clients
    > # Use `exportfs -arv` to reload.
    >
    > /var/nfs/harbor		10.0.0.0/8(rw,sync,no_root_squash,no_subtree_check)
    > ```

## 获取 Helm Chart

Harbor 的 Helm Chart 可以在 [GitHub](https://github.com/goharbor/harbor-helm) 获取，这里使用将 Chart 源码克隆到本地的方式安装，方便编辑 `values.yaml`。

```console
$ git clone https://github.com/goharbor/harbor-helm.git && cd harbor-helm
$ git checkout v1.12.1
```

> 写这篇博客时 Chart 的最新版本是 `v1.12.1` (Harbor OSS v2.8.1)。

### 编辑 `values.yaml`

Harbor 的配置都定义在了 `values.yaml` 文件中，根据需要进行修改。

这里列举些常用的可以修改的选项：

```yaml
expose:
  # expose type, 可以设置为 ingress, clusterIP, nodePort, nodeBalancer，区分大小写
  # 默认为 ingress（如果不想使用 80/443 标准端口，可以设置为 nodePort，端口为高位 3000X）
  type: ingress
  tls:
    # 是否启用 TLS (HTTPS)，建议启用
    enabled: true
    # TLS Certificate 的来源，可以为 auto, secret 或 none
    # 如果为 secret，需要在安装 Chart 之前先创建 TLS Secret
    # 1) auto: generate the tls certificate automatically
    # 2) secret: read the tls certificate from the specified secret.
    # The tls certificate can be generated manually or by cert manager
    # 3) none: configure no tls certificate for the ingress. If the default
    # tls certificate is configured in the ingress controller, choose this option
    certSource: secret
    secret:
      # The name of secret which contains keys named:
      # "tls.crt" - the certificate
      # "tls.key" - the private key
      secretName: "harbor-tls"
      # Only needed when the "expose.type" is "ingress".
      notarySecretName: "harbor-tls"
  ingress:
    hosts:
      # Ingress Host，如果需要允许任意域名/IP 都能访问，将其设置为空字符串（不建议）
      # 这里填写的域名务必能解析到当前集群
      core: harbor.example.com
      notary: notary.example.com

# Harbor external URL
# 与 Ingress Host 相对应，如果启用了 TLS，那就是 https://<domain>
# 如果没启用 TLS，那就是 http://<domain>
# 如果 expose type 为 nodePort，则填写 http(s)://<IP_ADDRESS>:3000X (端口号不能丢)
externalURL: https://harbor.example.com

# 持久卷配置，默认为 true，如果是测试环境可以设置为 enabled: false (重新安装 Chart 时仓库里所有的数据都会丢失，不建议！)
# 如果需要启用持久卷，可以在安装 Chart 之前提前创建好 PVC，并配置 subPath
persistence:
  enabled: true
  resourcePolicy: "keep"
  persistentVolumeClaim:
    registry:
      # 填写已经创建好的 PVC
      existingClaim: "harbor-pvc"
      storageClass: ""
      # 如果共用一个 PVC，需要设置子目录
      subPath: "registry"
      accessMode: ReadWriteOnce
      size: 5Gi
      annotations: {}
    jobservice:
      jobLog:
        existingClaim: "harbor-pvc"
        storageClass: ""
        subPath: "jobservice"
        accessMode: ReadWriteOnce
        size: 1Gi
        annotations: {}
    database:
      existingClaim: "harbor-pvc"
      storageClass: ""
      subPath: "database"
      accessMode: ReadWriteOnce
      size: 1Gi
      annotations: {}
    redis:
      existingClaim: "harbor-pvc"
      storageClass: ""
      subPath: "redis"
      accessMode: ReadWriteOnce
      size: 1Gi
      annotations: {}
    trivy:
      existingClaim: "harbor-pvc"
      storageClass: ""
      subPath: "trivy"
      accessMode: ReadWriteOnce
      size: 5Gi
      annotations: {}

# Admin 初始密码
harborAdminPassword: "Harbor12345"
```

### 安装 Helm Chart

确保 Values 编辑无误后，就可以安装 Chart 了：

```console
$ helm --namespace harbor install harbor .
```

如果安装后发现 Values 中有些配置需要修改，可以在修改完配置后以升级的方式使配置生效：

```console
$ helm --namespace harbor upgrade harbor .
```

查看 Chart 的 Pods 运行状态：

```console
$ kubectl --namespace harbor get pods
NAME                                    READY   STATUS    RESTARTS      AGE
harbor-core-7b75785b64-9vzkx            1/1     Running   0             65m
harbor-database-0                       1/1     Running   0             77m
harbor-jobservice-6f4d59bd95-25q44      1/1     Running   2 (65m ago)   65m
harbor-notary-server-584698b475-lnt99   1/1     Running   1 (60m ago)   65m
harbor-notary-signer-77685b6f94-pfngc   1/1     Running   0             65m
harbor-portal-6fb6465fd6-hm4cg          1/1     Running   0             77m
harbor-redis-0                          1/1     Running   0             77m
harbor-registry-5bbccf79fb-7hcm9        2/2     Running   0             65m
harbor-trivy-0                          1/1     Running   0             77m
```

## 其他

安装完成后，就可以完美使用 Harbor Registry 了。

```console
$ docker login harbor.example.com
Username: admin
Password:
WARNING! Your password will be stored unencrypted in /home/user/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credentials-store

Login Succeeded
```

从 DockerHub 中 Mirror 一些镜像到 Harbor 中：

```console
$ skopeo copy --all docker://archlinux:latest docker://harbor.example.com/library/archlinux:latest
Getting image list signatures
Copying 1 of 1 images in list
Copying image sha256:076c0233d1996165721320957be9a037a760574d6334281354b07b3b3c9440b1 (1/1)
Getting image source signatures
Copying blob f0e04a7b4686 done
Copying blob 352736306209 done
Copying config cc4866169d done
Writing manifest to image destination
Storing signatures
Writing manifest list to image destination
Storing list signatures
```
