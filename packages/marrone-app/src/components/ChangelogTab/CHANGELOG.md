## What's New in Marrone v1.1.1

Versão de correção: os links do aplicativo e da documentação apontavam para endereços que não
existem, e a documentação agora tem uma wiki.

### Links corrigidos

* **Repositório e suporte:** a tela de suporte, o menu Ajuda, a busca global, a barra de status
  e o CLI apontavam para `github.com/marrone/marrone` — uma organização que **não existe** (404)
  — e para um domínio de documentação que nunca resolveu. Agora apontam para este repositório,
  para as issues e para a wiki.
* **Aba API Docs:** o renderer da documentação vinha de um CDN que não resolve, então a aba abria
  sem renderer nenhum. Voltou a funcionar.
* **Documentação das features beta:** os links de AI, Akamai EdgeGrid, Mock Server e gRPC
  Scripting apontavam para URLs curtas inexistentes.

### Suporte sem Community

* O grupo **Community** (GitHub, Discord, Twitter, LinkedIn) saiu da tela de suporte: eram os
  canais do Bruno, o projeto de origem — o Discord e o Twitter apontavam para contas de outro
  projeto, e o LinkedIn para uma empresa sem relação com o Marrone.

### Wiki e documentação

* **[Testes automatizados](https://github.com/ThiagoGomesRocha/Marrone/wiki/Testes)** — como
  testar em cada camada (componente, banco, E2E) e como escrever os `test()` de uma coleção.
* **[Scripts de banco de dados](https://github.com/ThiagoGomesRocha/Marrone/wiki/Banco-de-Dados)**
  — `bru.db` nos cinco SGBDs, com o exemplo canônico e as armadilhas de cada um.
* A referência de formato de coleção, scripting e runner continua sendo a
  [documentação do Bruno](https://docs.usebruno.com).

### Build

* `npm run build:electron:win` voltou a funcionar no Windows: o script de empacotamento era
  chamado de um jeito que o `cmd.exe` não entende.

---

## What's New in Marrone v1.1.0

Esta versão traz acesso a banco de dados direto dos seus scripts e relatórios de execução
muito mais completos.

### Consultas de banco nos scripts

* **Cinco bancos suportados:** PostgreSQL, MySQL, SQL Server, Oracle e IBM DB2.
* Use `bru.db.connect`, `bru.db.query`, `bru.db.execute`, `bru.db.transaction` e
  `bru.db.disconnect` nos blocos de pré-requisição, pós-resposta e `tests` — no app e no CLI.
* As credenciais ficam no **cofre do sistema**, nunca no arquivo da coleção. A string de
  conexão do script leva apenas host, porta e database.
* A validação fica onde faz sentido: o bloco `tests` confirma **no banco** o que a requisição
  gravou.

### Relatórios mais completos

* Aba **Database Operations** no relatório HTML, também no relatório exportado pela interface.
* O relatório mostra o **SQL executado**, a conexão e o SGBD, o tempo, o status e as **linhas
  devolvidas** pela consulta (limitadas a 20 por operação, com o total real).
* Para gerar um relatório só com metadados, use `--reporter-hide-db-rows` no CLI.

### Correções

* O driver de SQL Server foi corrigido para devolver as linhas por nome de coluna, aceitar
  parâmetros com tipo explícito e preservar tabelas temporárias e transações entre chamadas.
* Os exemplos da aba **Settings > Database** passaram a mostrar a API real (`bru.db.*`).

---

Para a lista completa de mudanças, veja o [CHANGELOG](https://github.com/ThiagoGomesRocha/Marrone/blob/HEAD/CHANGELOG.md).
