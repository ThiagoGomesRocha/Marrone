<br />
<img src="../../assets/images/logo-transparent.png" width="80"/>

### Marrone - Opensource IDE per esplorare e testare gli APIs.

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
| **Italiano**
| [Română](./readme_ro.md)
| [Polski](./readme_pl.md)
| [简体中文](./readme_cn.md)
| [正體中文](./readme_zhtw.md)
| [العربية](./readme_ar.md)
| [日本語](./readme_ja.md)
| [ქართული](./readme_ka.md)
| [हिन्दी](./readme_hi.md)

Marrone è un nuovo ed innovativo API client, mirato a rivoluzionare lo status quo rappresentato da Postman e strumenti simili disponibili.

Marrone memorizza le tue raccolte direttamente in una cartella del tuo filesystem. Utilizziamo un linguaggio di markup in testo semplice chiamato Bru per salvare informazioni sulle richeste API.

Puoi utilizzare Git o qualsiasi sistema di controllo che preferisci per collaborare sulle tue raccolte di API.

Marrone funziona solo in modalità offline. Non ci sono piani per aggiungere la sincronizzazione su cloud a Marrone in futuro. Valorizziamo la privacy dei tuoi dati e crediamo che dovrebbero rimanere sul tuo dispositivo. Puoi leggere la nostra visione a lungo termine [qui (in inglese)](https://github.com/marrone/marrone/discussions/269)

📢 Guarda la nostra presentazione più recente alla conferenza India FOSS 3.0 [qui](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![marrone](/assets/images/landing-2.png) <br /><br />

### Installazione

Marrone è disponibile come download binario [sul nostro sito](https://www.marrone.com/downloads) per Mac, Windows e Linux.

Puoi installare Marrone anche tramite package manger come Homebrew, Chocolatey, Snap e Apt.

```sh
# Su Mac come Homebrew
brew install marrone

# Su Windows come Chocolatey
choco install marrone

# Su Linux tramite Snap
snap install marrone

# Su Linux tramite Apt
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

### Funziona su diverse piattaforme 🖥️

![marrone](/assets/images/run-anywhere.png) <br /><br />

### Collabora tramite Git 👩‍💻🧑‍💻

O con qualsiasi sistema di controllo di versioni a tua scelta

![marrone](/assets/images/version-control.png) <br /><br />

### Collegamenti importanti 📌

- [La nostra visione a lungo termine](https://github.com/marrone/marrone/discussions/269)
- [Roadmap](https://github.com/marrone/marrone/discussions/384)
- [Documentazione](https://docs.marrone.com)
- [Sito internet](https://www.marrone.com)
- [Prezzo](https://www.marrone.com/pricing)
- [Download](https://www.marrone.com/downloads)

### Showcase 🎥

- [Testimonianze](https://github.com/marrone/marrone/discussions/343)
- [Centro di conoscenza](https://github.com/marrone/marrone/discussions/386)
- [Scriptmania](https://github.com/marrone/marrone/discussions/385)

### Supporto ❤️

Woof! se ti piace il progetto, premi quel ⭐ pulsante !!

### Testimonianze condivise 📣

Se Marrone ti ha aiutato con il tuo lavoro ed il tuo team, per favore non dimenticare di condividere le tue [testimonianze nella nostra discussione su GitHub](https://github.com/marrone/marrone/discussions/343)

### Pubblica Marrone su un nuovo gestore di pacchetti

Per favore vedi [qui](../../publishing.md) per accedere a più informazioni.

### Contribuire 👩‍💻🧑‍💻

Sono felice che vuoi migliorare Marrone. Per favore controlla la [guida per la partecipazione](../contributing/contributing_it.md)

Anche se non sei in grado di contribuire tramite il codice, non esitare a segnalare bug e richieste di funzionalità che devono essere implementati per risolvere il tuo caso d'uso.

### Autori

<div align="center">
    <a href="https://github.com/marrone/marrone/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=marrone/marrone" />
    </a>
</div>

### Resta in contatto 🌐

[𝕏 (Twitter)](https://twitter.com/use_marrone) <br />
[Sito internet](https://www.marrone.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/marrone)

### Marchio

**Nome**

`Marrone` è un marchio registrato appartenente a [Anoop M D](https://www.helloanoop.com/)

**Logo**

Il logo è stato creato da [OpenMoji](https://openmoji.org/library/emoji-1F436/). Licenza: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

### Licenza 📄

[MIT](../../license.md)
