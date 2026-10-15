# Changelog

Todas as mudanças relevantes do Marrone são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto
adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

> As candidatas `1.1.0-rc.1` e `1.1.0-rc.2` foram consolidadas nesta `1.1.0`. Não houve
> mudança de conteúdo entre as duas candidatas e a versão estável — os itens abaixo são o
> conteúdo somado das três, reunido numa única seção.

## [1.1.0] - 2026-10-15

**Stable Release.** Primeira versão estável com acesso a banco de dados pelos scripts e
relatórios de execução enriquecidos.

### Destaques

- **5 SGBDs suportados:** PostgreSQL, MySQL, SQL Server, Oracle e IBM DB2. O acesso é feito
  por **driver direto** (`pg`, `mysql2`, `tedious`, `oracledb`, `ibm_db`) — não há ORM nem
  Sequelize. Cada conexão é física e dedicada, guardada num pool próprio do Marrone, o que é
  pré-requisito para `bru.db.transaction()` funcionar de verdade.
- **`bru.db.*` nos scripts** de pré-requisição, pós-resposta e `tests`, tanto no app quanto
  no CLI: `connect`, `query`, `execute`, `transaction` e `disconnect`.
- **Relatórios** HTML, JSON e JUnit, com a aba **Database Operations** trazendo o SQL
  executado, a conexão e o SGBD, o tempo, o status e as linhas devolvidas.

> **Nota de instalação (Oracle e DB2).** Os drivers `oracledb` e `ibm_db` trazem scripts de
> instalação que o npm ≥ 11/12 bloqueia por padrão. O `ibm_db` ainda baixa o clidriver
> (~83 MB) durante o script. Para usá-los:
> `npm install-scripts approve <pacote>` seguido de `npm rebuild <pacote>`. Os outros três
> SGBDs não exigem esse passo.

### Added

- API `bru.db.*` no sandbox dos scripts (QuickJS), disponível nos blocos de pré-requisição,
  pós-resposta e `tests`, no app (Electron) e no CLI.
- Catálogo único de SGBDs (`packages/marrone-database/src/constants.ts`) como fonte de verdade
  de portas, pacotes de driver e estilo de placeholder; a UI consome o catálogo por IPC.
- **Cofre de credenciais por SGBD.** A string de conexão do script leva apenas
  host/porta/database — usuário e senha nunca ficam no arquivo da coleção. No CLI as
  credenciais vêm das variáveis `MARRONE_DB_<SGBD>_USER` / `MARRONE_DB_<SGBD>_PASSWORD`.
- Aba **Database Operations** no relatório HTML, também no relatório exportado **pela
  interface** do app.
- **Linhas devolvidas pela consulta** no relatório, limitadas a 20 por operação
  (`MAX_RECORDED_ROWS`), com o total real e o aviso de corte ("mostrando 20 de 137"). O teto
  existe porque o relatório circula: sem limite, um `SELECT` sem `WHERE` viraria um dump de
  tabela. Para gerar um relatório só com metadados existe a flag `--reporter-hide-db-rows`
  no CLI (ou `includeDbRows: false` na API do gerador).
- Flag `--reporter-hide-db-rows` e opção `includeDbRows` para relatórios sem dados de linha.
- Exemplo de validação de dados no banco na coleção de onboarding, com `test` assíncrono,
  `try/finally` no `disconnect` e placeholder específico do SGBD.
- Roteiro de teste manual com banco real, cobrindo os cinco SGBDs.

### Fixed

- **Driver SQL Server (`tedious`).** Três defeitos que só apareciam contra um servidor real:
  as linhas passaram a ser achatadas por `metadata.colName` (o tedious devolve objeto indexado
  por posição ordinal, não por nome de coluna); os parâmetros passaram a ser registrados com
  tipo explícito (a forma de 2 argumentos foi removida no tedious 16+); e instruções sem
  placeholder passaram a usar `execSqlBatch` em vez de `execSql`, que manda um RPC para
  `sp_executesql` e faz o SQL Server tratar a requisição como *procedure* — o que derrubava
  tabela temporária, transação aberta e `SET` de sessão ao retornar.
- A aba **Database Operations** não aparecia no relatório exportado pela interface: o main
  process descartava `databaseOperations` ao enviar os eventos ao renderer, e o
  `exportReport.js` remontava o resultado campo a campo sem o campo. Agora os eventos de fase
  carregam as operações, o renderer agrega as três fases na ordem de execução e o relatório
  do app tem a aba.
- Os exemplos da aba **Settings > Database** ensinavam uma API que não existe (`db.connect`,
  `dbQuery`, `dbExecute`). Um usuário copiou o exemplo do próprio painel e o script quebrou
  com `SyntaxError`. Os exemplos passaram a usar `bru.db.*`, que é a API real do sandbox.
- O nome da requisição vinha `null` em toda operação de banco do relatório — o `name` está no
  resultado (`T_RunnerRequestExecutionResult`), não em `result.request`.
- O build do `@marrone/common` estava falhando por erros de tipo, o que deixava o `dist`
  desatualizado em silêncio e fazia a aba de banco sumir do relatório do CLI.
- Suítes de teste destravadas após o rebrand e a migração para jsdom.

## [1.0.0] - 2026-10-11

- Primeira release do fork Marrone: identidade visual própria, coleção de onboarding e
  relatório HTML de execução.
