<br />
<img src="../../assets/images/logo-transparent.png" width="80"/>

### Marrone - IDE de código aberto para explorar e testar APIs.

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
| **Português (BR)**
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

Marrone é um novo e inovador cliente de API, com o objetivo de revolucionar o status quo representado por ferramentas como o Postman e outras semelhantes.

Marrone armazena suas coleções diretamente em uma pasta no seu sistema de arquivos. Utilizamos uma linguagem de marcação de texto simples, chamada Bru, para salvar informações sobre requisições de API.

Você pode usar o Git ou qualquer sistema de controle de versão de sua escolha para colaborar em suas coleções de API.

Marrone é totalmente offline. Não há planos de adicionar sincronização em nuvem ao Marrone, nunca. Valorizamos a privacidade de seus dados e acreditamos que eles devem permanecer em seu dispositivo. Saiba mais sobre nossa visão a longo prazo [aqui](https://github.com/marrone/marrone/discussions/269).

📢 Assista à nossa palestra recente na India FOSS 3.0 Conference [aqui](https://www.youtube.com/watch?v=7bSMFpbcPiY).

![marrone](../../assets/images/landing-2.png) <br /><br />

### Instalação

Marrone está disponível para download como binário [em nosso site](https://www.marrone.com/downloads) para Mac, Windows e Linux.

Você também pode instalar o Marrone via gerenciadores de pacotes como Homebrew, Chocolatey, Snap e Apt.

```sh
# No Mac via Homebrew
brew install marrone

# No Windows via Chocolatey
choco install marrone

# No Windows via Scoop
scoop bucket add extras
scoop install marrone

# No Windows via winget
winget install Marrone.Marrone

# No Linux via Snap
snap install marrone

# No Linux via Flatpak
flatpak install com.marrone.Marrone

# No Linux via Apt
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

### Execute em várias plataformas 🖥️

![marrone](../../assets/images/run-anywhere.png) <br /><br />

### Colaboração via Git 👩‍💻🧑‍💻

Ou qualquer sistema de controle de versão de sua escolha.

![marrone](../../assets/images/version-control.png) <br /><br />

### Links Importantes 📌

- [Nossa Visão de Longo Prazo](https://github.com/marrone/marrone/discussions/269)
- [Roadmap](https://github.com/marrone/marrone/discussions/384)
- [Documentação](https://docs.marrone.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/marrone)
- [Website](https://www.marrone.com)
- [Preços](https://www.marrone.com/pricing)
- [Download](https://www.marrone.com/downloads)
- [GitHub Sponsors](https://github.com/sponsors/helloanoop)

### Showcase 🎥

- [Depoimentos](https://github.com/marrone/marrone/discussions/343)
- [Hub de Conhecimento](https://github.com/marrone/marrone/discussions/386)
- [Scriptmania](https://github.com/marrone/marrone/discussions/385)

### Apoie ❤️

Au-au! Se você gosta do projeto e deseja apoiar nosso trabalho, considere nos ajudando via [GitHub Sponsors](https://github.com/sponsors/helloanoop).

### Compartilhe sua experiência 📣

Se o Marrone ajudou no seu trabalho e/ou no trabalho de sua equipe, por favor, não se esqueça de compartilhar seu [depoimento em nossas discussões no GitHub](https://github.com/marrone/marrone/discussions/343).

### Publicando em Novos Gerenciadores de Pacotes

Por favor, verifique [aqui](../publishing/publishing_pt_br.md) mais informações.

### Mantenha Contato 🌐

[𝕏 (Twitter)](https://twitter.com/use_marrone) <br />
[Website](https://www.marrone.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/marrone)

### Trademark

**Nome**

`Marrone` é uma marca registrada de [Anoop M D](https://www.helloanoop.com/).

**Logo**

A logo é original do [OpenMoji](https://openmoji.org/library/emoji-1F436/). Licença: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

### Colabore 👩‍💻🧑‍💻

Fico feliz que você queira melhorar o Marrone. Por favor, confira o [guia de colaboração](../contributing/contributing_pt_br.md).

Mesmo que você não possa contribuir codificando, não deixe de relatar problemas e solicitar recursos que precisam ser implementados para atender ao contexto de seu dia a dia.

### Contribuidores

<div align="center">
    <a href="https://github.com/marrone/marrone/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=marrone/marrone" />
    </a>
</div>

### Licença 📄

[MIT](../../license.md)
