<br />
<img src="../../assets/images/logo-transparent.png" width="80"/>

### Marrone - API の検証・動作テストのためのオープンソース IDE.

[![GitHub version](https://badge.fury.io/gh/marrone%2Fmarrone.svg)](https://badge.fury.io/gh/marrone%2Fmarrone)
[![CI](https://github.com/marrone/marrone/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/marrone/marrone/actions/workflows/tests.yml)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/marrone/marrone)](https://github.com/marrone/marrone/pulse)
[![X](https://img.shields.io/twitter/follow/use_marrone?style=social&logo=x)](https://twitter.com/use_marrone)
[![Website](https://img.shields.io/badge/Website-Visit-blue)](https://www.marrone.com)
[![Download](https://img.shields.io/badge/Download-Latest-brightgreen)](https://www.marrone.com/downloads)

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
| [简体中文](./readme_cn.md)
| [正體中文](./readme_zhtw.md)
| [العربية](./readme_ar.md)
| **日本語**
| [ქართული](./readme_ka.md)
| [हिन्दी](./readme_hi.md)

Marrone は革新的な API クライアントです。Postman を代表する API クライアントツールの現状に一石を投じることを目指しています。

Marrone はローカルフォルダに直接コレクションを保存します。API リクエストの情報を保存するために Bru というプレーンテキストのマークアップ言語を採用しています。

Git や任意のバージョン管理システムを使って API コレクションを共同開発することもできます。

Marrone はオフラインのみで利用できます。Marrone にクラウド同期機能を追加する予定はありません。私たちはデータプライバシーを尊重しており、データはローカルに保存されるべきだと考えています。私たちの長期的なビジョンは[こちら](https://github.com/marrone/marrone/discussions/269)をご覧ください。

[Marrone をダウンロード](https://www.marrone.com/downloads)

📢 India FOSS 3.0 Conference での発表の様子は[こちら](https://www.youtube.com/watch?v=7bSMFpbcPiY)から

![marrone](/assets/images/landing-2.png) <br /><br />

### インストール方法

Marrone は[私たちのウェブサイト](https://www.marrone.com/downloads)からバイナリをダウンロードできます。Mac, Windows, Linux に対応しています。

Homebrew, Chocolatey, Scoop, Snap, Flatpak, Apt などのパッケージマネージャからもインストール可能です。

```sh
# MacでHomebrewを使ってインストール
brew install marrone

# WindowsでChocolateyを使ってインストール
choco install marrone

# WindowsでScoopを使ってインストール
scoop bucket add extras
scoop install marrone

# Windowsでwingetを使ってインストール
winget install Marrone.Marrone

# LinuxでSnapを使ってインストール
snap install marrone

# LinuxでFlatpakを使ってインストール
flatpak install com.marrone.Marrone

# LinuxでAptを使ってインストール
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

### マルチプラットフォームでの実行に対応 🖥️

![marrone](/assets/images/run-anywhere.png) <br /><br />

### Git との連携が可能 👩‍💻🧑‍💻

または任意のバージョン管理システムにも対応しています。

![marrone](/assets/images/version-control.png) <br /><br />

### スポンサー

#### ゴールドスポンサー

<img src="../../assets/images/sponsors/samagata.png" width="150"/>

#### シルバースポンサー

<img src="../../assets/images/sponsors/commit-company.png" width="70"/>

#### ブロンズスポンサー

<a href="https://zuplo.link/marrone">
    <img src="../../assets/images/sponsors/zuplo.png" width="120"/>
</a>

### 主要リンク 📌

- [私たちの長期ビジョン](https://github.com/marrone/marrone/discussions/269)
- [ロードマップ](https://github.com/marrone/marrone/discussions/384)
- [ドキュメント](https://docs.marrone.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/marrone)
- [ウェブサイト](https://www.marrone.com)
- [料金設定](https://www.marrone.com/pricing)
- [ダウンロード](https://www.marrone.com/downloads)
- [Github スポンサー](https://github.com/sponsors/helloanoop).

### Showcase 🎥

- [体験談](https://github.com/marrone/marrone/discussions/343)
- [ナレッジベース](https://github.com/marrone/marrone/discussions/386)
- [スクリプト集](https://github.com/marrone/marrone/discussions/385)

### サポート ❤️

もし Marrone を気に入っていただいて、オープンソースの活動を支援していただけるなら、[Github Sponsors](https://github.com/sponsors/helloanoop)でスポンサーになることを考えてみてください。

### 体験談のシェア 📣

Marrone が職場やチームで役立っているのであれば、[GitHub discussion 上であなたの体験談](https://github.com/marrone/marrone/discussions/343)をシェアしていただくようお願いします。

### 新しいパッケージマネージャへの公開

詳しくは[こちら](../publishing/publishing_ja.md)をご覧ください。

### 連絡先 🌐

[𝕏 (Twitter)](https://twitter.com/use_marrone) <br />
[Website](https://www.marrone.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/marrone)

### 商標について

**名前**

`Marrone`は[Anoop M D](https://www.helloanoop.com/)は取得している商標です。

**ロゴ**

ロゴの出典は[OpenMoji](https://openmoji.org/library/emoji-1F436/)です。CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)でライセンスされています。

### 貢献するには 👩‍💻🧑‍💻

Marrone を改善していただけるのは歓迎です。[コントリビュートガイド](../contributing/contributing_ja.md)をご覧ください。

もしコードによる貢献ができない場合でも、あなたのユースケースを解決するために遠慮なくバグ報告や機能リクエストを出してください。

### 開発者

<div align="center">
    <a href="https://github.com/marrone/marrone/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=marrone/marrone" />
    </a>
</div>

### ライセンス 📄

[MIT](../../license.md)
