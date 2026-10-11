# @marrone/database — arquitetura

Documento de projeto do pacote. Explica as decisões que não são óbvias a partir do código,
e principalmente **por que** cada uma foi tomada.

---

## 1. Decisões de base

| # | Decisão | Alternativa descartada | Motivo |
|---|---|---|---|
| D1 | **Drivers diretos** (`pg`, `mysql2`, `tedious`, `oracledb`, `ibm_db`) | Sequelize | O requisito é executar SQL cru e devolver linhas. O Sequelize é um ORM: ele **exige os mesmos drivers por baixo** (é um wrapper, não um driver), e toda a camada de models/migrations/associations ficaria sem uso. Ver §7. |
| D2 | **Pacote separado** (`private: true`, padrão de `marrone-sqlite`) | Módulo dentro de `marrone-common` | `marrone-common` é importado pelo **renderer** em mais de 20 arquivos. Se os drivers estivessem lá, o bundler do browser tentaria empacotar `pg`/`tedious` — que precisam de socket TCP, `fs` e `net`. No pacote separado, o renderer simplesmente não o conhece. |
| D3 | **Conexão dedicada** por entrada do cache | `pool.query()` do próprio driver | `dbTransaction` precisa que `BEGIN` e `COMMIT` rodem na **mesma conexão física**. Com o pool do driver isso não é garantido e a transação silenciosamente não funcionaria. |
| D4 | **Carregamento tardio** dos drivers | `import` estático | Quem só usa PostgreSQL não deve precisar instalar o `clidriver` de 83 MB do DB2. O driver só é carregado no primeiro `connect()` daquele SGBD. |
| D5 | **Credenciais fora da string de conexão** | `postgres://user:pass@host/db` | Se a senha estiver na string, ela vai para o `.bru`, para o git e para o relatório. A recusa é feita **por código** em `parseConnectionString`. |

---

## 2. Camadas

```
┌───────────────────────────────────────────────────────────────┐
│ 1. API pública (src/index.ts)                                 │
│    dbConnect · dbQuery · dbExecute · dbDisconnect · dbTransaction
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│ 2. Infra do pacote                                            │
│    pool.ts (cache de conexões)  ·  formatResult.ts (RF05/07)  │
│    normalizeType.ts (JSON-safe) ·  errors.ts (contrato único) │
│    connectionString.ts (validação + recusa de credenciais)    │
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│ 3. Adapters por SGBD (src/drivers/*.ts)                       │
│    mesmo contrato: connect/query/execute/commit/rollback/close│
│    + funções PURAS testáveis (config, placeholders, escape)   │
└───────────────────────────┬───────────────────────────────────┘
                            │  import() tardio
┌───────────────────────────▼───────────────────────────────────┐
│ 4. Drivers (externos ao bundle)                               │
│    pg · mysql2 · tedious · oracledb (thin) · ibm_db           │
└───────────────────────────────────────────────────────────────┘
```

Regra que atravessa tudo: **o renderer nunca importa este pacote, e o sandbox QuickJS nunca
fala com um driver.** O QuickJS chama o host; o host chama este pacote.

---

## 3. Modelo de parâmetros

A API é sempre posicional: `dbQuery(conn, sql, [v1, v2])`. Cada driver liga esse array do
seu jeito:

| SGBD | Placeholder | Ligação |
|---|---|---|
| PostgreSQL | `$1, $2` | o driver aceita o array direto |
| MySQL | `?` | o driver aceita o array direto |
| DB2 | `?` | o driver aceita o array direto |
| Oracle | `:1, :2` | o driver aceita array posicional |
| SQL Server | `@p1, @p2` | **exige conversão** |

O SQL Server é o caso especial, porque o `tedious` usa parâmetros **nomeados**. A conversão
é isolada numa função pura (`parseMssqlParameters`), o que a torna testável sem banco:

```ts
parseMssqlParameters('UPDATE t SET a = @p1 WHERE id = @p2 AND b = @p1');
// → ['p1', 'p2']
```

Três detalhes cobertos por teste: a ordenação é pelo **número** do placeholder (não pela
posição no texto), placeholders repetidos aparecem uma vez só, e `@p10` não é confundido
com `@p1`.

---

## 4. Cache de conexões

`ConnectionPool` mantém `Map<chave, conexão>`.

- **Chave:** `sgbd|connectionString|username`. A **senha nunca entra na chave** — a chave
  pode aparecer em log de diagnóstico, e um segredo não deve poder vazar por ali.
- **Reuso:** um segundo `connect()` com a mesma chave devolve a conexão existente.
- **Expiração:** timeout ocioso (padrão 5 min) fecha a conexão automaticamente. O timer é
  `unref()`-ado para não segurar o event loop do processo.
- **Encerramento:** `closeAllConnections()` fecha tudo. **O host deve chamar isto antes de
  encerrar o processo** — ver §6.

Limitação conhecida: uma conexão por chave significa que duas queries simultâneas na mesma
conexão se enfileiram. Para scripts de pré/pós-requisição (sequenciais por natureza) isso
é adequado.

---

## 5. Contrato de erro

Todo erro que sai do pacote é um `DatabaseError` com `{ code, message, sgbd, state }`.

A normalização acontece em dois lugares, de propósito:

1. **Em cada driver**, que conhece os detalhes do SGBD (`sqlcode` do DB2, `errorNum` do
   Oracle, `number` do tedious, `code` do pg/mysql2) e produz a melhor mensagem.
2. **Na fronteira do pacote** (`ConnectionHandle.normalizing`), como rede de segurança.
   Sem isso, a garantia dependeria de cada driver lembrar de normalizar — e um driver novo
   esqueceria.

`normalizeError` é idempotente: se o erro já for `DatabaseError`, devolve como está.

Erro de driver ausente tem código próprio: `DRIVER_NOT_INSTALLED`, com a mensagem
acionável `npm install <pacote>`.

---

## 6. Ciclo de vida

```
dbConnect ──► reaproveita do cache? ──sim──► devolve conexão existente
    │
    └──não──► carrega o driver (tardio) ──► conecta ──► guarda no cache
                                                        │
dbQuery / dbExecute ◄──────────────────────────────────┘
    │  normaliza tipos → formata (RF05/06/07)
    ▼
dbDisconnect ──► fecha a conexão física e remove do cache
```

### ⚠️ Regra de encerramento (descoberta no gate G0)

Encerrar o processo com uma conexão ODBC **ainda em voo** derruba o processo com
segmentation fault (exit 139). Observado empiricamente.

Por isso:
- o connection string do DB2 **sempre** define `CONNECTTIMEOUT`;
- `close()` é sempre aguardado;
- o host chama `closeAllConnections()` no shutdown.

---

## 7. Por que não Sequelize

Vale registrar, porque é a pergunta mais provável.

O Sequelize **não é um driver** — é um ORM que fica em cima dos drivers. A documentação de
instalação dele manda instalar o driver na mão (`pg`, `mysql2`, `tedious`, `oracledb`), e o
dialeto DB2 usa o `ibm_db` por baixo. Ou seja: adotá-lo **não removeria** nenhuma
dependência — só acrescentaria uma.

O que ele daria em troca: models, migrations, associations, validações, hooks, eager
loading. Nada disso está em nenhum requisito desta feature. O requisito é `SELECT` e
`INSERT` com SQL cru.

Custo de adotá-lo: mais uma dependência grande no bundle do aplicativo, mais uma versão
para acompanhar, e uma camada invisível transformando tipos — o que atrapalharia a
normalização explícita que fazemos aqui.

Se algum dia surgir a necessidade de entidades (um model `Pedido` com relações), a
avaliação muda — e aí o Sequelize passa a ser uma escolha razoável.

---

## 8. Como o sandbox consome isto

O QuickJS **nunca** faz `require('pg')`. O fluxo é:

```
script do usuário
  bru.db.query(conn, sql, params)
      │
      ├─ dentro do VM: wrapper definido por shims/database.js
      │
      ├─ cruza a ponte: vm.newFunction → promise (padrão de bru._sendRequest)
      │
      ▼
  host (marrone-electron/src/services/database)
      ├─ resolve a credencial no cofre (safeStorage) pelo id do SGBD
      ├─ chama @marrone/database
      └─ registra a operação para o relatório, com parâmetros redigidos
      │
      ▼
  valor JSON-safe volta para o VM
```

### A transação é montada dentro do VM

`dbTransaction(conn, fn)` é o único método com callback — e **um callback não atravessa a
fronteira**: `vm.dump` não serializa funções. A solução foi montar a transação **dentro do
QuickJS**, combinando os três métodos que atravessam (`begin`/`commit`/`rollback`). Assim a
API fica exatamente como o requisito pede, sem trafegar função pela ponte.

### Normalização acontece no host

`Date`, `Buffer` e `BigInt` não sobrevivem à travessia para o QuickJS. Eles são convertidos
pelo host **antes** de cruzar (`normalizeType.ts`), então o script sempre recebe tipos
JSON-safe.

### A capacidade é compartilhada entre os dois hosts

O objeto `bru.db` é montado por `createSandboxCapability` (em `src/sandboxCapability.ts`), que
é usado **tanto pelo app quanto pelo CLI**. O que muda entre eles é apenas a origem da
credencial, injetada como `CredentialProvider`:

| Host | Provider | Origem |
|---|---|---|
| App (Electron) | cofre do sistema | `safeStorage`, via `DatabaseCredentialsStore` |
| CLI (`marrone run`) | `createEnvironmentCredentialProvider()` | `MARRONE_DB_<SGBD>_USER/_PASSWORD` |

Por que compartilhar: a parte comum inclui a **redação de segredos** que vai para o relatório.
Duplicá-la entre os hosts significaria que uma das cópias ficaria para trás — e o resultado
seria vazamento de parâmetro em um relatório compartilhado.

Erro de credencial ausente: a mensagem vem do próprio provider (`credentialsHint`), porque só
ele sabe ONDE a credencial deveria estar — o app manda o usuário para Settings → Database; o
CLI nomeia as variáveis de ambiente exatas.

---

## 9. API pública

```ts
type SgbdId = 'mysql' | 'postgres' | 'mssql' | 'oracle' | 'db2';

interface ConnectOptions {
  /** Vem do cofre do sistema, resolvido pelo host. Nunca do arquivo da coleção. */
  username?: string;
  password?: string;
  connectTimeoutMs?: number;   // padrão 15s
  idleTimeoutMs?: number;      // padrão 5min
}

/**
 * Abre (ou reaproveita do cache) uma conexão.
 * @param connectionString string SEM credenciais: 'postgres://localhost:5432/mydb'
 * @throws DatabaseError quando a URL traz credenciais, o SGBD é inválido ou o driver falta
 */
function dbConnect(sgbd: string, connectionString: string, options?: ConnectOptions): Promise<DatabaseConnection>;

/** Consulta. Devolve objeto (1 registro), lista (N) ou null (0). Chaves nulas são omitidas. */
function dbQuery(conn: DatabaseConnection, sql: string, params?: unknown[]): Promise<ResultRow | ResultRow[] | null>;

/** Escrita. Devolve linhas afetadas e, quando houver, linhas retornadas. */
function dbExecute(conn: DatabaseConnection, sql: string, params?: unknown[]): Promise<ExecuteSummary>;

/** Fecha a conexão física e a remove do cache. */
function dbDisconnect(conn: DatabaseConnection): Promise<void>;

/** Executa `fn` dentro de uma transação: COMMIT no sucesso, ROLLBACK no erro. */
function dbTransaction<T>(conn: DatabaseConnection, fn: (conn: DatabaseConnection) => Promise<T>): Promise<T>;

/** Fecha todas as conexões do cache. O host deve chamar isto no shutdown. */
function closeAllConnections(): Promise<void>;
```

---

## 10. Verificação

```bash
cd packages/marrone-database
npm test      # 76 testes, sem banco e sem Docker
npm run build # rollup; confirma que nenhum driver entra no dist
```

Os testes de integração com banco real são opt-in:

```bash
POSTGRES_URL=postgres://localhost:5432/mydb \
POSTGRES_USER=usuario POSTGRES_PASSWORD=senha \
DB_INTEGRATION=true npm run test:integration
```

Variáveis suportadas: `POSTGRES_URL`, `MYSQL_URL`, `MSSQL_URL`, `ORACLE_URL`, `DB2_URL`
(cada uma com `_USER` e `_PASSWORD`). Sem elas, os testes de integração são apenas
`skipped` e o `npm test` fica verde em qualquer máquina.
