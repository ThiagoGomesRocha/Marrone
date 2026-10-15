import buildRunnerReport from './exportReport';

/**
 * Testes do relatório exportado PELA INTERFACE.
 *
 * Motivo de existir: o relatório do app é montado por um mapeamento campo a campo
 * (mapItemToRunnerResult), diferente do CLI, que passa o resultado inteiro ao repórter.
 * Quando a feature de banco chegou, o campo `databaseOperations` não foi incluído nesse
 * mapeamento e a aba "Database Operations" simplesmente NÃO aparecia no relatório do app
 * (só no do CLI) — sem erro nenhum. Estes testes cobrem essa regressão.
 */
const extractPayload = (html) => {
  const match = html.match(/decodeBase64\('([^']+)'\)/);

  if (!match) {
    throw new Error('payload base64 não encontrado no HTML gerado');
  }

  return JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
};

const buildItem = (overrides = {}) => ({
  uid: 'req-1',
  requestUid: 'run-1',
  name: 'valida dados salvos no bd',
  displayName: 'valida dados salvos no bd',
  status: 'completed',
  testResults: [{ status: 'pass', description: 'ok' }],
  ...overrides
});

const OPERATION = {
  timestamp: '2024-01-02T03:04:05.678Z',
  sgbd: 'mssql',
  sql: 'SELECT * FROM users WHERE userID = @p1',
  parameters: ['***'],
  durationMs: 8,
  status: 'success',
  resultSummary: '1 registro',
  resultRows: [{ userID: 1, email: 'thiago@exemplo.com' }],
  resultRowsTotal: 1,
  resultRowsTruncated: false
};

describe('buildRunnerReport — aba Database Operations', () => {
  test('leva as operações de banco do item para o relatório', () => {
    const { html } = buildRunnerReport({
      items: [buildItem({ databaseOperations: [OPERATION] })],
      exchanges: { 'run-1': { responseReceived: { status: 200, statusText: 'OK', duration: 30 } } },
      runCompletionTime: '2024-01-02 03:04:05'
    });

    const payload = extractPayload(html);

    expect(payload.databaseOperations).toHaveLength(1);
    expect(payload.databaseOperations[0]).toMatchObject({
      sgbd: 'mssql',
      sql: 'SELECT * FROM users WHERE userID = @p1',
      parameters: ['***'],
      resultSummary: '1 registro',
      requestName: 'valida dados salvos no bd'
    });
    // As linhas do resultado precisam chegar ao relatório exportado pelo app.
    expect(payload.databaseOperations[0].resultRows).toEqual([
      { userID: 1, email: 'thiago@exemplo.com' }
    ]);
  });

  test('sem operações a lista vem vazia — e a aba, por isso, não é criada', () => {
    const { html } = buildRunnerReport({
      items: [buildItem()],
      exchanges: {},
      runCompletionTime: '2024-01-02 03:04:05'
    });

    expect(extractPayload(html).databaseOperations).toEqual([]);
  });
});

/**
 * O JSON exportado pela INTERFACE.
 *
 * Motivo de existir: o app monta o resultado campo a campo (mapItemToRunnerResult) e o
 * JSON era um `JSON.stringify({ summary, results })` do objeto interno — sem CURL e sem
 * banco nenhum, enquanto o HTML exportado ao lado tinha as duas coisas. Agora os dois
 * passam pelo mesmo gerador, e estes testes travam essa paridade no caminho do app.
 */
describe('buildRunnerReport — JSON exportado pela interface', () => {
  test('o JSON traz a operação de banco DENTRO da requisição, com o script', () => {
    const { json } = buildRunnerReport({
      items: [buildItem({ path: 'Usuarios/validar_usuario.bru', databaseOperations: [OPERATION] })],
      exchanges: { 'run-1': { responseReceived: { status: 200, statusText: 'OK', duration: 30 } } },
      runCompletionTime: '2024-01-02 03:04:05'
    });

    const report = JSON.parse(json);

    expect(report.databaseOperations).toHaveLength(1);
    expect(report.results[0].databaseOperation).toMatchObject({
      sgbd: 'mssql',
      sgbdLabel: 'SQL Server',
      sql: 'SELECT * FROM users WHERE userID = @p1',
      parameters: ['***']
    });
    // As linhas devolvidas pela consulta chegam ao JSON exportado pela interface.
    expect(report.results[0].databaseOperation.resultRows).toEqual([
      { userID: 1, email: 'thiago@exemplo.com' }
    ]);
  });

  test('o JSON traz os mesmos testes que o HTML (testResults mesclados)', () => {
    const { json } = buildRunnerReport({
      items: [
        buildItem({
          testResults: [{ status: 'pass', description: 'aba Tests', duration: 4 }],
          preRequestTestResults: [{ status: 'pass', description: 'pré-requisição', duration: 9 }],
          postResponseTestResults: []
        })
      ],
      exchanges: {},
      runCompletionTime: '2024-01-02 03:04:05'
    });

    const report = JSON.parse(json);

    expect(report.results[0].testResults.map((t) => t.description)).toEqual([
      'pré-requisição',
      'aba Tests'
    ]);
    // O tempo de cada teste atravessa o caminho do app.
    expect(report.results[0].testResults[0].duration).toBe(9);
  });

  test('o JSON e o HTML exportados concordam sobre a operação de banco', () => {
    const { html, json } = buildRunnerReport({
      items: [buildItem({ path: 'Usuarios/validar_usuario.bru', databaseOperations: [OPERATION] })],
      exchanges: { 'run-1': { responseReceived: { status: 200, statusText: 'OK', duration: 30 } } },
      runCompletionTime: '2024-01-02 03:04:05'
    });

    const htmlPayload = extractPayload(html);
    const report = JSON.parse(json);

    expect(report.databaseOperations[0]).toEqual(htmlPayload.databaseOperations[0]);
    expect(report.results[0].databaseOperations[0]).toEqual(
      htmlPayload.results[0].results[0].databaseOperations[0]
    );
  });
});
