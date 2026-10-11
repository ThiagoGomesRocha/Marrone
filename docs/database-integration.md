# Integração com Bancos de Dados

Acesso a **MySQL, PostgreSQL, SQL Server, Oracle e IBM DB2** a partir dos scripts de pré e
pós-requisição do Marrone.

> **Princípio que governa tudo nesta feature:** a senha nunca sai do cofre do sistema
> operacional. Ela não está no seu script, não está no arquivo `.bru`, não está no git e
> não aparece no relatório HTML.

---

## 1. Visão geral

Scripts de pré e pós-requisição podem executar SQL em cinco SGBDs através de `bru.db`:

| Função | Para que serve |
|---|---|
| `bru.db.connect(sgbd, connectionString)` | abre (ou reaproveita) uma conexão |
| `bru.db.query(conn, sql, params)` | consulta que devolve registros |
| `bru.db.execute(conn, sql, params)` | escrita (INSERT/UPDATE/DELETE/DDL) |
| `bru.db.disconnect(conn)` | fecha a conexão |
| `bru.db.transaction(conn, async () => { … })` | executa um bloco dentro de uma transação |

Os drivers usados são `pg`, `mysql2`, `tedious`, `oracledb` (thin mode) e `ibm_db`.
Não há ORM: o SQL é seu, e é executado como você escreveu.

---

## 2. Configurando as credenciais

1. Abra **Settings → Database**.
2. Escolha o banco no seletor.
3. Preencha **Usuário** e **Senha**.
4. Clique em **Salvar**.

O que acontece nos bastidores: usuário e senha são cifrados pelo `safeStorage` do sistema
operacional (Keychain no macOS, DPAPI no Windows) e gravados no armazenamento interno do
aplicativo. A senha **não** é escrita em nenhum arquivo da sua coleção.

O botão **Testar conexão** abre e fecha uma conexão de verdade, usando as credenciais que
já estão guardadas — a string de conexão digitada apenas para o teste não é salva.

### Uma conta por SGBD

O MVP guarda **uma** credencial por banco de dados. Se você precisa de duas contas no mesmo
PostgreSQL (por exemplo, uma de leitura e uma de escrita), isso ainda não é suportado —
múltiplas contas exigiriam escolher a conta dentro do script, o que muda a API e está
planejado para uma fase seguinte.

### No CLI: credenciais por variável de ambiente

O CLI (`marrone run`) **não tem cofre do sistema** — `safeStorage` é uma API do Electron e não
existe em um processo de terminal. Ali as credenciais vêm do **ambiente**:

```bash
MARRONE_DB_POSTGRES_USER=joao \
MARRONE_DB_POSTGRES_PASSWORD=segredo \
marrone run --env Local
```

O padrão é `<SGBD>` em maiúsculas: `MARRONE_DB_POSTGRES_*`, `MARRONE_DB_MYSQL_*`,
`MARRONE_DB_MSSQL_*`, `MARRONE_DB_ORACLE_*`, `MARRONE_DB_DB2_*`.

Não existe variável genérica (`MARRONE_DB_USER`) de propósito: uma credencial global seria
aplicada a qualquer banco, inclusive a um que você não pretendia conectar a partir do CI.

Se a variável faltar, **o próprio script** recebe uma mensagem dizendo exatamente qual definir —
em vez de um erro genérico de conexão.

| Onde o script roda | De onde vêm as credenciais |
|---|---|
| App (desktop) | cofre do sistema, configurado em Settings → Database |
| CLI (`marrone run`) | variáveis de ambiente |

---

## 3. Escrevendo os scripts

### A string de conexão NÃO leva usuário e senha

```js
// ✅ certo — o Marrone aplica as credenciais do cofre
const conn = await bru.db.connect('postgres', 'postgres://localhost:5432/mydb');
```

```js
// ❌ errado — isto é RECUSADO com erro explícito
const conn = await bru.db.connect('postgres', 'postgres://joao:segredo@localhost:5432/mydb');
```

A recusa é intencional: se a senha entrasse na string, ela automaticamente iria para o
arquivo `.bru`, para o controle de versão e para o relatório.

### Exemplo de pré-requisição — PostgreSQL

```js
const conn = await bru.db.connect('postgres', 'postgres://localhost:5432/mydb');

// Placeholder posicional numerado
await bru.db.execute(conn, 'UPDATE pedidos SET status = $1 WHERE id = $2', ['processando', 123]);

await bru.db.disconnect(conn);
```

### Exemplo de pós-requisição — PostgreSQL

```js
const conn = await bru.db.connect('postgres', 'postgres://localhost:5432/mydb');

const pedido = await bru.db.query(conn, 'SELECT id, status FROM pedidos WHERE id = $1', [123]);

// 1 registro => objeto único, não lista
if (!pedido || pedido.status !== 'concluido') {
  throw new Error('Persistência falhou: status = ' + (pedido && pedido.status));
}

await bru.db.disconnect(conn);
```

### Exemplos por SGBD — atenção ao placeholder

O estilo de placeholder é diferente em cada banco. Use o do seu SGBD:

#### MySQL

```js
const conn = await bru.db.connect('mysql', 'mysql://localhost:3306/mydb');
await bru.db.execute(conn, 'UPDATE pedidos SET status = ? WHERE id = ?', ['processando', 123]);
const pedido = await bru.db.query(conn, 'SELECT * FROM pedidos WHERE id = ?', [123]);
await bru.db.disconnect(conn);
```

#### SQL Server

```js
const conn = await bru.db.connect('mssql', 'mssql://localhost:1433/mydb');
// SQL Server usa parâmetros NOMEADOS: @p1, @p2, …
await bru.db.execute(conn, 'UPDATE pedidos SET status = @p1 WHERE id = @p2', ['processando', 123]);
const pedido = await bru.db.query(conn, 'SELECT * FROM pedidos WHERE id = @p1', [123]);
await bru.db.disconnect(conn);
```

O Marrone converte o array posicional para os parâmetros nomeados automaticamente, na
ordem numérica dos placeholders (`@p1`, `@p2`, `@p3`…). Você pode repetir o mesmo
placeholder no SQL — o valor é ligado uma vez só.

#### Oracle

```js
const conn = await bru.db.connect('oracle', 'oracle://localhost:1521/mydb');
// Oracle usa parâmetros posicionais numerados: :1, :2, …
await bru.db.execute(conn, 'UPDATE pedidos SET status = :1 WHERE id = :2', ['processando', 123]);
const pedido = await bru.db.query(conn, 'SELECT * FROM pedidos WHERE id = :1', [123]);
await bru.db.disconnect(conn);
```

> Oracle em **thin mode**: não é preciso instalar o Oracle Instant Client.

#### IBM DB2

```js
const conn = await bru.db.connect('db2', 'db2://localhost:50000/mydb');
await bru.db.execute(conn, 'UPDATE pedidos SET status = ? WHERE id = ?', ['processando', 123]);
const pedido = await bru.db.query(conn, 'SELECT * FROM pedidos WHERE id = ?', [123]);
await bru.db.disconnect(conn);
```

### Transações

```js
const conn = await bru.db.connect('postgres', 'postgres://localhost:5432/mydb');

await bru.db.transaction(conn, async () => {
  await bru.db.execute(conn, 'UPDATE contas SET saldo = saldo - $1 WHERE id = $2', [100, 1]);
  await bru.db.execute(conn, 'UPDATE contas SET saldo = saldo + $1 WHERE id = $2', [100, 2]);
});

await bru.db.disconnect(conn);
```

Se o bloco lançar, o Marrone executa `ROLLBACK` e propaga o erro. Se terminar, executa `COMMIT`.

---

## 4. Formato do retorno das queries

| Situação | Retorno |
|---|---|
| Nenhum registro | `null` |
| Exatamente 1 registro | objeto (`jsonObject`) |
| 2 ou mais registros | lista de objetos |
| Valor `null` ou ausente | a **chave é omitida** do objeto |
| Coluna com alias | usa o alias |

### Múltiplos registros

```sql
SELECT id, nome AS nome_completo, email, telefone FROM usuarios WHERE ativo = 1;
```

```json
[
  { "id": 1, "nome_completo": "João Silva", "email": "joao@x.com" },
  { "id": 2, "nome_completo": "Maria Souza", "email": "maria@x.com", "telefone": "11-99999-9999" }
]
```

Repare que o primeiro registro **não tem** a chave `telefone`: ela era `null` no banco e foi
omitida.

### Registro único

```json
{ "id": 1, "nome_completo": "João Silva", "email": "joao@x.com" }
```

### Sem resultados

```json
null
```

### Tipos de dados

Os valores são convertidos para tipos seguros antes de chegar ao seu script:

| No banco | No script |
|---|---|
| `TIMESTAMP` / `DATE` | string ISO 8601 **em UTC** (`2024-01-02T03:04:05.678Z`) |
| `BLOB` / `BYTEA` | string em base64 |
| `BIGINT`, `NUMERIC` grande | string (para não perder precisão) |
| `DECIMAL` / `NUMERIC` com casas | string (ex.: `"1234.56"`) |
| inteiro comum | number |

Se uma coluna `DECIMAL` voltar como `"19.90"` em vez de `19.9`, **isso é intencional**:
converter para número perderia a precisão e a formatação original.

---

## 5. Operações no relatório HTML

Quando você roda uma coleção, cada operação de banco vai para o relatório, na aba
**Database Operations**:

- data e hora, SGBD, SQL executado, tempo de execução e status;
- um botão **Copiar SQL**;
- filtros por SGBD e por status;
- o resultado resumido (por exemplo, "3 registro(s)").

Isso vale tanto para o relatório gerado pelo app quanto para o `--reporter html` do CLI: o
CLI coleta as operações de cada requisição e as inclui no mesmo payload.

### Parâmetros são redigidos

Os **valores** dos parâmetros aparecem como `***` por padrão. O relatório circula por
e-mail e por chats, e um parâmetro pode conter dado sensível. O SQL continua legível — só
os valores ficam ocultos.

O relatório também **não armazena o conjunto de linhas** retornado: apenas a contagem.
Despejar tabelas inteiras num artefato compartilhável seria um vazamento por design.

### Limitação: o relatório precisa de internet

O relatório carrega Vue 3 e Naive UI de uma CDN em tempo de execução. Sem acesso à
internet, os componentes visuais não renderizam (os dados continuam no arquivo). Isso é
uma característica herdada do gerador de relatório do projeto, não desta feature.

---

## 6. FAQ

**1. Por que a minha senha não está no arquivo `.bru`?**
Porque ela nunca deveria estar. O script carrega apenas host, porta e database; usuário e
senha vêm do cofre do sistema no momento de conectar. Isso significa que você pode commitar
a coleção sem vazar credencial.

**2. Por que as colunas do Oracle vêm em MAIÚSCULAS?**
Porque é assim que o Oracle as devolve. O Marrone não renomeia nada — mudar
silenciosamente o nome de uma coluna do banco seria pior do que mostrar o que o banco
realmente retornou. Se preferir nomes em minúsculas, use alias na query:
`SELECT nome AS "nome" FROM usuarios` (com aspas duplas).

**3. Preciso instalar o cliente Oracle (Instant Client)?**
Não. O driver roda em thin mode, que é JavaScript puro. Só para conexões que exigem
recursos avançados (como autenticação externa) o modo thick seria necessário — e ele está
fora do escopo.

**4. Por que valores com casas decimais voltam como texto?**
Para não perder precisão. Um `DECIMAL(20,10)` não cabe num número de JavaScript sem
arredondamento, então o valor é mantido como string exatamente como o banco devolveu. A
mesma lógica protege inteiros acima de 2^53.

**5. O que significa o erro `DRIVER_NOT_INSTALLED`?**
Que o pacote npm do driver daquele SGBD não está instalado. A mensagem diz exatamente o
que rodar — por exemplo: `npm install oracledb`. Cada SGBD tem o seu driver, e você só
precisa instalar os que vai usar.

---

## 7. Limitações conhecidas

- **Uma conta por SGBD** (ver seção 2).
- **O relatório precisa de internet** para renderizar (ver seção 5).
- **O testar-conexão exige o driver instalado**; sem ele, a mensagem de erro aponta o
  pacote que falta.
- **`ibm_db` (DB2) é o único driver nativo**, e o único que exige cuidado no empacotamento.
  Três detalhes, todos verificados rodando o aplicativo **empacotado** de verdade:
  - é N-API, então **não** precisa de recompilação contra o ABI do Electron;
  - o `asarUnpack` precisa incluir `ibm_db` **e** `bindings` — o pacote `bindings` localiza o
    `.node` varrendo o sistema de arquivos e falha dentro do asar;
  - o app define `IBM_DB_HOME` no boot
    (`packages/marrone-electron/src/utils/db2-packaged-env.js`), apontando para o `clidriver`
    desempacotado. Sem isso o caminho padrão do `ibm_db` é derivado do `__dirname` e apontaria
    para dentro do asar, de onde o Windows não carrega DLL.
  Sem as duas últimas, o DB2 **funciona em desenvolvimento e falha no aplicativo instalado**.
- **Os testes de integração com banco real são opt-in** e não rodam no `npm test` padrão.
- **No CLI as credenciais só vêm do ambiente** (não há cofre fora do app), e o CLI depende do
  pacote `@marrone/database` construído — rode `npm run build` em `packages/marrone-database`.

---

**Ver também:** [`database-manual-test.md`](./database-manual-test.md) — o roteiro de teste
manual com banco real, que é o aceite adotado no lugar do teste automatizado com Docker (D5).
