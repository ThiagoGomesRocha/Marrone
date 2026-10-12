/**
 * Conteúdo de UI da aba Settings > Database.
 *
 * POR QUE O CATÁLOGO VEM POR IPC
 * ------------------------------
 * O renderer NÃO pode importar @marrone/database. O pacote registra os cinco drivers e,
 * se fosse importado aqui, o bundler (rsbuild/webpack) tentaria empacotar pg, mysql2,
 * tedious, oracledb e ibm_db no bundle do browser — que não tem socket TCP nem fs.
 * O main process expõe o catálogo no canal 'database:catalog'.
 *
 * O que é responsabilidade da UI são os EXEMPLOS (texto de ajuda), que ficam aqui.
 */

/**
 * Exemplos por SGBD.
 *
 * ⚠️ NENHUMA string aqui tem usuário e senha. Isso é deliberado (decisão D4): a string de
 * conexão do script traz apenas host/porta/database, e as credenciais vêm do cofre do
 * sistema. Se um exemplo tivesse user:senha, ele ensinaria o usuário a fazer a coisa errada.
 *
 * ⚠️ A API é SEMPRE `bru.db.*` — nunca `db.*`, `dbQuery(...)` ou `dbExecute(...)`.
 * Estes exemplos já ensinaram a API errada uma vez (um usuário copiou `db.connect` e
 * `dbQuery` do painel e o script quebrou com SyntaxError). Os globais do sandbox são
 * `test`, `bru`, `req`, `res`, `expect`, `assert`, `jwt` e `console`: NÃO existe `db`
 * global nem as funções soltas `dbQuery`/`dbExecute`. Se você for mexer aqui, confirme
 * contra packages/marrone-js/src/runtime/test-runtime.js (monta o contexto) e
 * packages/marrone-js/src/sandbox/quickjs/shims/database.js (pendura bru.db).
 */
export const DATABASE_EXAMPLES = {
  postgres: {
    label: 'PostgreSQL',
    connectionString: 'postgres://localhost:5432/mydb',
    placeholder: '$1',
    select: 'await bru.db.query(conn, \'SELECT * FROM pedidos WHERE id = $1\', [123])',
    update: 'await bru.db.execute(conn, \'UPDATE pedidos SET status = $1 WHERE id = $2\', [\'processando\', 123])'
  },
  mysql: {
    label: 'MySQL',
    connectionString: 'mysql://localhost:3306/mydb',
    placeholder: '?',
    select: 'await bru.db.query(conn, \'SELECT * FROM pedidos WHERE id = ?\', [123])',
    update: 'await bru.db.execute(conn, \'UPDATE pedidos SET status = ? WHERE id = ?\', [\'processando\', 123])'
  },
  mssql: {
    label: 'SQL Server',
    connectionString: 'mssql://localhost:1433/mydb',
    // SQL Server usa parâmetros NOMEADOS (@p1, @p2…), mas o script passa array posicional:
    // o Marrone converte pela ordem numérica.
    placeholder: '@p1',
    select: 'await bru.db.query(conn, \'SELECT * FROM pedidos WHERE id = @p1\', [123])',
    update: 'await bru.db.execute(conn, \'UPDATE pedidos SET status = @p1 WHERE id = @p2\', [\'processando\', 123])'
  },
  oracle: {
    label: 'Oracle',
    connectionString: 'oracle://localhost:1521/mydb',
    placeholder: ':1',
    select: 'await bru.db.query(conn, \'SELECT * FROM pedidos WHERE id = :1\', [123])',
    update: 'await bru.db.execute(conn, \'UPDATE pedidos SET status = :1 WHERE id = :2\', [\'processando\', 123])'
  },
  db2: {
    label: 'IBM DB2',
    connectionString: 'db2://localhost:50000/mydb',
    placeholder: '?',
    select: 'await bru.db.query(conn, \'SELECT * FROM pedidos WHERE id = ?\', [123])',
    update: 'await bru.db.execute(conn, \'UPDATE pedidos SET status = ? WHERE id = ?\', [\'processando\', 123])'
  }
};

/** Ordem de exibição quando o catálogo do main process não está disponível. */
export const FALLBACK_DATABASE_IDS = Object.keys(DATABASE_EXAMPLES);

export const getExample = (sgbdId) =>
  DATABASE_EXAMPLES[sgbdId] || { label: sgbdId, connectionString: '', placeholder: '', select: '', update: '' };

export const getSgbdLabel = (sgbdId) => getExample(sgbdId).label;

/**
 * Script completo para o painel de exemplos: o bloco `tests`, que é onde a validação
 * no banco faz sentido (depois que a requisição rodou).
 *
 * O callback é `async` porque o `await` só existe dentro de função async — e o `test()`
 * do Marrone aguarda a promise do callback. O `try/finally` no `disconnect` não é
 * decorativo: conexão pendente com driver nativo (DB2) derruba o processo ao encerrar.
 */
export const buildScriptExample = (sgbdId) => {
  const example = getExample(sgbdId);

  return `// Bloco tests — confirma NO BANCO o que a requisição gravou.
test('valida dados salvos no bd', async function () {
  const conn = await bru.db.connect('${sgbdId}', '${example.connectionString}');

  try {
    // Placeholder deste SGBD: ${example.placeholder}
    const pedido = ${example.select};

    // 1 registro => objeto único | vários => lista | nenhum => null
    expect(pedido).to.not.be.null;
    console.log(pedido);

    // Compare com o que a API respondeu — só faz sentido quando ESTA requisição
    // gravou a linha, e aí o valor deve bater:
    //   expect(pedido.email).to.equal(res.getBody().email);
  } finally {
    // Fechar SEMPRE: conexão pendente com driver nativo (DB2) derruba o processo.
    await bru.db.disconnect(conn);
  }
});`;
};
