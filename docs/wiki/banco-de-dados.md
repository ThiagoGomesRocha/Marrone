# Scripts de banco de dados

Acesso a **MySQL, PostgreSQL, SQL Server, Oracle e IBM DB2** direto dos scripts de pré e
pós-requisição, através de `bru.db`. O SQL é seu: não há ORM traduzindo o que você escreveu.

---

## A senha nunca sai do cofre

O princípio que governa tudo nesta feature:

> **A string de conexão do script leva apenas host, porta e base.**
> Usuário e senha vêm do cofre do sistema operacional, no momento de conectar.

Isso significa que a coleção pode ser versionada e compartilhada sem vazar credencial — o
`.bru` não contém, e não pode conter, usuário e senha.

| Onde o script roda | De onde vêm as credenciais |
|---|---|
| Aplicação (desktop) | cofre do sistema — **Settings → Database** |
| CLI (`marrone run`) | variáveis de ambiente |

No CLI (não existe `safeStorage` fora do Electron):

```bash
MARRONE_DB_POSTGRES_USER=usuario \
MARRONE_DB_POSTGRES_PASSWORD=senha \
marrone run --env Local
```

O padrão é `<SGBD>` em maiúsculas: `MARRONE_DB_POSTGRES_*`, `MARRONE_DB_MYSQL_*`,
`MARRONE_DB_MSSQL_*`, `MARRONE_DB_ORACLE_*`, `MARRONE_DB_DB2_*`. Não existe variável genérica
(de propósito: uma credencial global valeria para qualquer banco, inclusive um que você não
pretendia conectar a partir do CI).

---

## A API

| Função | Para que serve |
|---|---|
| `bru.db.connect(sgbd, connectionString)` | abre (ou reaproveita) uma conexão |
| `bru.db.query(conn, sql, params)` | consulta que devolve registros |
| `bru.db.execute(conn, sql, params)` | escrita (INSERT / UPDATE / DELETE / DDL) |
| `bru.db.disconnect(conn)` | fecha a conexão |
| `bru.db.transaction(conn, async () => { … })` | executa um bloco dentro de uma transação |

Os SGBDs são identificados por `postgres`, `mysql`, `mssql`, `oracle` e `db2`.

```js
// ✅ certo — o Marrone aplica as credenciais do cofre
const conn = await bru.db.connect('postgres', 'postgres://localhost:5432/mydb');
```

```js
// ❌ errado — isto é RECUSADO com erro explícito
const conn = await bru.db.connect('postgres', 'postgres://joao:senha@localhost:5432/mydb');
```

A recusa é intencional: se a senha entrasse na string, ela iria automaticamente para o
arquivo `.bru`, para o controle de versão e para o relatório.

---

## O exemplo canônico (é este que está na aplicação)

O painel **Settings → Database → Exemplos de uso** mostra, para cada SGBD, exatamente o
script abaixo — e é ele que você deve seguir:

```js
// Bloco tests — confirma NO BANCO o que a requisição gravou.
test('valida dados salvos no bd', async function () {
  const conn = await bru.db.connect('postgres', 'postgres://localhost:5432/mydb');

  try {
    // Placeholder deste SGBD: $1
    const pedido = await bru.db.query(conn, 'SELECT * FROM pedidos WHERE id = $1', [123]);

    // 1 registro => objeto único | vários => lista | nenhum => null
    expect(pedido).to.not.be.null;
    console.log(pedido);
  } finally {
    // Fechar SEMPRE: conexão pendente com driver nativo (DB2) derruba o processo.
    await bru.db.disconnect(conn);
  }
});
```

Três detalhes que não são decorativos:

- **`async function`** — o `await` só existe dentro de função assíncrona, e o `test()` do
  Marrone aguarda a promise do callback.
- **`try/finally` no `disconnect`** — se a query falhar, a conexão ainda é fechada. Fechar o
  aplicativo com uma conexão ODBC pendente derruba o processo (segmentation fault).
- **`bru.db.*`** — não existe `db` global nem `dbQuery()`/`dbExecute()`. Os globais do
  sandbox são `test`, `bru`, `req`, `res`, `expect`, `assert`, `jwt` e `console`.

---

## Placeholder de cada SGBD

O estilo do placeholder muda de banco para banco. A chamada é sempre posicional
(`[valor1, valor2]`); quem traduz o array é o Marrone.

| SGBD | `sgbd` | String de conexão | Placeholder |
|---|---|---|---|
| PostgreSQL | `postgres` | `postgres://localhost:5432/mydb` | `$1`, `$2` |
| MySQL | `mysql` | `mysql://localhost:3306/mydb` | `?` |
| SQL Server | `mssql` | `mssql://localhost:1433/mydb` | `@p1`, `@p2` |
| Oracle | `oracle` | `oracle://localhost:1521/mydb` | `:1`, `:2` |
| IBM DB2 | `db2` | `db2://localhost:50000/mydb` | `?` |

```js
// MySQL
await bru.db.execute(conn, 'UPDATE pedidos SET status = ? WHERE id = ?', ['processando', 123]);
const pedido = await bru.db.query(conn, 'SELECT * FROM pedidos WHERE id = ?', [123]);
```

```js
// SQL Server — parâmetros NOMEADOS. O array posicional é convertido pela ordem
// numérica dos placeholders (@p1, @p2, …); repetir o mesmo placeholder liga o valor uma vez.
await bru.db.execute(conn, 'UPDATE pedidos SET status = @p1 WHERE id = @p2', ['processando', 123]);
```

```js
// Oracle — posicional numerado, em thin mode (não precisa de Instant Client)
await bru.db.execute(conn, 'UPDATE pedidos SET status = :1 WHERE id = :2', ['processando', 123]);
```

---

## Validar no banco depois da requisição

É o padrão mais útil: em vez de confiar só na resposta da API, você confirma **no banco** o
que ela gravou. A coleção de exemplo que acompanha a aplicação faz exatamente isso, e é
escrita para **não falhar numa instalação nova** (sem banco configurado):

```js
const sgbd = bru.getEnvVar('dbSgbd');                       // postgres | mysql | mssql | oracle | db2
const connectionString = bru.getEnvVar('dbConnectionString'); // SEM usuário e senha
const validationQuery = bru.getEnvVar('dbValidationQuery');   // a SUA consulta
const validationParam = bru.getEnvVar('dbValidationParam');   // opcional: valores em JSON, ex. [1]

if (!sgbd || !connectionString || !validationQuery) {
  console.log('[banco] exemplo não configurado — defina dbSgbd, dbConnectionString e dbValidationQuery no ambiente ativo.');
} else {
  test('valida dados salvos no bd', async function () {
    const conn = await bru.db.connect(sgbd, connectionString);

    try {
      const params = validationParam ? JSON.parse(validationParam) : undefined;
      const pedido = await bru.db.query(conn, validationQuery, params);

      expect(pedido).to.not.be.null;
      console.log(pedido);
    } finally {
      await bru.db.disconnect(conn);
    }
  });
}
```

Passo a passo na interface:

1. **Settings → Database**: escolha o SGBD e salve usuário e senha.
2. Crie (ou edite) um ambiente com `dbSgbd`, `dbConnectionString` e `dbValidationQuery`.
3. Selecione esse ambiente e rode a requisição.
4. Abra a aba **Tests** e o console: o valor do banco aparece no `console.log`.

Para comparar o banco com o que a API respondeu — só faz sentido quando **esta** requisição
gravou a linha:

```js
expect(pedido.email).to.equal(res.getBody().email);
```

---

## Transações

```js
const conn = await bru.db.connect('postgres', 'postgres://localhost:5432/mydb');

await bru.db.transaction(conn, async () => {
  await bru.db.execute(conn, 'UPDATE contas SET saldo = saldo - $1 WHERE id = $2', [100, 1]);
  await bru.db.execute(conn, 'UPDATE contas SET saldo = saldo + $1 WHERE id = $2', [100, 2]);
});

await bru.db.disconnect(conn);
```

Se o bloco lançar, o Marrone executa `ROLLBACK` e propaga o erro; se terminar, `COMMIT`.

---

## O que a query devolve

| Situação | Retorno |
|---|---|
| Nenhum registro | `null` |
| Exatamente 1 registro | objeto |
| 2 ou mais registros | lista de objetos |
| Coluna com valor `null` | a **chave é omitida** do objeto |
| Coluna com alias | usa o alias |

Os valores chegam ao script já convertidos para tipos seguros:

| No banco | No script |
|---|---|
| `TIMESTAMP` / `DATE` | string ISO 8601 **em UTC** (`2024-01-02T03:04:05.678Z`) |
| `BLOB` / `BYTEA` | string em base64 |
| `BIGINT`, `DECIMAL` / `NUMERIC` | **string** (para não perder precisão) |
| inteiro comum | number |

Se um `DECIMAL` voltar como `"19.90"` em vez de `19.9`, isso é intencional: virar `number`
perderia a precisão e a formatação original.

> ⚠️ **Exceção: SQL Server.** O driver `tedious` converte `DECIMAL`/`NUMERIC` para `number`
> antes de o Marrone ver o valor, e isso não é configurável. Se a precisão importa, converta
> para texto no próprio SQL: `SELECT CAST(saldo AS VARCHAR(50)) AS saldo FROM contas`.

---

## O que vai para o relatório

Cada operação de banco entra no relatório de execução, na aba **Database Operations**: data e
hora, SGBD, SQL, tempo e status, além de filtros por SGBD/status e um botão **Copiar SQL**.

Duas decisões de privacidade:

- os **valores** dos parâmetros aparecem como `***` (o SQL continua legível);
- o **conjunto de linhas** não é armazenado — apenas a contagem.

> O relatório carrega Vue 3 e Naive UI de uma CDN em tempo de execução: **sem internet** os
> componentes visuais não renderizam (os dados continuam no arquivo).

---

## Limitações conhecidas

- **Uma credencial por SGBD.** Duas contas no mesmo banco (leitura e escrita, por exemplo)
  ainda não são suportadas.
- **O relatório precisa de internet** para renderizar.
- **O "Testar conexão" exige o driver instalado** — a mensagem aponta o pacote que falta
  (`DRIVER_NOT_INSTALLED` → `npm install <pacote>`).
- **`ibm_db` (DB2) é o único driver nativo** e o único que exige cuidado no empacotamento.
- **Os testes de integração com banco real são opt-in** — veja
  [Testes automatizados](./testes.md#3-integração-com-banco-real-opt-in).
- **No CLI, o pacote precisa estar construído:** `npm run build` em `packages/marrone-database`.

O detalhamento de cada decisão (por que drivers diretos e não Sequelize, por que uma conexão
dedicada por entrada de cache, o contrato de erro) está em
[`docs/database-integration.md`](../database-integration.md) e em
[`packages/marrone-database/ARCHITECTURE.md`](../../packages/marrone-database/ARCHITECTURE.md).

---

**Ver também:** [documentação do Bruno](https://docs.usebruno.com) — scripting de pré e
pós-requisição, variáveis, ambientes e runner, que é a base sobre a qual `bru.db` foi
construído.
