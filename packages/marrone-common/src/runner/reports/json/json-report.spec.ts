import { generateHtmlReport } from '../html/generate-report';
import { generateJsonReport } from './generate-report';

/**
 * Testes de PARIDADE entre o relatório HTML e o JSON.
 *
 * O requisito é literal: "todas as chaves presentes no HTML precisam existir no JSON".
 * Como os dois geradores usam a MESMA transformação por requisição (`enrichResult`) e o
 * MESMO merge de testes (`mergeTestResults`), a paridade é estrutural — mas estrutural
 * também regride sem aviso, e é isso que estes testes pegam.
 *
 * O JSON é comparado DEPOIS de passar por JSON.stringify/parse, para o teste valer sobre o
 * que realmente vai para o arquivo (um campo `undefined` some na serialização).
 */

const SECRET = 'SEGREDO-QUE-NAO-DEVE-APARECER';

const extractHtmlPayload = (html: string): any => {
  const match = html.match(/decodeBase64\('([^']+)'\)/);

  if (!match) {
    throw new Error('payload base64 não encontrado no HTML gerado');
  }

  return JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
};

const buildRunnerResults = (): any[] => [
  {
    iterationIndex: 0,
    summary: {
      totalRequests: 1,
      passedRequests: 1,
      failedRequests: 0,
      errorRequests: 0,
      skippedRequests: 0,
      skippedByBail: 0,
      totalAssertions: 1,
      passedAssertions: 1,
      failedAssertions: 0,
      totalTests: 1,
      passedTests: 1,
      failedTests: 0,
      totalPreRequestTests: 1,
      passedPreRequestTests: 1,
      failedPreRequestTests: 0,
      totalPostResponseTests: 0,
      passedPostResponseTests: 0,
      failedPostResponseTests: 0
    },
    results: [
      {
        iterationIndex: 0,
        name: 'GET /api/usuarios/validar',
        path: 'Usuarios/validar_usuario.bru',
        status: 'pass',
        error: null,
        runDuration: 0.12,
        request: {
          method: 'GET',
          url: 'https://api.exemplo.com/usuarios/validar',
          headers: { Authorization: `Bearer ${SECRET}`, Accept: 'application/json' },
          data: null
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: { ativo: true },
          responseTime: 120
        },
        assertionResults: [
          { lhsExpr: 'res.status', rhsExpr: '200', rhsOperand: '200', operator: 'to.equal', status: 'pass' }
        ],
        // Testes das três origens: pré-requisição, pós-resposta e aba Tests.
        testResults: [{ status: 'pass', description: 'corpo contém usuário ativo', duration: 3 }],
        preRequestTestResults: [{ status: 'pass', description: 'banco preparado', duration: 7 }],
        postResponseTestResults: [{ status: 'fail', description: 'checagem posterior', error: 'falhou', duration: 2 }],
        databaseOperations: [
          {
            timestamp: '2026-10-15T12:00:00.000Z',
            sgbd: 'mssql',
            sql: 'SELECT id, nome, ativo FROM usuarios WHERE id = @p1',
            parameters: [SECRET],
            connectionString: 'mssql://localhost:1433/MeuBanco',
            operation: 'query',
            durationMs: 45,
            status: 'success',
            resultSummary: '1 registro',
            resultRows: [{ id: 42, nome: 'João Silva', ativo: true }],
            resultRowsTotal: 1,
            resultRowsTruncated: false
          }
        ]
      }
    ]
  }
];

/** Todos os caminhos de chave de um objeto (arrays viram `[]`). */
const keyPaths = (value: unknown, prefix = ''): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => keyPaths(item, `${prefix}[]`));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return [path, ...keyPaths(child, path)];
    });
  }

  return [];
};

const jsonReport = (options: Record<string, unknown> = {}) => {
  const report = generateJsonReport({ runnerResults: buildRunnerResults(), ...options });

  // Espelha o que o reporter do CLI grava no arquivo.
  return JSON.parse(JSON.stringify(report));
};

describe('relatório JSON', () => {
  test('traz o resumo canônico, o array plano de requisições e o consolidado de banco', () => {
    const report = jsonReport();

    expect(report.summary.totalRequests).toBe(1);
    // O merge soma as três origens dos testes (1 pré + 1 tests + 0 pós) = 3.
    expect(report.summary.totalTests).toBe(3);
    expect(report.results).toHaveLength(1);
    expect(report.databaseOperations).toHaveLength(1);
  });

  test('mantém os campos que o CLI já consumia (compatibilidade)', () => {
    const [result] = jsonReport().results;

    // Dois testes e2e leem exatamente estes caminhos via --reporter-json
    // (tests/runner/cli-json-env-file e tests/runner/cli-env-combined).
    expect(result.request.url).toBe('https://api.exemplo.com/usuarios/validar');
    expect(result.response.status).toBe(200);
  });

  test('mescla os testes das três origens, na ordem pré → pós → tests', () => {
    const [result] = jsonReport().results;

    expect(result.testResults.map((t: any) => t.description)).toEqual([
      'banco preparado',
      'checagem posterior',
      'corpo contém usuário ativo'
    ]);
  });

  test('carrega o tempo de cada teste (medido no runner)', () => {
    const [result] = jsonReport().results;

    expect(result.testResults[0].duration).toBe(7);
  });

  test('a operação de banco aparece DENTRO da requisição, em forma singular e em lista', () => {
    const [result] = jsonReport().results;

    expect(result.databaseOperation).not.toBeNull();
    expect(result.databaseOperations).toHaveLength(1);
    expect(result.databaseOperation).toMatchObject({
      script: 'validar_usuario.bru',
      sgbd: 'mssql',
      sgbdLabel: 'SQL Server',
      operation: 'query',
      sql: 'SELECT id, nome, ativo FROM usuarios WHERE id = @p1'
    });
    expect(result.databaseOperation.durationMs).toBe(45);
    expect(result.databaseOperation.status).toBe('success');
    expect(result.databaseOperation.resultRows).toEqual([{ id: 42, nome: 'João Silva', ativo: true }]);
    expect(result.databaseOperation.resultRowsTotal).toBe(1);
  });

  test('sem operação de banco, databaseOperation é null (o campo nunca falta)', () => {
    const report = generateJsonReport({
      runnerResults: [
        {
          iterationIndex: 0,
          summary: {},
          results: [{ name: 'sem banco', path: 'a.bru', status: 'pass', runDuration: 0, request: { method: 'GET', url: 'https://x', headers: {} }, response: { status: 200 } }]
        }
      ] as any
    });

    expect(report.results[0].databaseOperation).toBeNull();
    expect(report.results[0].databaseOperations).toEqual([]);
  });

  test('os parâmetros de banco saem REDIGIDOS e o segredo não aparece no JSON', () => {
    const report = jsonReport();

    expect(report.results[0].databaseOperation.parameters).toEqual(['***']);
    expect(JSON.stringify(report)).not.toContain(SECRET);
  });

  test('o CURL sai no JSON e redige header sensível por padrão', () => {
    const report = jsonReport();
    const curl = report.results[0].curl;

    expect(curl).toContain('curl -X GET');
    // Com includeSensitive=false o valor do header vira [REDACTED] (ver curl.ts).
    expect(curl).toContain('Authorization: [REDACTED]');
    expect(curl).not.toContain(SECRET);
  });

  // Inconsistência corrigida na Fase 2: o CURL redigia o Authorization, mas as tabelas de
  // headers do MESMO relatório mostravam o valor cru — o CURL dava uma falsa sensação de
  // segurança enquanto o token seguia dentro do arquivo.
  test('as tabelas de headers também redigem header sensível por padrão', () => {
    const report = jsonReport();

    expect(report.results[0].request.headers.Authorization).toBe('[REDACTED]');
    // Header não sensível continua legível — só o valor de credencial é mascarado.
    expect(report.results[0].request.headers.Accept).toBe('application/json');
  });

  test('com includeSensitive o header cru é preservado', () => {
    const report = jsonReport({ includeSensitive: true });

    expect(report.results[0].request.headers.Authorization).toBe(`Bearer ${SECRET}`);
  });

  test('com includeSensitive o CURL e os parâmetros são preservados', () => {
    const report = jsonReport({ includeSensitive: true });

    expect(report.results[0].curl).toContain(`Authorization: Bearer ${SECRET}`);
    expect(report.results[0].databaseOperation.parameters).toEqual([SECRET]);
  });

  test('includeDbRows=false remove as linhas mas mantém SQL, parâmetros e resumo', () => {
    const report = jsonReport({ includeDbRows: false });
    const operation = report.results[0].databaseOperation;

    expect(operation.resultRows).toBeUndefined();
    expect(operation.resultRowsTotal).toBeUndefined();
    expect(operation.sql).toContain('SELECT id, nome, ativo');
    expect(operation.parameters).toEqual(['***']);
    expect(operation.resultSummary).toBe('1 registro');
  });

  // O requisito literal da fase: toda chave do HTML precisa existir no JSON.
  test('PARIDADE: toda chave presente no payload do HTML existe no JSON', () => {
    const htmlPayload = extractHtmlPayload(generateHtmlReport({ runnerResults: buildRunnerResults() }));
    const report = jsonReport();

    const htmlRequests = htmlPayload.results[0].results;
    expect(htmlRequests).toHaveLength(report.results.length);

    htmlRequests.forEach((htmlRequest: any, index: number) => {
      const htmlKeys = new Set(keyPaths(htmlRequest));
      const jsonKeys = new Set(keyPaths(report.results[index]));

      const missingInJson = [...htmlKeys].filter((path) => !jsonKeys.has(path));
      expect(missingInJson).toEqual([]);
    });
  });

  test('PARIDADE: a operação de banco do JSON traz os mesmos dados que a do HTML', () => {
    const htmlPayload = extractHtmlPayload(generateHtmlReport({ runnerResults: buildRunnerResults() }));
    const report = jsonReport();

    const htmlOperation = htmlPayload.results[0].results[0].databaseOperations[0];
    const jsonOperation = report.results[0].databaseOperations[0];

    expect(jsonOperation).toEqual(htmlOperation);
    expect(jsonOperation).toEqual(htmlPayload.databaseOperations[0]);
  });
});
