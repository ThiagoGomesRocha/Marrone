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
