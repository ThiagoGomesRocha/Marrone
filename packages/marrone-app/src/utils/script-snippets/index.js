/**
 * Biblioteca de trechos de código para os scripts (Pre Request, Post Response) e Tests.
 *
 * REGRAS
 * ------
 * 1. Só a API que existe no runtime (marrone-js): `bru`, `req`, `res`, `test`, `expect`.
 *    `bru.db.*` é a única API de banco. Não existe `db` global, `dbQuery()` ou `pm.*`.
 *    O spec em ./index.spec.js confere isso contra a lista de membros reais.
 * 2. Nenhuma string de conexão tem usuário e senha. As credenciais vêm do cofre
 *    (Settings > Database), igual aos exemplos da aba.
 * 3. O placeholder SQL depende do SGBD ($1, ?, @p1, :1). Os snippets de banco são
 *    gerados com o SGBD escolhido, por isso são funções e não strings fixas.
 * 4. Retorno de `bru.db.query()`: objeto (1 linha), lista (várias) ou null (nenhuma).
 *    Retorno de `bru.db.execute()`: { affectedRows, rows }.
 */

import { DATABASE_EXAMPLES } from 'components/Preferences/Database/constants';

export const SNIPPET_GROUPS = {
  tests: 'Testes',
  prerequest: 'Pre Request',
  postresponse: 'Post Response',
  db: 'Banco de dados'
};

// Placeholder de cada SGBD, na ordem do parâmetro (1-based).
const PLACEHOLDER_BUILDERS = {
  '$1': (n) => `$${n}`,
  '?': () => '?',
  '@p1': (n) => `@p${n}`,
  ':1': (n) => `:${n}`
};

export const placeholderFor = (sgbdId, n) => {
  const example = DATABASE_EXAMPLES[sgbdId];
  const build = PLACEHOLDER_BUILDERS[example?.placeholder] || PLACEHOLDER_BUILDERS['?'];
  return build(n);
};

const connectionOf = (sgbdId) => DATABASE_EXAMPLES[sgbdId]?.connectionString || '';

// Tabela e colunas usadas por todos os exemplos de banco. É uma tabela de exemplo:
// troque pelos nomes reais do seu banco antes de rodar.
const TABLE = 'usuarios';

const openConnection = (sgbdId) => `const conn = await bru.db.connect('${sgbdId}', '${connectionOf(sgbdId)}');`;

// Id gerado no script: evita depender de RETURNING ou IDENTITY (cada SGBD faz diferente).
const GENERATE_ID = 'const id = Math.floor(Math.random() * 1000000000) + 1;';

/* -------------------------------------------------------------------------- */
/* Testes comuns                                                               */
/* -------------------------------------------------------------------------- */

const TEST_SNIPPETS = [
  {
    id: 'test-status-200',
    group: 'tests',
    label: 'Status 200',
    code: `test('status é 200', function () {
  expect(res.getStatus()).to.equal(200);
});`
  },
  {
    id: 'test-content-type',
    group: 'tests',
    label: 'Content-Type JSON',
    code: `test('resposta é JSON', function () {
  expect(res.getHeader('content-type')).to.include('application/json');
});`
  },
  {
    id: 'test-tempo-resposta',
    group: 'tests',
    label: 'Tempo de resposta',
    code: `test('responde em até 800 ms', function () {
  expect(res.getResponseTime()).to.be.below(800);
});`
  },
  {
    id: 'test-campos-obrigatorios',
    group: 'tests',
    label: 'Campos obrigatórios',
    code: `test('corpo contém os campos obrigatórios', function () {
  const body = res.getBody();
  expect(body).to.include.keys('id', 'nome', 'email');
});`
  },
  {
    id: 'test-lista-itens',
    group: 'tests',
    label: 'Validar cada item de uma lista',
    code: `test('cada item da lista tem id e valor válidos', function () {
  const itens = res.getBody().itens;
  expect(itens).to.be.an('array').that.is.not.empty;
  itens.forEach(function (item) {
    expect(item.id).to.be.a('number');
    expect(item.valor).to.be.at.least(0);
  });
});`
  },
  {
    id: 'test-tipos-aninhados',
    group: 'tests',
    label: 'Tipos de objeto aninhado',
    code: `test('endereço é objeto com CEP em texto', function () {
  const endereco = res.getBody().endereco;
  expect(endereco).to.be.an('object');
  expect(endereco.cep).to.be.a('string').and.match(/^\\d{5}-?\\d{3}$/);
});`
  },
  {
    id: 'test-comparar-variavel',
    group: 'tests',
    label: 'Comparar com variável salva',
    code: `test('id retornado é o id enviado no pre-request', function () {
  const esperado = bru.getVar('usuarioId');
  expect(res.getBody().id).to.equal(esperado);
});`
  }
];

/* -------------------------------------------------------------------------- */
/* Pre Request e Post Response (sem banco)                                     */
/* -------------------------------------------------------------------------- */

const SCRIPT_SNIPPETS = [
  {
    id: 'pre-variavel-dinamica',
    group: 'prerequest',
    label: 'Gerar variável dinâmica',
    code: `// Pre Request: gera um valor novo a cada envio e disponibiliza como variável.
bru.setVar('idRequisicao', 'req-' + Date.now());`
  },
  {
    id: 'pre-header-correlacao',
    group: 'prerequest',
    label: 'Header de correlação',
    code: `// Pre Request: adiciona um header de rastreio na requisição.
req.setHeader('X-Correlation-Id', 'corr-' + Date.now());`
  },
  {
    id: 'pre-aguardar',
    group: 'prerequest',
    label: 'Aguardar antes de enviar',
    code: `// Pre Request: pausa de 500 ms (útil quando a API ainda processa a chamada anterior).
await bru.sleep(500);`
  },
  {
    id: 'post-salvar-id',
    group: 'postresponse',
    label: 'Salvar id da resposta',
    code: `// Post Response: guarda o id criado pela API para as próximas requisições.
bru.setVar('pedidoId', res.getBody().id);`
  },
  {
    id: 'post-validar-resposta',
    group: 'postresponse',
    label: 'Validar resposta (com test)',
    code: `// Post Response: test() também funciona aqui; falha aparece no painel de testes.
test('resposta criou o recurso', function () {
  expect(res.getStatus()).to.equal(201);
  expect(res.getBody().id).to.be.a('number');
});`
  }
];

/* -------------------------------------------------------------------------- */
/* Banco de dados                                                              */
/* -------------------------------------------------------------------------- */

const dbSnippets = (sgbdId) => {
  const p1 = placeholderFor(sgbdId, 1);
  const p2 = placeholderFor(sgbdId, 2);
  const p3 = placeholderFor(sgbdId, 3);
  const p4 = placeholderFor(sgbdId, 4);

  return [
    {
      id: `db-conexao-${sgbdId}`,
      group: 'db',
      label: 'Conexão básica (tests)',
      code: `// Tests: conexão com ${DATABASE_EXAMPLES[sgbdId]?.label}. Sempre feche no finally.
test('conecta ao banco', async function () {
  ${openConnection(sgbdId)}
  try {
    const linhas = await bru.db.query(conn, 'SELECT 1 AS ok', []);
    expect(linhas).to.not.be.null;
  } finally {
    await bru.db.disconnect(conn);
  }
});`
    },
    {
      id: `db-pre-insert-${sgbdId}`,
      group: 'db',
      label: 'Pre Request: INSERT de massa de teste',
      code: `// Pre Request: cria o registro que a requisição vai consultar ou alterar.
${GENERATE_ID}
const email = 'teste.' + id + '@exemplo.com';
${openConnection(sgbdId)}
try {
  const r = await bru.db.execute(conn,
    'INSERT INTO ${TABLE} (id, nome, email, status) VALUES (${p1}, ${p2}, ${p3}, ${p4})',
    [id, 'Usuário de teste', email, 'ativo']);
  if (r.affectedRows !== 1) throw new Error('INSERT deveria afetar 1 linha');
  bru.setVar('usuarioId', id);
  bru.setVar('usuarioEmail', email);
} finally {
  await bru.db.disconnect(conn);
}`
    },
    {
      id: `db-pre-select-${sgbdId}`,
      group: 'db',
      label: 'Pre Request: SELECT de pré-condição',
      code: `// Pre Request: confirma uma pré-condição antes de enviar (ex.: produto em estoque).
${openConnection(sgbdId)}
try {
  const linha = await bru.db.query(conn,
    'SELECT id, status FROM ${TABLE} WHERE id = ${p1}', [bru.getVar('usuarioId')]);
  // query(): objeto com 1 linha, lista com várias, null com nenhuma
  if (linha === null) throw new Error('Pré-condição falhou: registro não existe');
} finally {
  await bru.db.disconnect(conn);
}`
    },
    {
      id: `db-post-validar-${sgbdId}`,
      group: 'db',
      label: 'Post Response: validar gravação no banco',
      code: `// Post Response: confere NO BANCO o que a API gravou (comparação com a resposta).
test('dados gravados pela API conferem com o banco', async function () {
  const corpo = res.getBody();
  ${openConnection(sgbdId)}
  try {
    const linha = await bru.db.query(conn,
      'SELECT id, nome, email, status FROM ${TABLE} WHERE id = ${p1}', [corpo.id]);
    expect(linha, 'registro deveria existir no banco').to.not.be.null;
    expect(linha.nome).to.equal(corpo.nome);
    expect(linha.email).to.equal(corpo.email);
  } finally {
    await bru.db.disconnect(conn);
  }
});`
    },
    {
      id: `db-post-update-${sgbdId}`,
      group: 'db',
      label: 'UPDATE e validação no banco',
      code: `// Tests: altera o registro e confirma a alteração no banco.
test('UPDATE altera exatamente um registro', async function () {
  const id = bru.getVar('usuarioId');
  ${openConnection(sgbdId)}
  try {
    const r = await bru.db.execute(conn,
      'UPDATE ${TABLE} SET status = ${p1} WHERE id = ${p2}', ['inativo', id]);
    expect(r.affectedRows).to.equal(1);

    const linha = await bru.db.query(conn, 'SELECT status FROM ${TABLE} WHERE id = ${p1}', [id]);
    expect(linha.status).to.equal('inativo');
  } finally {
    await bru.db.disconnect(conn);
  }
});`
    },
    {
      id: `db-tests-delete-${sgbdId}`,
      group: 'db',
      label: 'DELETE de limpeza',
      code: `// Tests: remove o registro de teste e confirma que ele sumiu.
test('DELETE remove o registro de teste', async function () {
  const id = bru.getVar('usuarioId');
  ${openConnection(sgbdId)}
  try {
    const r = await bru.db.execute(conn, 'DELETE FROM ${TABLE} WHERE id = ${p1}', [id]);
    expect(r.affectedRows).to.equal(1);

    const restante = await bru.db.query(conn, 'SELECT id FROM ${TABLE} WHERE id = ${p1}', [id]);
    expect(restante).to.be.null;
  } finally {
    await bru.db.disconnect(conn);
  }
});`
    },
    {
      id: `db-tests-transacao-${sgbdId}`,
      group: 'db',
      label: 'Transação com rollback',
      code: `// Tests: a transação desfaz o INSERT; nada fica gravado no banco.
test('rollback não deixa dados no banco', async function () {
  ${GENERATE_ID}
  ${openConnection(sgbdId)}
  try {
    await bru.db.begin(conn);
    await bru.db.execute(conn,
      'INSERT INTO ${TABLE} (id, nome, email, status) VALUES (${p1}, ${p2}, ${p3}, ${p4})',
      [id, 'Temporário', 'tmp.' + id + '@exemplo.com', 'ativo']);

    const dentro = await bru.db.query(conn, 'SELECT id FROM ${TABLE} WHERE id = ${p1}', [id]);
    expect(dentro).to.not.be.null;

    await bru.db.rollback(conn);

    const fora = await bru.db.query(conn, 'SELECT id FROM ${TABLE} WHERE id = ${p1}', [id]);
    expect(fora).to.be.null;
  } finally {
    await bru.db.disconnect(conn);
  }
});`
    }
  ];
};

/**
 * Lista de snippets, opcionalmente filtrada por grupo.
 * @param {{ group?: string, sgbdId?: string }} options
 */
export const getSnippets = ({ group, sgbdId = 'postgres' } = {}) => {
  const all = [...TEST_SNIPPETS, ...SCRIPT_SNIPPETS, ...dbSnippets(sgbdId)];
  return group ? all.filter((s) => s.group === group) : all;
};

export default getSnippets;
