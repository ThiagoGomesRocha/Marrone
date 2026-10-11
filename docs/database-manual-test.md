# Roteiro de teste manual com banco real

Este documento é o **aceite que substitui o teste automatizado com Docker**: o MVP decidiu
(D5 do plano v2) não depender de Docker nem de servidor de banco instalado na máquina, e o
disco deste ambiente não comporta mais um contêiner de banco. O que se perde com essa decisão
é exatamente o que este roteiro cobre à mão: **um driver de verdade falando com um servidor de
verdade**.

---

## 0. O que já está provado automaticamente — e o que só este roteiro prova

| Camada | Como está verificado hoje |
|---|---|
| Contrato dos 5 drivers, normalização de erro `{ code, message, sgbd }` | `packages/marrone-database/tests/drivers.spec.ts` (497 linhas) |
| Redação de parâmetros, formatação do retorno (RF05/RF06/RF07) | `formatResult.spec.ts`, `sandboxCapability.spec.ts` |
| A ponte para o sandbox (QuickJS) | `marrone-js/src/sandbox/quickjs/shims/database.spec.js` (253 linhas) |
| Cadeia de credenciais do CLI, de ponta a ponta, com o binário real | `marrone-cli/tests/integration/database-scripts.spec.js` |
| Aba do relatório, SQL e `***` nos parâmetros | `marrone-common/.../database-report.spec.ts` (208 linhas) |
| Aba Settings → Database | `marrone-app/.../Database/index.spec.js` |
| DB2 carregando e conectando **de dentro do app empacotado** | probe com `ELECTRON_RUN_AS_NODE` (registrado em `docs/database-integration.md`, §7) |

| O que **só** o teste manual prova |
|---|
| O driver real abre uma conexão TCP real contra um servidor real, com o protocolo certo |
| A credencial atravessa o **cofre do sistema** (DPAPI) e chega ao driver |
| O script roda **dentro do app Electron**, não só na biblioteca |
| O relatório renderiza de fato as operações (a suíte testa o payload, não o navegador) |

**Escopo honesto:** dos 5 SGBDs, apenas o **DB2** foi exercitado ponta a ponta — e contra um
servidor inexistente, o que provou a pilha do driver até a camada de rede. Os outros quatro
nunca falaram com um banco real. É isto que este roteiro fecha.

---

## 1. Antes de começar

```bash
# 1. O pacote precisa estar CONSTRUÍDO (o CLI consome o dist, não o src).
#    O `npm install` já faz isso pelo script `prepare`; para forçar:
npm run build --workspace=packages/marrone-database

# 2. Você só precisa instalar o driver do banco que vai testar.
npm install pg          # ou: mysql2 / tedious / oracledb / ibm_db

# 3. Confirmar que o driver carrega (troque o nome do pacote):
node -e "require('pg'); console.log('driver ok')"
```

> `ibm_db` e `oracledb` têm **install-script**. Com npm 12 eles vêm bloqueados:
> `npm install-scripts approve ibm_db oracledb` e depois `npm rebuild ibm_db oracledb`.
> Sem isso o `require` falha e a suíte de drivers mente para você.

### Do lado do banco: o login precisa de acesso ao database

Antes de culpar o Marrone: **criar o login no servidor não dá acesso a um banco.** O login
precisa de um *usuário* mapeado dentro do database de destino — e é comum que o banco padrão
do login seja exatamente aquele que ele não consegue abrir. O sintoma é um erro de logon mesmo
com usuário e senha corretos:

```text
Falha de logon do usuário 'marrone'.
```

A mensagem vem do próprio servidor (o Marrone não a reescreve), então ela aparece no idioma
configurado no banco. Diagnóstico, conectado ao `master` com um login administrador:

```sql
SELECT name, state_desc FROM sys.databases ORDER BY name;   -- o banco está ONLINE?
SELECT name, is_disabled, default_database_name
FROM sys.server_principals WHERE name = 'marrone';          -- o login existe? qual o banco padrão?
```

Correção, uma vez por database, também com um login administrador:

```sql
USE MeuBanco;
CREATE USER marrone FOR LOGIN marrone;
ALTER ROLE db_owner ADD MEMBER marrone;  -- ou db_datareader/db_datawriter, se preferir restringir
```

O equivalente nos outros SGBDs: no MySQL é `GRANT` no schema; no PostgreSQL,
`GRANT CONNECT ON DATABASE` mais os privilégios de tabela; no Oracle o usuário *é* o schema.

Crie uma coleção de teste com uma requisição qualquer (um `GET https://httpbin.org/get` basta)
e um script de pré-requisição — é nele que o `bru.db` vai rodar.

---

## 2. Onde conseguir cada banco (opções gratuitas)

Você precisa de **um** para começar; sugestão: comece pelo PostgreSQL, que é o mais rápido de
subir, e só depois repita o roteiro para os outros.

| SGBD | Id no Marrone | Porta padrão | Opção livre |
|---|---|---|---|
| PostgreSQL | `postgres` | 5432 | PostgreSQL Community (instalador nativo) |
| MySQL | `mysql` | 3306 | MySQL Community |
| SQL Server | `mssql` | 1433 | SQL Server **Express** ou **Developer** (ambos gratuitos) |
| Oracle | `oracle` | 1521 | **Oracle Database Free** — roda em thin mode, sem Instant Client |
| IBM DB2 | `db2` | 50000 | IBM **Db2 Community Edition** |

O Marrone não se importa com *onde* o servidor está — só com host, porta e database. Um serviço
gerenciado com camada gratuita serve igual. O que **não** serve: apontar para um banco de
produção com dados reais; use uma base descartável, porque o roteiro escreve.

---

## 3. Caminho principal — no aplicativo (é o que mais importa)

**3.1** Abra o app → **Settings → Database**.
→ *Esperado:* a aba lista os 5 SGBDs. Se aparecer um aviso amarelo no topo, o catálogo veio por
fallback local — anote o texto, é um bug de IPC.

**3.2** Escolha o banco, preencha **Usuário** e **Senha**, clique em **Salvar**.
→ *Esperado:* confirmação. Nenhuma senha em texto plano em lugar nenhum (ver §6, caso 1).

**3.3** Preencha a string de conexão **sem usuário e sem senha** e clique em **Testar conexão**.

```text
postgres://localhost:5432/mydb
```

→ *Esperado:* mensagem de sucesso. Esta string **não é salva** — serve só para o teste.
→ *Se falhar:* leia a mensagem. Falta de driver ⇒ diz qual `npm install` rodar. Senha errada ⇒
erro normalizado do banco. Mensagem genérica e opaca ⇒ **é bug**, reporte o texto.

**3.4** Escreva o script na pré-requisição da requisição:

```js
const conn = await bru.db.connect('postgres', 'postgres://localhost:5432/mydb');

const linhas = await bru.db.query(conn, 'SELECT 1 AS n');
console.log('RETORNO:', JSON.stringify(linhas));

await bru.db.disconnect(conn);
```

→ *Esperado:* `RETORNO: {"n":1}` — **objeto único**, não uma lista de um item. Um `SELECT` sem
linhas deve devolver `null`.

**3.5** Rode a requisição. → *Esperado:* tudo verde, e o `console.log` visível no log.

**3.6** Abra o **relatório HTML** e vá à aba **Database Operations**.
→ *Esperado:* o SQL executado, data/hora, SGBD, tempo e status; filtros por SGBD e por status;
botão **Copiar SQL**; e o resultado resumido ("1 registro(s)").
→ **Confira o principal:** passe um parâmetro com valor reconhecível e veja se o valor aparece
como `***`. Se o valor real aparecer, **é um vazamento** — pare e reporte.

```js
// use um parâmetro de verdade para conferir a redação:
await bru.db.query(conn, 'SELECT $1 AS segredo', ['VALOR-QUE-NAO-DEVE-APARECER']);
```

**3.7** Teste uma transação, que é o caminho com a semântica mais delicada:

```js
const conn = await bru.db.connect('postgres', 'postgres://localhost:5432/mydb');
await bru.db.transaction(conn, async () => {
  await bru.db.execute(conn, 'CREATE TEMP TABLE t (v int)');
  await bru.db.execute(conn, 'INSERT INTO t VALUES ($1)', [1]);
});
await bru.db.disconnect(conn);
```

→ *Esperado:* sem erro. Troque o corpo para lançar de propósito e confirme que o erro aparece
no log como falha da operação (o `ROLLBACK` rodou).

> ⚠️ **Sempre feche a conexão antes de encerrar o app.** Encerrar com conexão ODBC pendente
> derruba o processo do DB2 (segfault, exit 139) — é um defeito conhecido do `ibm_db`, não do
> Marrone. Sempre `await bru.db.disconnect(conn)`.

---

## 4. Caminho do CLI

O CLI **não tem cofre** (`safeStorage` é API do Electron). As credenciais vêm do ambiente:

```bash
MARRONE_DB_POSTGRES_USER=joao \
MARRONE_DB_POSTGRES_PASSWORD='segredo' \
node packages/marrone-cli/bin/marrone.js run ./minha-colecao --env Local
```

→ *Esperado:* a requisição roda, o banco responde, e o script tem sucesso.

**4.1** Rode **sem** as variáveis de ambiente.
→ *Esperado:* o erro cita o nome exato da variável que falta — `MARRONE_DB_POSTGRES_USER` — e
**não** manda você para "Settings → Database". Essa distinção é o aceite: a mensagem precisa
saber onde o script está rodando.

**4.2** Troque o usuário e confirme que o erro **muda de natureza** (deixa de ser "falta
credencial" e passa a ser erro de conexão/autenticação). Isso prova que a credencial
atravessou o caminho todo até o driver.

**4.3** Gere o relatório pelo CLI e confira a mesma aba **Database Operations**:

```bash
MARRONE_DB_POSTGRES_USER=joao MARRONE_DB_POSTGRES_PASSWORD='segredo' \
node packages/marrone-cli/bin/marrone.js run ./minha-colecao --reporter html
```

---

## 5. Testes de integração da biblioteca (opt-in)

Se você quiser cobrir os cinco de uma vez, sem passar pela interface — apontando para os bancos
que tiver:

```bash
DB_INTEGRATION=true \
POSTGRES_URL=postgres://localhost:5432/mydb POSTGRES_USER=joao POSTGRES_PASSWORD='segredo' \
npx jest tests/integration.spec.ts --rootDir packages/marrone-database
```

→ *Esperado:* os SGBDs que você configurou rodam; os que não, ficam **skipped**.
Sem `DB_INTEGRATION=true`, o arquivo inteiro é `describe.skip` — é assim que o `npm test` fica
verde em qualquer máquina, sem banco instalado.

---

## 6. Casos de erro (também são aceite)

Testar o caminho triste é metade do aceite; cada um destes já tem o comportamento especificado.

| # | Cenário | Esperado |
|---|---|---|
| 1 | Senha salva no app | Em texto plano em **nenhum** lugar: nem no `.bru`, nem no git, nem no relatório |
| 2 | `bru.db.connect('postgres', 'postgres://joao:senha@localhost/db')` | **Recusado** com erro explícito — credencial na string é proibida de propósito |
| 3 | Senha errada | Erro normalizado `{ code, message, sgbd }`, legível |
| 4 | Driver do SGBD não instalado | Mensagem diz **qual** `npm install` rodar |
| 5 | Tabela inexistente | Erro do banco propagado, sem stack trace interna vazando |
| 6 | Banco fora do ar | Erro de conexão em segundos (não pendura) |
| 7 | `DECIMAL(20,10)` no SELECT | Volta como **string** (pg/MySQL/Oracle/DB2) — precisão não pode ser perdida. **No SQL Server volta como `number`**: ver a exceção na seção 4 de `database-integration.md` |
| 8 | Colunas do Oracle | Voltam em MAIÚSCULAS, sem renomear (é o que o banco devolveu) |
| 9 | `ibm_db` com conexão pendente ao encerrar | Exit 139 — **defeito conhecido**, evite não fechando |
| 10 | Script roda no CLI sem env var | Erro cita `MARRONE_DB_<SGBD>_USER`, não a interface |
| 11 | Login sem usuário mapeado no database | Erro de logon mesmo com senha correta — ver "Do lado do banco", seção 1 |

---

## 7. DB2 no aplicativo empacotado — o único caveat técnico em aberto

O DB2 é o único driver nativo e o único que exige cuidado de empacotamento (ver §7 do
`database-integration.md`). A prova existente foi feita em modo **unpacked** (`--dir`), não com
o instalador NSIS.

**Teste mínimo, pela interface** — é o que fecha este caveat para você:

```bash
npx electron-builder --win --dir --config electron-builder-config.js
# abra packages/marrone-electron/out/win-unpacked/Marrone.exe
```

Depois: Settings → Database → **DB2** → preencha a credencial → **Testar conexão**.

→ *Esperado:* uma mensagem de **conexão** (recusa de rede, host errado — tanto faz).
→ *Se aparecer* `ERROR_MOD_NOT_FOUND`, `Invalid package config` ou erro ao *carregar* o módulo
`ibm_db`, **o empacotamento regrediu**: as duas correções (`bindings` em `asarUnpack` e
`IBM_DB_HOME` apontando para o clidriver desempacotado) deixaram de valer.

**Prova definitiva, sem interface** — o driver conectando de dentro do asar:

```bash
cd packages/marrone-electron/out/win-unpacked
ELECTRON_RUN_AS_NODE=1 ./Marrone.exe /caminho/para/probe.js
```

Um `probe.js` mínimo que imprima `require.resolve('ibm_db')`, a variável `IBM_DB_HOME` depois do
módulo carregar e o erro do `connect()`. O resultado esperado é: `IBM_DB_HOME` **vazio no
ambiente** e **preenchido após carregar o módulo**, apontando para
`app.asar.unpacked/node_modules/ibm_db/installer/clidriver`.

> Não testado: instalador **NSIS**. Se o DB2 falhar só no app instalado e não no `--dir`, o
> caminho a investigar é o mesmo (`asarUnpack` / `IBM_DB_HOME`).

---

## 8. Checklist final do aceite

Marque conforme executa. Os itens técnicos já estão verdes no repositório; os marcados com
**(manual)** são os que só você pode fechar.

**Interface**
- [ ] Aba Settings → Database registrada, com os 5 SGBDs
- [ ] Usuário e senha salvos pelo cofre do sistema (nada em texto plano)
- [ ] "Testar conexão" abre e fecha uma conexão real
- [ ] Exemplos por SGBD mostram a string **sem credenciais**

**Scripts**
- [ ] **(manual)** `bru.db.connect/query/execute/disconnect` funcionando contra banco real
- [ ] Retorno: `null` / objeto único / lista, conforme §4 da doc
- [ ] **(manual)** `bru.db.transaction` com COMMIT e com ROLLBACK
- [ ] Conectar com credencial na string é recusado

**Relatório**
- [ ] SQL aparece na aba "Database Operations"
- [ ] **(manual)** parâmetros aparecem como `***`
- [ ] Nenhum conjunto de linhas é armazenado (só a contagem)

**CLI**
- [ ] `MARRONE_DB_<SGBD>_USER/_PASSWORD` funcionam
- [ ] Sem as variáveis, o erro cita o nome exato da variável
- [ ] `--reporter html` inclui as operações

**Técnico**
- [ ] `npx jest` verde em `marrone-database` e nos pacotes alterados, sem banco e sem Docker
- [ ] `tests/integration.spec.ts` existe e é *skipped* por padrão
- [ ] O `dist` de `@marrone/database` não contém os drivers
- [ ] `marrone-app/package.json` não lista `@marrone/database`
- [ ] Nenhuma ocorrência de `keytar` nem de `vm2` no código novo
- [ ] Erros normalizados `{ code, message, sgbd }` nos 5 drivers
- [ ] DB2: G0 aprovado e `ibm_db` carrega no Electron 37.6.1
- [ ] **(manual)** DB2 carrega e conecta a partir do app empacotado

---

## 9. Resultado

Preencha ao terminar — é o registro do aceite:

| SGBD | Testado em | Resultado | Observações |
|---|---|---|---|
| PostgreSQL | app / CLI | | |
| MySQL | app / CLI | | |
| SQL Server | app / CLI | | |
| Oracle (thin) | app / CLI | | |
| IBM DB2 | app empacotado | | |
