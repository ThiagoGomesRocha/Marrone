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
 */
export const DATABASE_EXAMPLES = {
  postgres: {
    label: 'PostgreSQL',
    connectionString: 'postgres://localhost:5432/mydb',
    select: 'await dbQuery(conn, \'SELECT * FROM pedidos WHERE id = $1\', [123])',
    update: 'await dbExecute(conn, \'UPDATE pedidos SET status = $1 WHERE id = $2\', [\'processando\', 123])'
  },
  mysql: {
    label: 'MySQL',
    connectionString: 'mysql://localhost:3306/mydb',
    select: 'await dbQuery(conn, \'SELECT * FROM pedidos WHERE id = ?\', [123])',
    update: 'await dbExecute(conn, \'UPDATE pedidos SET status = ? WHERE id = ?\', [\'processando\', 123])'
  },
  mssql: {
    label: 'SQL Server',
    connectionString: 'mssql://localhost:1433/mydb',
    select: 'await dbQuery(conn, \'SELECT * FROM pedidos WHERE id = @p1\', [123])',
    update: 'await dbExecute(conn, \'UPDATE pedidos SET status = @p1 WHERE id = @p2\', [\'processando\', 123])'
  },
  oracle: {
    label: 'Oracle',
    connectionString: 'oracle://localhost:1521/mydb',
    select: 'await dbQuery(conn, \'SELECT * FROM pedidos WHERE id = :1\', [123])',
    update: 'await dbExecute(conn, \'UPDATE pedidos SET status = :1 WHERE id = :2\', [\'processando\', 123])'
  },
  db2: {
    label: 'IBM DB2',
    connectionString: 'db2://localhost:50000/mydb',
    select: 'await dbQuery(conn, \'SELECT * FROM pedidos WHERE id = ?\', [123])',
    update: 'await dbExecute(conn, \'UPDATE pedidos SET status = ? WHERE id = ?\', [\'processando\', 123])'
  }
};

/** Ordem de exibição quando o catálogo do main process não está disponível. */
export const FALLBACK_DATABASE_IDS = Object.keys(DATABASE_EXAMPLES);

export const getExample = (sgbdId) =>
  DATABASE_EXAMPLES[sgbdId] || { label: sgbdId, connectionString: '', select: '', update: '' };

export const getSgbdLabel = (sgbdId) => getExample(sgbdId).label;

/** Snippet completo de script de pré-requisição, para o painel de exemplos. */
export const buildScriptExample = (sgbdId) => {
  const example = getExample(sgbdId);

  return `// Pré-requisição — ${example.label}
// A string de conexão NÃO tem usuário/senha: as credenciais ficam no cofre do sistema
// (Settings > Database) e são aplicadas pelo Marrone na hora de conectar.
const conn = await db.connect('${sgbdId}', '${example.connectionString}');

const pedido = ${example.select};

${example.update};

await db.disconnect(conn);`;
};
