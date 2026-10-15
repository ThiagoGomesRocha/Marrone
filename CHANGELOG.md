# Changelog

Todas as mudanças relevantes do Marrone são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto
adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

> As candidatas `1.1.0-rc.1` e `1.1.0-rc.2` foram consolidadas nesta `1.1.0`. Não houve
> mudança de conteúdo entre as duas candidatas e a versão estável — os itens abaixo são o
> conteúdo somado das três, reunido numa única seção.

## [Não publicado]

### Added

- **Wiki do repositório (`docs/wiki/`).** Reúne [Testes
  automatizados](docs/wiki/testes.md) — unitário com Jest, integração com banco (opt-in) e
  E2E com Playwright, além dos `test()` que rodam dentro de uma coleção — e [Scripts de banco
  de dados](docs/wiki/banco-de-dados.md), com os placeholders de cada SGBD e o padrão de
  validar no banco depois da requisição. A página inicial traz o link para a
  [documentação do Bruno](https://docs.usebruno.com), que segue sendo a referência de
  formato de coleção, scripting e runner. Tudo que a wiki afirma foi conferido contra o
  repositório (nomes de fixtures, comandos, exemplos que a própria aplicação exibe).

### Fixed

- **O aplicativo e a documentação apontavam para um repositório que não existe.** O rename
  de bruno para marrone trocou `usebruno/bruno` por `marrone/marrone` numa substituição
  global, e essa organização não existe (`github.com/marrone/marrone` responde **404**); o
  mesmo aconteceu com `docs.marrone.com` e `www.marrone.com`, que não resolvem. Como cada
  componente trazia a URL escrita à mão, o estrago apareceu em vários pontos ao mesmo tempo:
  tela de suporte, busca global, barra de status, painel de console (relatar erro), tela de
  erro fatal, aviso de importação com problemas, handler de *Documentation* do menu,
  `package.json` da aplicação e do CLI, README do CLI, imagens Docker e os templates de
  issue/PR. As URLs agora saem de um lugar único (`marrone-app/src/utils/common/constants.js`
  e `marrone-electron/src/utils/constants.js`) — havia sido exatamente a dispersão que
  deixou os links quebrados sem ninguém notar.
- **O item "Documentation" passou a apontar para a wiki do repositório.** Era
  `docs.marrone.com`, domínio que o rename inventou e que não existe. As páginas da wiki
  são editadas versionadas em `docs/wiki/` e publicadas na wiki do GitHub — o link do app,
  do CLI (`marrone --help`), do README, das imagens Docker e dos templates apontam para lá.
- **Os comentários de código que citam issues do Bruno voltaram a apontar para o Bruno.**
  O sed global também reescreveu `usebruno/bruno/issues/<n>` para `marrone/marrone/issues/<n>`,
  transformando referências legítimas ao projeto de origem em links quebrados.
- **O grupo "Community" saiu da tela de suporte.** GitHub, Discord, Twitter e LinkedIn eram
  os canais do Bruno, não deste fork: o Discord e o Twitter apontavam para contas de outro
  projeto, e o LinkedIn para uma empresa sem relação com o Marrone.
- **Dois testes E2E de importação por URL baixavam de um endereço que não existe.**
  `insomnia-url-import` e `postman-url-import` buscavam a fixture em
  `raw.githubusercontent.com/marrone/marrone` (404); passaram a apontar para o repositório
  real — e para `feature/marrone`, que é o branch padrão aqui, não `main`.
- **O spec de links de suporte afirmava as URLs erradas.** Ele comparava o link com o mesmo
  texto errado que o componente usava, então passava nos dois erros. Agora o valor esperado
  é literal no teste, e o teste também verifica que os itens de community não voltaram.

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

- **Autenticação do Windows (NTLM) na conexão SQL Server.** Novo campo `authType`
  (`'sql'` — padrão — ou `'windows'`) e `domain` em `DriverConnectOptions`; com
  `authType: 'windows'` o driver monta `authentication: { type: 'ntlm', options: { userName,
  password, domain } }` em vez de `type: 'default'`.
  - **Na interface:** a aba *Settings > Database* ganhou o seletor *Tipo de autenticação*
    (SQL Server Authentication / Windows Authentication) e o campo **Domínio**, que aparece
    só com o Windows Authentication selecionado. A escolha é guardada no cofre junto da
    credencial.
  - **No CLI:** `MARRONE_DB_MSSQL_AUTH=windows` e `MARRONE_DB_MSSQL_DOMAIN=<DOMINIO>`.
  - Em rede sem Active Directory o domínio de uma conta local é o **nome da máquina**
    (`EMPRESA` para a conta `EMPRESA\joao.silva`).
  - A opção aparece **apenas no SQL Server** — é o único driver do projeto que implementa
    NTLM; oferecê-la para PostgreSQL/MySQL/Oracle/DB2 seria uma opção que não faz nada.
- **Relatório JSON espelhando o HTML** (`generateJsonReport`). O `--reporter-json` do CLI
  (e o JSON exportado pela interface) gravava o objeto interno cru, sem CURL e sem nenhuma
  informação de banco; agora os dois relatórios saem da mesma transformação e trazem as
  mesmas requisições e os mesmos testes.
- **Bloco "Database Operation" dentro de cada teste** na aba Tests do relatório HTML,
  colapsável, com o script que disparou a operação, a conexão e o SGBD, o tipo de operação,
  o SQL, os parâmetros, o tempo, o resultado (tabela com colunas dinâmicas) e o status. A
  aba "Database Operations" consolidada continua existindo como visão geral.
- **Tempo de cada teste** no relatório (coluna *Duration*), medido no runner.
- **`databaseOperation` por requisição** no JSON (a primeira operação, ou `null`) e
  **`databaseOperations` consolidado** no topo, para o consumo por ferramentas.
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

- **O CLI não levava para o relatório as operações de banco feitas no bloco `tests`.** As
  fases de pré-requisição e pós-resposta eram coletadas; a de `tests` não era — e é
  justamente onde a validação no banco faz sentido (é o padrão do exemplo da coleção de
  onboarding). Sintoma: a consulta rodava, devolvia as linhas para o script e o relatório
  saía **sem nenhuma operação**, sem erro nenhum. Encontrado rodando uma coleção de verdade
  contra o SQL Server local; o caminho do app já funcionava (as três fases vão por IPC).
- **O relatório chamava toda operação de SQL de "query".** O host não gravava o TIPO da
  operação, então um `UPDATE` aparecia como consulta. Agora `query` e `execute` são
  registrados distintos, ao lado das de ciclo de vida (`connect`, `disconnect`,
  `begin`/`commit`/`rollback`).
- **O tempo por teste não era medido no runtime padrão.** O sandbox QuickJS tem a sua própria
  implementação de `test()`, separada da usada pelo runtime `node-vm`; a medição tinha
  ficado só na segunda, então a coluna *Duration* saía `-` no QuickJS — que é o padrão.
- **Salvar credenciais sem digitar a senha apagava a senha guardada.** O formulário dizia
  "deixe o campo vazio para mantê-la", mas o `DatabaseCredentialsStore` gravava string vazia
  em QUALQUER salvamento, apagando a senha em silêncio. Agora senha **ausente** preserva a
  guardada e senha **vazia** (o campo enviado vazio) apaga de fato — que é o que o aviso
  promete.
- **Headers sensíveis passam a ser mascarados no relatório.** O CURL do relatório já
  substituía o valor de `Authorization`, `Cookie`, `X-Api-Key` e afins por `[REDACTED]`,
  mas as **tabelas de headers** do mesmo relatório mostravam o valor cru — o CURL dava uma
  falsa sensação de segurança enquanto o token seguia dentro do arquivo, que circula. Agora
  as duas partes usam a mesma lista de headers e o mesmo marcador. Para incluir os valores
  originais existe `includeSensitive` (`--reporter-include-sensitive`), e para remover
  headers por completo continuam valendo `--reporter-skip-all-headers` e
  `--reporter-skip-headers`.
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

### Limitações conhecidas

- **A autenticação do Windows não foi validada contra um servidor real** — e não é possível
  validá-la nesta máquina de desenvolvimento. O ambiente é um `WORKGROUP` (sem Active
  Directory), e o SQL Server local só tem conta local. O Windows/SQL
  Server não permite autenticação NTLM com uma conta **local** (SAM): o servidor recusa com
  o erro 18452, registrado no log dele como *"Login failed. The login is from an untrusted
  domain and cannot be used with Windows authentication."*
  O que **foi** verificado: a requisição NTLM chega ao SQL Server e é avaliada por ele
  (o erro é de avaliação de logon do servidor, não de configuração do driver), e a
  comparação com o caminho de autenticação do banco produz mensagens distintas — o
  `type: 'default'` falha com "senha não correspondeu", o `type: 'ntlm'` com "domínio não
  confiável". A validação completa exige um servidor em domínio AD.
  Observação: `sqlcmd -E` conecta nesta máquina porque usa SSPI/Negotiate com o token do
  processo, e **não** NTLM — o `tedious` não tem SSPI, ele negocia usuário/senha/domínio
  explicitamente.
- **`DECIMAL`/`NUMERIC` no SQL Server perdem precisão** (limitação do `readNumeric` do
  `tedious`, que converte para `number` antes de o pacote ver o valor). Vale em pg/mysql2/
  Oracle/DB2 a promessa de "decimal volta como string"; no SQL Server, faça `CAST` para
  texto no próprio SQL quando a precisão importar.

## [1.0.0] - 2026-10-11

- Primeira release do fork Marrone: identidade visual própria, coleção de onboarding e
  relatório HTML de execução.
