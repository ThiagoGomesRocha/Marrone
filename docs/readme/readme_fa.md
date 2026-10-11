<br />
<img src="../../assets/images/logo-transparent.png" width="80"/>

### برونو یا Marrone - محیط توسعه متن باز برای تست و توسعه API ها

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
| **فارسی**
| [Română](./readme_ro.md)
| [Polski](./readme_pl.md)
| [简体中文](./readme_cn.md)
| [正體中文](./readme_zhtw.md)
| [العربية](./readme_ar.md)
| [日本語](./readme_ja.md)
| [ქართული](./readme_ka.md)
| [हिन्दी](./readme_hi.md)

برونو یک کلاینت API جدید و نوآورانه است که هدفش تغییر وضعیت فعلی ابزارهایی مانند Postman و سایر ابزارهای مشابه است.

برونو مجموعه‌های شما را مستقیماً در یک پوشه روی فایل‌سیستم شما ذخیره می‌کند. ما از یک زبان نشانه‌گذاری ساده به نام Bru برای ذخیره اطلاعات درخواست‌های API استفاده می‌کنیم.

شما می‌توانید برای همکاری روی مجموعه‌های API خود، از Git یا هر سیستم کنترل نسخه دلخواهتان استفاده کنید.

برونو فقط به صورت آفلاین کار می‌کند. هیچ برنامه‌ای برای اضافه کردن همگام‌سازی ابری به برونو در آینده وجود ندارد. ما به حریم خصوصی داده‌های شما اهمیت می‌دهیم و معتقدیم که باید روی دستگاه خودتان باقی بمانند. می‌توانید چشم‌انداز بلندمدت ما را مطالعه کنید. [اینجا (به انگلیسی)](https://github.com/marrone/marrone/discussions/269)

📢 جدیدترین ارائه ما را در کنفرانس India FOSS 3.0 تماشا کنید.
[اینجا](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![marrone](/assets/images/landing-2.png) <br /><br />

### نصب

برونو به صورت یک فایل باینری برای دانلود در دسترس است. [بر روی وبسایت ما](https://www.marrone.com/downloads) برای مک لینکوس و ویندوز.

همچنین می‌توانید برونو را از طریق مدیر بسته‌هایی مانند Homebrew، Chocolatey، Snap و Apt نصب کنید.

```sh
# بر روی مک از طریق brew
brew install marrone

# بر روی ویندوز از طریق Chocolatey
choco install marrone

# بر روی لینوکس از طریق Snap
snap install marrone

# بر روی لینوکس از طریق Apt
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

### روی پلتفرم‌های مختلف کار می‌کند 🖥️

![marrone](/assets/images/run-anywhere.png) <br /><br />

### همکاری از طریق گیت 👩‍💻🧑‍💻

یا هر سیستم کنترل نسخه‌ای که ترجیح می‌دهید

![marrone](/assets/images/version-control.png) <br /><br />

### لینک‌های مهم 📌

- [آخرین نسخه پایدار ما](https://github.com/marrone/marrone/discussions/269)
- [نقشه راه](https://github.com/marrone/marrone/discussions/384)
- [مستندات](https://docs.marrone.com)
- [وبسایت](https://www.marrone.com)
- [اشتراک ها](https://www.marrone.com/pricing)
- [دانلود](https://www.marrone.com/downloads)

### ویدیوها 🎥

- [تجربه ها](https://github.com/marrone/marrone/discussions/343)
- [مرکز دانش](https://github.com/marrone/marrone/discussions/386)
- [اسکریپ مانیا](https://github.com/marrone/marrone/discussions/385)

### حمایت ❤️

جوون! اگر این پروژه را دوست دارید، روی دکمه ⭐ کلیک کنید!

### تجربه‌های به اشتراک گذاشته‌شده 📣

اگر برونو به شما یا تیمتان کمک کرده است، لطفاً فراموش نکنید تجربه‌های خود را به اشتراک بگذارید. [تجربه‌های خود را در بحث گیت‌هاب ما به اشتراک بگذارید](https://github.com/marrone/marrone/discussions/343).

### انتشار برونو در یک پکیچ منیجر جدید

لطفا چک بکنید [اینجارو](../../publishing.md) برای اطلاعات بیشتر.

### مشارکت 👩‍💻🧑‍💻

خوشحالم که می‌خواهید برونو را بهتر کنید. لطفا [راهنمای مشارکت را بررسی کنید](../contributing/contributing_fa.md).

حتی اگر نمی‌توانید از طریق کدنویسی مشارکت کنید، در گزارش باگ‌ها و درخواست قابلیت‌های جدید که به حل نیازهای شما کمک می‌کند تردید نکنید.

### نویسنده ها

<div align="center">
    <a href="https://github.com/marrone/marrone/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=marrone/marrone" />
    </a>
</div>

### در ارتباط باشید 🌐

[𝕏 (تویتر)](https://twitter.com/use_marrone) <br />
[وبسایت](https://www.marrone.com) <br />
[دیسکورد](https://discord.com/invite/KgcZUncpjq) <br />
[لینکدین](https://www.linkedin.com/company/marrone)

### برند

**نام**

به فارسی برونو - `Marrone` یک علامت تجاری ثبت‌شده متعلق به [Anoop M D](https://www.helloanoop.com/)

**لوگو**

لوگو توسط [OpenMoji](https://openmoji.org/library/emoji-1F436/) ساخته شده است. مجوز: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

### مجوز 📄

[MIT](../../license.md)
