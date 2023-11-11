---
title: 容器镜像 Manifest 相关内容整理
date: 2023-05-21T01:50:27+08:00
layout: post
tags:
- Container
categories:
- Container
---

最近总在弄些容器镜像相关的东西，于是分享一些咱自己总结的有关容器镜像 Manifest 格式、常用工具以及代码相关的芝士。

<!--more-->

{{< music server="netease" type="song" id="590414" >}}

## skopeo

[skopeo](https://github.com/containers/skopeo) 是一个肥肠好用的容器镜像的辅助工具，常用到的功能有镜像拷贝 (`skopeo copy`)、镜像 Manifest 查询 (`skopeo inspect`)等……

`skopeo` 仅支持 Linux 和 macOS 系统。

### 安装 skopeo

```sh
# ArchLinux
sudo pacman -S skopeo

# macOS
brew install skopeo
```

除此之外还可以使用 `skopeo` 的容器镜像：

```console
$ docker run docker://quay.io/skopeo/stable:latest copy --help
```

> `skopeo` 由 Go 编写，但它启用了 `cgo`，编译的二进制文件需要动态链接第三方依赖，所以不同的系统编译的 skopeo 二进制文件并不一定互相通用，如果你的发行版的官方源没有提供 `skopeo` 软件包的话，只能手动安装 Go 和 `skopeo` 的一些依赖，然后 [自行编译 skopeo 二进制文件](https://github.com/containers/skopeo/blob/main/install.md#building-from-source)。

### skopeo copy

`copy` 可以灵活的拷贝容器镜像，它可以将容器镜像从 Registry Server 之间拷贝，还可以将镜像从 Registry Server 拷贝到本地的文件夹中，或者像 `docker pull` 那样拷贝到 Docker Daemon 中。

在执行 `skopeo copy` 时还可以用 `--format` 参数指定拷贝过去的容器镜像的格式，用参数 `--dest-compress-format` 可以指定压缩格式。

将容器镜像从第三方 DockerHub Registry Server 拷贝到自建的 Private Registry Server：
```console
$ skopeo copy docker://docker.io/library/nginx:latest docker://private.registry.io/library/nginx:latest --all
```

将镜像从 DockerHub Registry Server 拷贝到本地文件夹中：
```console
$ mkdir -p nginx
$ skopeo copy docker://docker.io/library/nginx:latest dir:./nginx
```

将镜像从本地文件夹中拷贝到 Docker Daemon 中：
```console
$ skopeo copy dir:./nginx docker-daemon:nginx:latest
$ docker images
REPOSITORY  TAG       IMAGE ID       CREATED        SIZE
nginx       latest    448a08f1d2f9   13 days ago    142MB
```

### skopeo inspect

`skopeo inspect` 查看容器镜像的信息，例如镜像的 Manifest、Config。

```console
$ skopeo inspect docker://docker.io/library/nginx:latest

$ skopeo inspect docker://docker.io/library/nginx:latest --raw

$ skopeo inspect docker://docker.io/library/nginx:latest --raw --config
```

`skopeo inspect` 不加任何参数时，查询的是容器镜像相关的信息，输出的内容包括镜像 Digest、该镜像其他的所有 Tag 等一系列信息。

在添加 `--raw` 参数时，输出的是该镜像的 Manifest 原始信息，因为是 RAW，所以输出的 Json 可能格式不是很友好，通常与 `jq` 一起使用。

添加 `--raw` 和 `--config` 参数后，输出的是该镜像的 Config 的原始信息，Config 中包括容器运行时的一些配置项等信息。

## Manifest

Docker 文档 [Registry image manifests](https://docs.docker.com/registry/spec/manifest-v2-1/) 中介绍了几种常见的 Docker 镜像的 Manifest 格式。

----

可以通过 [skopeo](https://github.com/containers/skopeo) 工具，从 Docker Hub 上挑一个容器镜像 (例如 `nginx:latest`)，查看这个镜像的 Manifest。

```json
// skopeo inspect docker://nginx:latest --raw | jq
{
  "manifests": [
    {
      "digest": "sha256:3f01b0094e21f7d55b9eb7179d01c49fdf9c3e1e3419d315b81a9e0bae1b6a90",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "amd64",
        "os": "linux"
      },
      "size": 1570
    },
    {
      "digest": "sha256:bc4cb92540db42f21dd806c4451f33b623a9b6441c882e8554325f3a3702da76",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "arm",
        "os": "linux",
        "variant": "v5"
      },
      "size": 1570
    },
    ......
  ],
  "mediaType": "application/vnd.docker.distribution.manifest.list.v2+json",
  "schemaVersion": 2
}
```

这里输出的 json object 的 `schemaVersion` 为 2，`mediaType` 为 `application/vnd.docker.distribution.manifest.list.v2+json`。

### schemaVersion & mediaType

容器镜像的 Manifest 有很多种不同的格式，先列举一下常见的 Docker 镜像的 Manifest 格式：
1. `schemaVersion: 1`, `mediaType: "application/vnd.docker.distribution.manifest.v1+json"`

    旧版本的 Docker 使用这种 Manifest 格式，现已被弃用，有些旧的容器镜像依旧是这种格式的 Manifest。

    ```json
    // skopeo inspect docker://mysql:5.5.40 --raw | jq
    {
        "name": "library/mysql",
        "tag": "5.5.40",
        "architecture": "amd64",
        "fsLayers": [
            {
                "blobSum": "sha256:a3ed95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b46d4"
            }
            ......
        ],
        "history": [
            ......
        ],
        "schemaVersion": 1,
        "signatures": [
            {
                ......
            }
        ]
    }
    ```

    (输出太长了所以我把不关键的内容省略掉了……)

    这里用 `docker.io/library/mysql:5.5.40` 这个镜像举例，实际这个镜像的 Manifest 格式为 `schemaVersion: 1`，`mediaType: "application/vnd.docker.distribution.manifest.v1+prettyjws"`，因为包含了签名信息。

1. `schemaVersion: 2`, `mediaType: "application/vnd.docker.distribution.manifest.v2+json"`

    这个是现在常见的 Docker 镜像的 Manifest 格式。

    ```json
    // skopeo inspect docker://hxstarrys/nginx:1.22-amd64 --raw | jq
    {
    "schemaVersion": 2,
    "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
    "config": {
        "mediaType": "application/vnd.docker.container.image.v1+json",
        "size": 7898,
        "digest": "sha256:0f8498f13f3adef3f3c8b52cdf069ecc880b081159be6349163d144e8aa5fb29"
    },
    "layers": [
        {
            "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
            "size": 31411405,
            "digest": "sha256:f1f26f5702560b7e591bef5c4d840f76a232bf13fd5aefc4e22077a1ae4440c7"
        },
        {
            "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
            "size": 25573496,
            "digest": "sha256:fd03b214f77493ccb73705ac5417f16c7625a7ea7ea997e939c9241a3296763b"
        },
        ......
    ]
    }
    ```

    这个格式的 Manifest 包含了镜像的 Config 的信息以及 Layer 的格式和 Digest 信息。

1. `schemaVersion: 2`, `mediaType: "application/vnd.docker.distribution.manifest.list.v2+json"`

    这个格式的 Manifest List 包含一个 `manifests` 列表：

    ```json
    // skopeo inspect docker://docker.io/library/nginx:1.22 --raw | jq
    {
    "mediaType": "application/vnd.docker.distribution.manifest.list.v2+json",
    "schemaVersion": 2,
    "manifests": [
        {
            "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
            "digest": "sha256:9081064712674ffcff7b7bdf874c75bcb8e5fb933b65527026090dacda36ea8b",
            "size": 1570,
            "platform": {
                "architecture": "amd64",
                "os": "linux"
            }
        },
        {
            "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
            "digest": "sha256:cf4ffe24f08a167176c84f2779c9fc35c2f7ce417b411978e384cbe63525b420",
            "size": 1570,
            "platform": {
                "architecture": "arm64",
                "os": "linux"
            }
        }
    ]
    }
    ```

    例如在 x86_64 (amd64) 架构的 Linux 主机上拉取 TAG `docker.io/library/nginx:1.22` 时，会根据此 Manifest List，拉取 Digest 为 `sha256:9081064712674ffcff7b7bdf874c75bcb8e5fb933b65527026090dacda36ea8b` 的镜像。在 aarch64 (arm64v8) 架构的 Linux 主机上拉取此 TAG 时，会根据 Manifest List，拉取 Digest 为 `sha256:cf4ffe24f08a167176c84f2779c9fc35c2f7ce417b411978e384cbe63525b420` 的镜像，在其他 OS 的主机上无法拉取这个 TAG 对应的镜像 (例如在 arm32v7 的 Linux 主机上拉取会失败)。

    `manifests` 列表中，每个 `digest` 字段存储的是这个镜像的 Manifest 内容的 sha256 校验和。

    可以用 `skopeo inspect` 查看一下这个 digest 的镜像的 Manifest 内容，其格式为
    `schemaVersion: 2`, `mediaType: "application/vnd.docker.distribution.manifest.v2+json"`

    ```json
    // skopeo inspect docker://nginx@sha256:9081064712674ffcff7b7bdf874c75bcb8e5fb933b65527026090dacda36ea8b --raw | jq
    {
        "schemaVersion": 2,
        "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
        "config": {
            "mediaType": "application/vnd.docker.container.image.v1+json",
            "size": 7898,
            "digest": "sha256:0f8498f13f3adef3f3c8b52cdf069ecc880b081159be6349163d144e8aa5fb29"
        },
        "layers": [
            {
                "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
                "size": 31411405,
                "digest": "sha256:f1f26f5702560b7e591bef5c4d840f76a232bf13fd5aefc4e22077a1ae4440c7"
            },
            {
                "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
                "size": 25573496,
                "digest": "sha256:fd03b214f77493ccb73705ac5417f16c7625a7ea7ea997e939c9241a3296763b"
            },
            {
                "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
                "size": 626,
                "digest": "sha256:ef2fc869b944b87eaf25f4c92953dc69736d5d05aa09f66f54b0eea598e13c9c"
            },
            {
                "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
                "size": 958,
                "digest": "sha256:ac713a9ef2cca7a82e27f0277e4e3d25c64d1cf31e4acd798562d5532742f5ef"
            },
            {
                "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
                "size": 773,
                "digest": "sha256:fd071922d543e072b21cb41a513634657049d632fe48cfed240be2369f998403"
            },
            {
                "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
                "size": 1405,
                "digest": "sha256:2a9f38700bb5a0462e326fe3541b45f24a677ac3cd386c4922d48da5fbb6f0a8"
            }
        ]
    }
    ```

    镜像的 Digest 实际上是这个镜像的 Manifest 内容的 sha256sum 校验和：

    ```console
    $ skopeo inspect --raw docker://nginx@sha256:9081064712674ffcff7b7bdf874c75bcb8e5fb933b65527026090dacda36ea8b
    {
        "schemaVersion": 2,
        "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
        "config": {
            "mediaType": "application/vnd.docker.container.image.v1+json",
            "size": 7898,
            "digest": "sha256:0f8498f13f3adef3f3c8b52cdf069ecc880b081159be6349163d144e8aa5fb29"
        },
        ......

    $ skopeo inspect --raw docker://nginx@sha256:9081064712674ffcff7b7bdf874c75bcb8e5fb933b65527026090dacda36ea8b | sha256sum
    9081064712674ffcff7b7bdf874c75bcb8e5fb933b65527026090dacda36ea8b  -
    ```

    同理，Config 的 Digest 为镜像的 Config 内容的 sha256sum 校验和：

    ```console
    $ skopeo inspect --raw --config docker://nginx@sha256:9081064712674ffcff7b7bdf874c75bcb8e5fb933b65527026090dacda36ea8b | sha256sum
    0f8498f13f3adef3f3c8b52cdf069ecc880b081159be6349163d144e8aa5fb29  -
    ```

----

除了上面的几种 Docker 镜像的 Manifest 格式外，还有 [OCI 容器镜像](https://github.com/opencontainers/image-spec/blob/main/manifest.md) 这种格式的 Manifest:

1. `schemaVersion: 2`, `mediaType: "application/vnd.oci.image.manifest.v1+json"`
    ```json
    // skopeo inspect docker://quay.io/skopeo/stable@sha256:9da6763a4d35592a6279e851738472d9cdaa8ff5a5da3c50b560f065d22c2bff --raw | jq
    {
        "schemaVersion": 2,
        "mediaType": "application/vnd.oci.image.manifest.v1+json",
        "config": {
            "mediaType": "application/vnd.oci.image.config.v1+json",
            "digest": "sha256:6acf3c9f5dd48704618fa7ec2b95968a45c9e7809926a1f90f383bea4e9b3ede",
            "size": 3032
        },
        "layers": [
            {
                "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip",
                "digest": "sha256:529411ad578ab92819185dd8ef493eaa1eecc4f62b2ed2199db99ae23e6bf4cd",
                "size": 73881106
            },
            {
                "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip",
                "digest": "sha256:eeaa0b0d534352a9398996bcff9dc1184a78d310c22800aa6de07a6e2b1f8864",
                "size": 54520878
            },
            {
                "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip",
                "digest": "sha256:5ebf46cd2e6b356313b1dce504191fefce45df90dd8b5df7fe6b8cdd0fd06667",
                "size": 1849
            },
            {
                "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip",
                "digest": "sha256:d4779f97b4911cd73b8bbe8b96c6759b6f5c210928020e0c351294e7136aeb94",
                "size": 4061
            },
            {
                "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip",
                "digest": "sha256:f2e09c14b28b7453b48d13aace7cef657580e3b1cfdc0be8cfb9e685862a068f",
                "size": 228
            }
        ],
        "annotations": {
            "org.opencontainers.image.base.digest": "sha256:7acf70fa27721ef08357823d79324a19d7e9b0d34873c93f33a1b654d784e3c4",
            "org.opencontainers.image.base.name": "registry.fedoraproject.org/fedora:latest"
        }
    }
    ```
1. `schemaVersion: 2`, `mediaType: "application/vnd.oci.image.index.v1+json"`
    ```json
    // skopeo inspect docker://quay.io/skopeo/stable:latest --raw | jq
    {
        "schemaVersion": 2,
        "mediaType": "application/vnd.oci.image.index.v1+json",
        "manifests": [
            {
                "mediaType": "application/vnd.oci.image.manifest.v1+json",
                "digest": "sha256:3f678eca3035c64243c70598efeb4f60ef06a07b156444e21feed9488d47944b",
                "size": 1239,
                "platform": {
                    "architecture": "arm64",
                    "os": "linux"
                }
            },
            {
                "mediaType": "application/vnd.oci.image.manifest.v1+json",
                "digest": "sha256:72464a265722c05436b5f46b9247929a882e73462f33ac1c000f4a34094fc90c",
                "size": 1239,
                "platform": {
                    "architecture": "amd64",
                    "os": "linux"
                }
            }
        ]
    }
    ```

## Library

[containers](https://github.com/containers) 和 [opencontainers](https://github.com/opencontainers) Org 提供了许多容器镜像相关的 Go Library，例如：

- [containers/image](https://github.com/containers/image)
- [containers/common](https://github.com/containers/common)
- [opencontainers/image-spec](https://github.com/opencontainers/image-spec)

Docker Manifest 格式的定义位于代码：[containers/image/v5/manifest](https://github.com/containers/image/blob/main/manifest/manifest.go)

OCI 容器镜像的 Manifest 格式定义位于代码：[opencontainers/image-spec/specs-go/v1](https://github.com/opencontainers/image-spec/blob/main/specs-go/v1/mediatype.go)

`skopeo inspect` 的代码位于 [containers/skopeo/cmd/skopeo/inspect.go](https://github.com/containers/skopeo/blob/main/cmd/skopeo/inspect.go)，`skopeo` 用了 [cobra](https://github.com/spf13/cobra) 框架来处理用户的命令行参数（这里悄悄安利一下 `cobra` 框架真的很好用，尤其是当你的程序有许多的子命令，每个子命令需要处理的参数还都不一样的情况），执行查询镜像 Manifest 的代码都在 `run` 函数里面。

----

下面是咱写的一个栗子，使用上述的 Library 模拟一下 `skopeo inspect` 查看容器镜像 Manifest 的功能，其实查看容器镜像 Manifest 的代码实现还是蛮简单的：
```go
package example

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/containers/image/v5/transports/alltransports"
	"github.com/containers/image/v5/types"
)

func Test_Inspect(t *testing.T) {
	// reference name format: docker://<image>:<tag>
	refName := "docker://docker.io/library/nginx:latest"
	ref, err := alltransports.ParseImageName(refName)
	if err != nil {
		t.Errorf("ParseImageName: %v", err)
		return
	}

	sysCtx := &types.SystemContext{
		DockerAuthConfig: &types.DockerAuthConfig{
			Username: "", // docker username (optional)
			Password: "", // docker password (optional)
		},
		// set to true if server is HTTP or using insecure certificate
		OCIInsecureSkipTLSVerify:    false,
		DockerInsecureSkipTLSVerify: types.NewOptionalBool(false),
	}

	source, err := ref.NewImageSource(context.TODO(), sysCtx)
	if err != nil {
		t.Errorf("NewImageSource: %v", err)
		return
	}
	data, mime, err := source.GetManifest(context.TODO(), nil)
	if err != nil {
		t.Errorf("GetManifest: %v", err)
		return
	}

	fmt.Printf("Manifest mediaType: %v\n", mime)
	fmt.Printf("Manifest RAW data: \n%v\n", string(data))

	// reformat output
	var obj any
	if err = json.Unmarshal(data, &obj); err != nil {
		t.Errorf("Unmarshal: %v", err)
		return
	}
	if data, err = json.MarshalIndent(obj, "", "  "); err != nil {
		t.Errorf("MarshalIndent: %v", err)
		return
	}

	fmt.Printf("===================================\n")
	fmt.Printf("Manifest data: \n%v\n", string(data))
}
```

----

接下来，是构建 Manifest List 索引的一个简单栗子，假设你分别向 Registry Server 上传了 `<namespace>/example:v1.0.0-amd64` 和 `<namespace>/example:v1.0.0-arm64` 两个不同架构的容器镜像，你希望用户在 AMD64 架构的主机上拉取 `<namespace>/example:v1.0.0` 的 TAG 时，自动拉取 `<namespace>/example:v1.0.0-amd64` 这个镜像，而在 ARM64 架构的主机上拉取时，自动拉取 `<namespace>/example:v1.0.0-arm64` 这个镜像。

> 这里说的 Manifest List 实际是 `schemaVersion 2`, `mediaType: "application/vnd.docker.distribution.manifest.list.v2+json"`
>
> 基本上你可以使用任何的 Registry Server，但 Harbor V1 除外，因为 Harbor V1 不支持 Manifest List。

```go
package example

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/containers/image/v5/manifest"
	"github.com/containers/image/v5/transports/alltransports"
	"github.com/containers/image/v5/types"
	"github.com/opencontainers/go-digest"
)

func sha256sum(data []byte) string {
	sum := sha256.Sum256(data)
	return fmt.Sprintf("%x", sum)
}

func getManifest(refName string, ctx *types.SystemContext) ([]byte, string, error) {
	// reference name format: docker://<image>:<tag>
	ref, err := alltransports.ParseImageName(refName)
	if err != nil {
		return nil, "", fmt.Errorf("ParseImageName: %w", err)
	}

	source, err := ref.NewImageSource(context.TODO(), ctx)
	if err != nil {
		return nil, "", fmt.Errorf("NewImageSource: %v", err)
	}
	return source.GetManifest(context.TODO(), nil)
}

func Test_BuildManifest(t *testing.T) {
	// reference name format: docker://<image>:<tag>
	refName := "docker://<REGISTRY_URL:PORT>/<NAMESPACE>/example:v1.0.0"
	ref, err := alltransports.ParseImageName(refName)
	if err != nil {
		t.Errorf("ParseImageName: %v", err)
		return
	}

	sysCtx := &types.SystemContext{
		DockerAuthConfig: &types.DockerAuthConfig{
			Username: "", // registry username (required)
			Password: "", // registry password (required)
		},
		// set to true if server is HTTP or using insecure certificate
		OCIInsecureSkipTLSVerify:    false,
		DockerInsecureSkipTLSVerify: types.NewOptionalBool(false),
	}

	manifestList := manifest.Schema2List{
		SchemaVersion: 2,
		MediaType:     manifest.DockerV2ListMediaType,
		Manifests:     []manifest.Schema2ManifestDescriptor{},
	}

	// add amd64 data
	data, mime, err := getManifest("docker://<REGISTRY_URL:PORT>/<NAMESPACE>/example:v1.0.0-amd64", sysCtx)
	if err != nil {
		t.Errorf("getManifest: %v", err)
		return
	}
	manifestList.Manifests = append(manifestList.Manifests, manifest.Schema2ManifestDescriptor{
		Schema2Descriptor: manifest.Schema2Descriptor{
			MediaType: mime,
			Size:      int64(len(data)),
			Digest:    digest.Digest(sha256sum(data)),
		},
		Platform: manifest.Schema2PlatformSpec{
			Architecture: "amd64",
			OS:           "linux",
			OSVersion:    "",
			Variant:      "",
		},
	})

	// add arm64 data
	data, mime, err = getManifest("docker://<REGISTRY_URL:PORT>/<NAMESPACE>/example:v1.0.0-arm64", sysCtx)
	if err != nil {
		t.Errorf("getManifest: %v", err)
		return
	}
	manifestList.Manifests = append(manifestList.Manifests, manifest.Schema2ManifestDescriptor{
		Schema2Descriptor: manifest.Schema2Descriptor{
			MediaType: mime,
			Size:      int64(len(data)),
			Digest:    digest.Digest(sha256sum(data)),
		},
		Platform: manifest.Schema2PlatformSpec{
			Architecture: "arm64",
			OS:           "linux",
			OSVersion:    "",
			Variant:      "v8",
		},
	})

	dest, err := ref.NewImageDestination(context.TODO(), sysCtx)
	if err != nil {
		t.Errorf("NewImageSource: %v", err)
		return
	}

	if data, err = json.MarshalIndent(manifestList, "", "  "); err != nil {
		t.Errorf("MarshalIndent: %v", err)
		return
	}
	if err = dest.PutManifest(context.TODO(), data, nil); err != nil {
		t.Errorf("PutManifest: %v", err)
		return
	}
}
```

构建 Manifest 的栗子中，用到了一部分 Manifest 的代码，用来获取 amd64 架构的镜像和 arm64 架构镜像的 Manifest 文本长度，并计算 Digest。
