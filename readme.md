<div align="center">

<img src="assets/images/logo-transparent.png" alt="Marrone logo" width="120" />

# Marrone

**Cliente de API gratuito e open source — um fork do [Bruno](https://github.com/usebruno/bruno)**

[![Versão](https://img.shields.io/github/v/release/ThiagoGomesRocha/Marrone?label=última%20versão)](https://github.com/ThiagoGomesRocha/Marrone/releases)
[![Licença](https://img.shields.io/badge/licença-MIT-blue.svg)](license.md)
[![Download](https://img.shields.io/badge/download-Windows%20(x64)-brightgreen)](https://github.com/ThiagoGomesRocha/Marrone/releases/latest)

</div>

## O que é o Marrone?

O **Marrone** é um cliente de API para você testar, organizar e documentar suas requisições HTTP — uma alternativa ao Postman e ao Insomnia, **100% gratuita e open source**.

Ele nasceu como um **fork do [Bruno](https://github.com/usebruno/bruno)** e mantém total compatibilidade com ele, mas com identidade própria e melhorias no relatório de execução.

### Por que usar?

- 🗂️ **Coleções em arquivos** — suas coleções ficam em pastas no seu disco, no formato `.bru` (o mesmo do Bruno). Dá para versionar com Git normalmente.
- 📄 **Relatório HTML bonito** — gera um relatório com o **CURL de cada requisição** (com botão de copiar), logo personalizável e dashboard.
- 🔒 **Seguro por padrão** — o CURL do relatório omite cabeçalhos sensíveis (`Authorization`, `Cookie`, `API Key`) a menos que você ative a opção.
- 🔌 **Importa de tudo** — Postman, Insomnia, OpenAPI, WSDL e o próprio formato do Bruno.
- 🖥️ **Desktop + CLI** — interface gráfica (Windows, macOS, Linux) e linha de comando (`marrone`).

## Instalação

### Windows (instalador)

Baixe o instalador mais recente na página de releases:

👉 **[marrone-setup-1.0.0.exe](https://github.com/ThiagoGomesRocha/Marrone/releases/latest)**

### CLI (linha de comando)

A CLI `marrone` está no código-fonte. Para instalar a partir do repositório:

```bash
git clone https://github.com/ThiagoGomesRocha/Marrone.git
cd Marrone
npm install
npm install -g ./packages/marrone-cli
marrone --version
```

## Primeiros passos

1. **Crie uma coleção** no app — ou **importe** uma existente (veja abaixo).
2. **Adicione uma requisição**: escolha o método, digite a URL, os cabeçalhos e o corpo.
3. **Execute** e veja a resposta na hora.
4. **Gere o relatório HTML** pelo botão *Export* — ou direto no terminal:

```bash
marrone run ./minha-colecao --reporter-html relatorio.html
```

## Vindo do Bruno ou do Postman?

- **Do Bruno**: suas coleções `.bru` abrem **direto, sem conversão** — é o mesmo formato. É só apontar para a pasta da coleção.
- **Do Postman, Insomnia, OpenAPI ou WSDL**: use **Importar** no app (ou `marrone import` no CLI). A conversão traduz os scripts (`pm.*` → `bru.*`) e os testes automaticamente.

## CLI

Alguns comandos úteis:

```bash
marrone run ./minha-colecao                      # roda a coleção inteira
marrone run ./minha-colecao --reporter-html relatorio.html   # gera o relatório HTML
marrone import openapi --source api.yaml --output ./colecao  # importa uma spec OpenAPI
```

A ajuda completa está em `marrone --help`.

## Contribuindo

Pull requests são bem-vindos! Abra uma *issue* ou envie um PR — toda contribuição conta. 💛

## Licença

[MIT](license.md).

Este projeto é um fork do **[Bruno](https://github.com/usebruno/bruno)** — © 2022 Anoop M D, Anusree P S e colaboradores — e mantém a atribuição original aos seus criadores.
