# Wiki do Marrone

Bem-vindo à wiki do **Marrone**.

> 📌 **Esta pasta (`docs/wiki/`) é a origem das páginas da wiki.** As páginas são escritas e
> revisadas aqui, versionadas junto com o código, e publicadas em
> <https://github.com/ThiagoGomesRocha/Marrone/wiki>. Ao mudar uma página aqui, atualize a
> publicação correspondente na wiki.

O Marrone é um cliente de API gratuito e de código aberto, **fork do [Bruno](https://github.com/usebruno/bruno)**.
Ele mantém o mesmo formato de coleção (`.bru`, `bruno.json`, `bru.*` nos scripts) e por isso
**a documentação do Bruno continua valendo** para tudo que é comum aos dois.

> 📘 **Documentação do Bruno (projeto de origem):** <https://docs.usebruno.com>
>
> Coleção, ambientes, variáveis, script de pré/pós-requisição, runner, CLI, importação e
> exportação são idênticos. Comece por lá e use esta wiki para o que é específico do Marrone.

---

## Páginas

| Página | O que tem |
|---|---|
| **[Testes automatizados](./testes.md)** | Como escrever e rodar os testes do projeto (unitário, de banco e E2E no Electron) e os `test()` dentro de uma coleção |
| **[Scripts de banco de dados](./banco-de-dados.md)** | Como consultar MySQL, PostgreSQL, SQL Server, Oracle e DB2 a partir de um script, com `bru.db` |

---

## O que esta wiki cobre (e o que não cobre)

Esta wiki é escrita para **quem usa o Marrone**, não para quem compila: ela descreve o que
você escreve dentro de uma requisição (script e teste) e o que a aplicação faz com isso.

Os documentos de **decisão interna** — por que o pacote `@marrone/database` é separado, por
que não há ORM, como o sandbox QuickJS conversa com o host — ficam no repositório, em
[`docs/database-integration.md`](../database-integration.md) e
[`packages/marrone-database/ARCHITECTURE.md`](../../packages/marrone-database/ARCHITECTURE.md).
Se você quer contribuir com o código, comece por
[`contributing.md`](../../contributing.md).

---

## Links úteis

- **Repositório:** <https://github.com/ThiagoGomesRocha/Marrone>
- **Releases (download do instalador):** <https://github.com/ThiagoGomesRocha/Marrone/releases>
- **Reportar um problema:** <https://github.com/ThiagoGomesRocha/Marrone/issues>
- **Documentação do Bruno (origem):** <https://docs.usebruno.com>
- **Código do Bruno:** <https://github.com/usebruno/bruno>

---

## Um exemplo para começar

A aplicação instala, no primeiro uso, uma coleção de exemplo que já vem com um teste de
atenção — inclusive um que valida dados **no banco** depois da requisição:

```
packages/marrone-electron/resources/data/sample-collection.json
```

Abra aquela requisição na interface e leia a aba **Tests**: é o padrão recomendado para
conferir o que a sua requisição gravou. O passo a passo está em
[Scripts de banco de dados → Validar no banco depois da requisição](./banco-de-dados.md#validar-no-banco-depois-da-requisição).
