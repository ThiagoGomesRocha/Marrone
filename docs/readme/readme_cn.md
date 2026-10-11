<br />
<img src="../../assets/images/logo-transparent.png" width="80"/>

### Marrone - 开源 IDE，用于探索和测试 API。

[![GitHub version](https://badge.fury.io/gh/marrone%2Fmarrone.svg)](https://badge.fury.io/gh/marrone%2Fmarrone)
[![CI](https://github.com/marrone/marrone/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/marrone/marrone/actions/workflows/tests.yml)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/marrone/marrone)](https://github.com/marrone/marrone/pulse)
[![X](https://img.shields.io/twitter/follow/use_marrone?style=social&logo=x)](https://twitter.com/use_marrone)
[![网站](https://img.shields.io/badge/Website-Visit-blue)](https://www.marrone.com)
[![下载](https://img.shields.io/badge/Download-Latest-brightgreen)](https://www.marrone.com/downloads)

[English](../../readme.md)
| [Українська](./readme_ua.md)
| [Русский](./readme_ru.md)
| [Türkçe](./readme_tr.md)
| [Deutsch](./readme_de.md)
| [Français](./readme_fr.md)
| [Português (BR)](./readme_pt_br.md)
| [한국어](./readme_kr.md)
| [বাংলা](./readme_bn.md)
| [Español](./readme_es.md)
| [Italiano](./readme_it.md)
| [Română](./readme_ro.md)
| [Polski](./readme_pl.md)
| **简体中文**
| [正體中文](./readme_zhtw.md)
| [العربية](./readme_ar.md)
| [日本語](./readme_ja.md)
| [ქართული](./readme_ka.md)
| [हिन्दी](./readme_hi.md)

Marrone 是一款全新且创新的 API 客户端，旨在颠覆 Postman 和其他类似工具。

Marrone 直接在您的电脑文件夹中存储您的 API 信息。我们使用纯文本标记语言 Bru 来保存有关 API 的信息。

您可以使用 Git 或您选择的任何版本控制系统来对您的 API 信息进行版本控制和协作。

Marrone 仅限离线使用。我们计划永不向 Marrone 添加云同步功能。我们重视您的数据隐私，并认为它应该留在您的设备上。阅读我们的长期愿景 [点击查看](https://github.com/marrone/marrone/discussions/269)

[下载 Marrone](https://www.marrone.com/downloads)

📢 观看我们在印度 FOSS 3.0 会议上的最新演讲 [点击查看](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![marrone](../../assets/images/landing-2.png) <br /><br />

## 商业版本 ✨

我们的大多数功能都是免费且开源的。
我们致力于在 [开源与可持续性发展](https://github.com/marrone/marrone/discussions/269) 之间取得和谐的平衡

欢迎使用我们的 [付费版本](https://www.marrone.com/pricing) ，看看附加的功能是否对您或团队有所帮助！ <br/>

## 目录
- [安装](#安装)
- [特性](#特性)
    - [跨平台使用 🖥️](#跨平台使用-)
    - [通过Git协作 👩‍💻🧑‍💻](#通过git协作-)
- [重要链接 📌](#重要链接-)
- [展示 🎥](#展示-)
- [分享评价 📣](#分享评价-)
- [发布到新的包管理器](#发布到新的包管理器)
- [联系方式 🌐](#联系方式-)
- [商标](#商标)
- [贡献 👩‍💻🧑‍💻](#贡献-)
- [作者](#作者)
- [许可证 📄](#许可证-)

## 安装

Marrone 可以在我们的 [网站上下载](https://www.marrone.com/downloads) 适用于Mac、Windows 和 Linux 的可执行文件。

您也可以通过包管理器如 Homebrew、Chocolatey、Scoop、Snap 和 Apt 安装 Marrone。

```sh
# 在 Mac 电脑上用 Homebrew 安装
brew install marrone

# 在 Windows 上用 Chocolatey 安装
choco install marrone

# 在 Windows 上用 Scoop 安装
scoop bucket add extras
scoop install marrone

# 在 Windows 上用 winget 安装
winget install Marrone.Marrone

# 在 Linux 上用 Snap 安装
snap install marrone

# 在 Linux 上用 Flatpak 安装
flatpak install com.marrone.Marrone

# 在 Linux 上用 Apt 安装
sudo mkdir -p /etc/apt/keyrings
sudo apt update && sudo apt install gpg curl
curl -fsSL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x9FA6017ECABE0266" \
  | gpg --dearmor \
  | sudo tee /etc/apt/keyrings/marrone.gpg > /dev/null
sudo chmod 644 /etc/apt/keyrings/marrone.gpg
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/marrone.gpg] http://debian.marrone.com/ marrone stable" \
  | sudo tee /etc/apt/sources.list.d/marrone.list
sudo apt update && sudo apt install marrone
```

## 特性

### 跨平台使用 🖥️

![marrone](../../assets/images/run-anywhere.png) <br /><br />

### 通过Git协作 👩‍💻🧑‍💻

或者任何您选择的版本控制系统

![marrone](../../assets/images/version-control.png) <br /><br />

## 重要链接 📌

- [我们的愿景](https://github.com/marrone/marrone/discussions/269)
- [路线图](https://www.marrone.com/roadmap)
- [文档](https://docs.marrone.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/marrone)
- [网站](https://www.marrone.com)
- [价格](https://www.marrone.com/pricing)
- [下载](https://www.marrone.com/downloads)

## 展示 🎥

- [Testimonials](https://github.com/marrone/marrone/discussions/343)
- [Knowledge Hub](https://github.com/marrone/marrone/discussions/386)
- [Scriptmania](https://github.com/marrone/marrone/discussions/385)

## 分享评价 📣

如果 Marrone 在您的工作和团队中帮助了您，请不要忘记在我们的 GitHub 讨论上分享您的 [评价](https://github.com/marrone/marrone/discussions/343)

## 发布到新的包管理器

如需了解更多信息，请参见 [此处](../publishing/publishing_cn.md) 。

## 联系方式 🌐

[𝕏 (Twitter)](https://twitter.com/use_marrone) <br />
[Website](https://www.marrone.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/marrone)

## 商标

**名称**

`Marrone` 是由 [Anoop M D](https://www.helloanoop.com/) 持有的商标。

**Logo**

Logo 源自 [OpenMoji](https://openmoji.org/library/emoji-1F436/). License: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

## 贡献 👩‍💻🧑‍💻

很高兴您希望改进 marrone。请查看 [贡献指南](../contributing/contributing_cn.md)。

即使您无法通过代码做出贡献，我们仍然欢迎您提出 BUG 和新的功能需求。

## 作者

<div align="center">
    <a href="https://github.com/marrone/marrone/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=marrone/marrone" />
    </a>
</div>

## 许可证 📄

[MIT](../../license.md)
