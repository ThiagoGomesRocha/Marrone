<br />
<img src="../../assets/images/logo-transparent.png" width="80"/>

### Marrone - IDE Opensource pour explorer et tester des APIs.

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
| **Français**
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

Marrone est un nouveau client API, innovant, qui a pour but de révolutionner le _statu quo_ que représentent Postman et les autres outils.

Marrone sauvegarde vos collections directement sur votre système de fichiers. Nous utilisons un langage de balise de type texte pour décrire les requêtes API.

Vous pouvez utiliser git ou tout autre gestionnaire de version pour travailler de manière collaborative sur vos collections d'APIs.

Marrone ne fonctionne qu'en mode déconnecté. Il n'y a pas d'abonnement ou de synchronisation avec le cloud Marrone, il n'y en aura jamais. Nous sommes conscients de la confidentialité de vos données et nous sommes convaincus qu'elles doivent rester sur vos appareils. Vous pouvez lire notre vision à long terme [ici (en anglais)](https://github.com/marrone/marrone/discussions/269).

📢 Regardez notre présentation récente lors de la conférence India FOSS 3.0 (en anglais) [ici](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![marrone](/assets/images/landing-2.png) <br /><br />

### Installation

Marrone est disponible au téléchargement [sur notre site web](https://www.marrone.com/downloads), pour Mac, Windows et Linux.

Vous pouvez aussi installer Marrone via un gestionnaire de paquets, comme Homebrew, Chocolatey, Scoop, Snap et Apt.

```sh
# Mac via Homebrew
brew install marrone

# Windows via Chocolatey
choco install marrone

# Windows via Scoop
scoop bucket add extras
scoop install marrone

# Linux via Snap
snap install marrone

# Linux via Apt
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

### Fonctionne sur de multiples plateformes 🖥️

![marrone](/assets/images/run-anywhere.png) <br /><br />

### Collaborer via Git 👩‍💻🧑‍💻

Ou n'importe quel système de gestion de sources

![marrone](/assets/images/version-control.png) <br /><br />

### Liens importants 📌

- [Notre vision à long terme (en anglais)](https://github.com/marrone/marrone/discussions/269)
- [Roadmap](https://github.com/marrone/marrone/discussions/384)
- [Documentation](https://docs.marrone.com)
- [Site web](https://www.marrone.com)
- [Prix](https://www.marrone.com/pricing)
- [Téléchargement](https://www.marrone.com/downloads)
- [Sponsors GitHub](https://github.com/sponsors/helloanoop)

### Showcase 🎥

- [Témoignages](https://github.com/marrone/marrone/discussions/343)
- [Centre de connaissance](https://github.com/marrone/marrone/discussions/386)
- [Scriptmania](https://github.com/marrone/marrone/discussions/385)

### Soutien ❤️

Si vous aimez Marrone et que vous souhaitez soutenir le travail _opensource_, pensez à devenir un sponsor via la page [Github Sponsors](https://github.com/sponsors/helloanoop).

### Partage de témoignages 📣

Si Marrone vous a aidé dans votre travail, au sein de votre équipe, merci de penser à partager votre témoignage sur la [page discussion GitHub dédiée](https://github.com/marrone/marrone/discussions/343)

### Publier Marrone sur un nouveau gestionnaire de paquets

Veuillez regarder [ici](../publishing/publishing_fr.md) pour plus d'information.

### Contribuer 👩‍💻🧑‍💻

Je suis heureux de voir que vous cherchez à améliorer Marrone. Merci de consulter le [guide de contribution](../contributing/contributing_fr.md)

Même si vous n'êtes pas en mesure de contribuer directement via du code, n'hésitez pas à consigner les bogues et les demandes de nouvelles fonctionnalités pour résoudre vos cas d'usage !

### Auteurs

<div align="center">
    <a href="https://github.com/marrone/marrone/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=marrone/marrone" />
    </a>
</div>

### Restons en contact 🌐

[Twitter](https://twitter.com/use_marrone) <br />
[Website](https://www.marrone.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/marrone)

### Marque

**Nom**

`Marrone` est une marque appartenant à [Anoop M D](https://www.helloanoop.com/)

**Logo**

Le logo est issu de [OpenMoji](https://openmoji.org/library/emoji-1F436/).
Licence : CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

### Licence 📄

[MIT](../../license.md)
