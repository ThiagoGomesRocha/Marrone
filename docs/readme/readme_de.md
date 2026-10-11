<br />
<img src="/assets/images/logo-transparent.png" width="80"/>

### Marrone - Opensource IDE zum Erkunden und Testen von APIs.

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
| **Deutsch**
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
| [日本語](./readme_ja.md)
| [ქართული](./readme_ka.md)
| [हिन्दी](./readme_hi.md)

Marrone ist ein neuer und innovativer API-Client, der den Status Quo von Postman und ähnlichen Tools revolutionieren soll.

Marrone speichert deine Sammlungen direkt in einem Ordner in deinem Dateisystem. Wir verwenden eine einfache Textauszeichnungssprache - Bru - um Informationen über API-Anfragen zu speichern.

Du kannst Git oder eine andere Versionskontrolle deiner Wahl verwenden, um gemeinsam mit anderen an deinen API-Sammlungen zu arbeiten.

Marrone ist ein reines Offline-Tool. Es gibt keine Pläne, Marrone um eine Cloud-Synchronisation zu erweitern. Wir schätzen den Schutz deiner Daten und glauben, dass sie auf deinem Gerät bleiben sollten. Lies unsere Langzeit-Vision [hier](https://github.com/marrone/marrone/discussions/269).

[Download Marrone](https://www.marrone.com/downloads)

📢 Sieh Dir unseren Vortrag auf der India FOSS 3.0 Conference [hier](https://www.youtube.com/watch?v=7bSMFpbcPiY) an.

![marrone](/assets/images/landing-2.png) <br /><br />

### Installation

Marrone ist als Download [auf unserer Website](https://www.marrone.com/downloads) für Mac, Windows und Linux verfügbar.

Du kannst Marrone auch über Paketmanager wie Homebrew, Chocolatey, Scoop, Snap, Flatpak und Apt installieren.

```sh
# Auf Mac via Homebrew
brew install marrone

# Auf Windows via Chocolatey
choco install marrone

# Auf Windows via Scoop
scoop bucket add extras
scoop install marrone

# Auf Windows via winget
winget install Marrone.Marrone

# Auf Linux via Snap
snap install marrone

# Auf Linux via Flatpak
flatpak install com.marrone.Marrone

# Auf Linux via Apt
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

### Einsatz auf verschiedensten Plattformen 🖥️

![marrone](/assets/images/run-anywhere.png) <br /><br />

### Zusammenarbeit mit Git 👩‍💻🧑‍💻

Oder einer Versionskontrolle deiner Wahl

![marrone](/assets/images/version-control.png) <br /><br />

### Sponsoren

#### Gold Sponsoren

<img src="/assets/images/sponsors/samagata.png" width="150"/>

#### Silber Sponsoren

<img src="/assets/images/sponsors/commit-company.png" width="70"/>

### Wichtige Links 📌

- [Unsere Langzeit-Vision](https://github.com/marrone/marrone/discussions/269)
- [Roadmap](https://github.com/marrone/marrone/discussions/384)
- [Dokumentation](https://docs.marrone.com)
- [Webseite](https://www.marrone.com)
- [Preise](https://www.marrone.com/pricing)
- [Download](https://www.marrone.com/downloads)

### Showcase 🎥

- [Erfahrungsberichte](https://github.com/marrone/marrone/discussions/343)
- [Wissenswertes](https://github.com/marrone/marrone/discussions/386)
- [Scriptmania](https://github.com/marrone/marrone/discussions/385)

### Unterstützung ❤️

Wuff! Wenn du dieses Projekt magst, klick auf den ⭐ Button !!

### Teile Erfahrungsberichte 📣

Wenn Marrone dir und in deinem Team bei der Arbeit geholfen hat, vergiss bitte nicht, deine [Erfahrungsberichte in unserer GitHub-Diskussion](https://github.com/marrone/marrone/discussions/343) zu teilen.

### Bereitstellung in neuen Paket-Managern

Mehr Informationen findest du [hier](../publishing/publishing_de.md).

### Mitmachen 👩‍💻🧑‍💻

Ich freue mich, dass du Marrone verbessern willst. Bitte schau dir den [Leitfaden zum Mitmachen](../contributing/contributing_de.md) an.

Auch wenn du nicht in der Lage bist, einen Beitrag in Form von Code zu leisten, zögere bitte nicht, uns Fehler und Funktionswünsche mitzuteilen, die implementiert werden müssen, um deinen Anwendungsfall zu unterstützen.

### Autoren

<div align="center">
    <a href="https://github.com/marrone/marrone/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=marrone/marrone" />
    </a>
</div>

### In Verbindung bleiben 🌐

[Twitter](https://twitter.com/use_marrone) <br />
[Webseite](https://www.marrone.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/marrone)

### Markenzeichen

**Name**

`Marrone` ist ein Markenzeichen von [Anoop M D](https://www.helloanoop.com/)

**Logo**

Das Logo stammt von [OpenMoji](https://openmoji.org/library/emoji-1F436/). Lizenz: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

### Lizenz 📄

[MIT](../../license.md)
