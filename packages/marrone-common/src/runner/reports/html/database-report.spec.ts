import { generateHtmlReport, collectDatabaseOperations, redactDatabaseParameters } from './generate-report';

/**
 * Testes da seção "Database Operations" do relatório HTML (RF08 / P4).
 *
 * O relatório embute o payload em base64 dentro do HTML. Estes testes extraem e decodificam
 * esse payload para verificar o que REALMENTE chega ao relatório — em vez de só checar que
 * a string contém um texto qualquer.
 */
const extractPayload = (html: string): any => {
  const match = html.match(/decodeBase64\('([^']+)'\)/);

  if (!match) {
    throw new Error('payload base64 não encontrado no HTML gerado');
  }

  return JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
};

const buildRunnerResults = (databaseOperations: any[] = []) => [
  {
    iterationIndex: 0,
    summary: {
      totalRequests: 1,
      passedRequests: 1,
      failedRequests: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalPreRequestTests: 0,
      passedPreRequestTests: 0,
      failedPreRequestTests: 0,
      totalPostResponseTests: 0,
      passedPostResponseTests: 0,
      failedPostResponseTests: 0
    },
    results: [
      {
        // ATENÇÃO À POSIÇÃO DO `name`: ele fica no RESULTADO, não dentro de `request`.
        // `request` carrega só method/url/headers/data (ver T_EmptyRequest/T_Request em
        // runner/types). Uma fixture que coloca `name` dentro de `request` faz o teste
        // CONCORDAR com o bug que ele deveria pegar — foi o que aconteceu aqui.
        name: 'Pedido',
        path: 'Pedidos/validar_pedido.bru',
        request: { method: 'POST', url: 'https://api.local/pedidos', headers: {} },
        response: { status: 200, headers: {}, data: {} },
        runDuration: 0.1,
        databaseOperations
      }
    ]
  }
] as any;

describe('relatório — seção Database Operations', () => {
  test('as operações de banco entram no payload do relatório', () => {
    const html = generateHtmlReport({
      runnerResults: buildRunnerResults([
        {
          timestamp: '2024-01-02T03:04:05.678Z',
          sgbd: 'postgres',
          sql: 'SELECT * FROM pedidos WHERE id = $1',
          parameters: ['***'],
          durationMs: 12,
          status: 'success',
          resultSummary: '1 registro(s)'
        }
      ])
    });

    const payload = extractPayload(html);

    expect(payload.databaseOperations).toHaveLength(1);
    expect(payload.databaseOperations[0]).toMatchObject({
      sgbd: 'postgres',
      sql: 'SELECT * FROM pedidos WHERE id = $1',
      status: 'success',
      durationMs: 12,
      resultSummary: '1 registro(s)'
    });
  });

  test('a operação carrega o contexto da requisição em que rodou', () => {
    const html = generateHtmlReport({
      runnerResults: buildRunnerResults([
        { sgbd: 'mysql', sql: 'SELECT 1', parameters: [], durationMs: 3, status: 'success' }
      ])
    });

    const [operation] = extractPayload(html).databaseOperations;

    expect(operation.requestName).toBe('Pedido');
    expect(operation.requestMethod).toBe('POST');
    expect(operation.requestUrl).toBe('https://api.local/pedidos');
  });

  test('operação com erro é preservada com o código e a mensagem', () => {
    const html = generateHtmlReport({
      runnerResults: buildRunnerResults([
        {
          sgbd: 'db2',
          sql: 'SELECT 1',
          parameters: [],
          durationMs: 5000,
          status: 'error',
          error: { code: '-30081', message: 'SQL30081N communication error' }
        }
      ])
    });

    const [operation] = extractPayload(html).databaseOperations;

    expect(operation.status).toBe('error');
    expect(operation.error.code).toBe('-30081');
    expect(operation.error.message).toContain('SQL30081N');
  });

  test('os parâmetros aparecem REDIGIDOS por padrão, mesmo se vierem crus', () => {
    const html = generateHtmlReport({
      runnerResults: buildRunnerResults([
        {
          sgbd: 'postgres',
          sql: 'UPDATE usuarios SET senha = $1 WHERE id = $2',
          parameters: ['senha-em-claro', 42],
          durationMs: 4,
          status: 'success'
        }
      ])
    });

    const payload = extractPayload(html);

    expect(payload.databaseOperations[0].parameters).toEqual(['***', '***']);
    expect(JSON.stringify(payload)).not.toContain('senha-em-claro');
  });

  // Regressão (histórico): a primeira versão deste código espalhava `databaseOperations`
  // CRU dentro de cada result (via `...result`), então os parâmetros SEM redação vazavam
  // por payload.results mesmo com a redação no topo.
  //
  // O invariante MUDOU na Fase 2, de propósito: as operações agora APARECEM dentro de cada
  // result, porque o bloco "Database Operation" é renderizado dentro de cada teste. O que
  // continua proibido — e é o que este teste trava agora — é a versão CRUA: o que entra
  // ali é a versão redigida.
  test('REGRESSÃO: só a versão REDIGIDA das operações entra em payload.results', () => {
    const html = generateHtmlReport({
      runnerResults: buildRunnerResults([
        {
          sgbd: 'postgres',
          sql: 'UPDATE usuarios SET senha = $1',
          parameters: ['senha-em-claro'],
          durationMs: 4,
          status: 'success'
        }
      ])
    });

    const payload = extractPayload(html);

    // A operação está no nível da requisição — é o que a aba Tests renderiza...
    expect(payload.results[0].results[0].databaseOperations).toHaveLength(1);
    // ...mas REDIGIDA.
    expect(payload.results[0].results[0].databaseOperations[0].parameters).toEqual(['***']);
    // A visão consolidada do topo continua existindo.
    expect(payload.databaseOperations).toHaveLength(1);
    // E o valor reconhecível não aparece em lugar nenhum do payload.
    expect(JSON.stringify(payload)).not.toContain('senha-em-claro');
  });

  test('a operação dentro da requisição carrega o script e o rótulo do SGBD', () => {
    const html = generateHtmlReport({
      runnerResults: buildRunnerResults([
        {
          sgbd: 'mssql',
          sql: 'SELECT id FROM usuarios WHERE id = @p1',
          parameters: ['***'],
          durationMs: 45,
          status: 'success',
          resultSummary: '1 registro'
        }
      ])
    });

    const [operation] = extractPayload(html).results[0].results[0].databaseOperations;

    // O nome do arquivo sai do caminho da requisição — é o "Script:" do mockup.
    expect(operation.script).toBe('validar_pedido.bru');
    expect(operation.requestPath).toBe('Pedidos/validar_pedido.bru');
    expect(operation.sgbdLabel).toBe('SQL Server');
    expect(operation.requestName).toBe('Pedido');
  });

  test('sem operações a requisição traz um array vazio, não undefined', () => {
    const html = generateHtmlReport({ runnerResults: buildRunnerResults([]) });

    expect(extractPayload(html).results[0].results[0].databaseOperations).toEqual([]);
  });

  test('com includeSensitive os parâmetros são preservados', () => {
    const html = generateHtmlReport({
      runnerResults: buildRunnerResults([
        { sgbd: 'postgres', sql: 'SELECT 1', parameters: ['valor'], durationMs: 1, status: 'success' }
      ]),
      includeSensitive: true
    });

    expect(extractPayload(html).databaseOperations[0].parameters).toEqual(['valor']);
  });

  test('sem operações de banco o payload traz uma lista vazia (a aba não aparece)', () => {
    const html = generateHtmlReport({ runnerResults: buildRunnerResults([]) });

    expect(extractPayload(html).databaseOperations).toEqual([]);
  });

  test('o HTML continua trazendo os campos anteriores (não quebramos o relatório)', () => {
    const html = generateHtmlReport({
      runnerResults: buildRunnerResults([]),
      version: '1.2.3',
      environment: 'Local',
      runCompletionTime: '2024-01-02T03:04:05.678Z'
    });

    const payload = extractPayload(html);

    expect(payload.version).toBe('1.2.3');
    expect(payload.environment).toBe('Local');
    expect(payload.results).toHaveLength(1);
  });

  describe('funções auxiliares exportadas', () => {
    test('collectDatabaseOperations achata iterações e anexa o contexto', () => {
      const operations = collectDatabaseOperations(buildRunnerResults([
        { sgbd: 'oracle', sql: 'SELECT 1 FROM DUAL', parameters: ['***'], durationMs: 9, status: 'success' }
      ]) as any, false, true);

      expect(operations).toHaveLength(1);
      expect((operations[0] as any).sgbd).toBe('oracle');
    });

    test('collectDatabaseOperations ignora requisições sem a chave', () => {
      const withoutOperations = buildRunnerResults([]);
      withoutOperations[0].results[0].databaseOperations = undefined;

      expect(collectDatabaseOperations(withoutOperations as any, false, true)).toEqual([]);
    });

    test('redactDatabaseParameters nunca lança com entrada estranha', () => {
      expect(redactDatabaseParameters(undefined, false)).toEqual([]);
      expect(redactDatabaseParameters('não é array', false)).toEqual([]);
      expect(redactDatabaseParameters([1, 2], true)).toEqual([1, 2]);
    });

    test('as linhas devolvidas pela consulta entram no payload por padrão', () => {
      const operations = collectDatabaseOperations(buildRunnerResults([
        {
          sgbd: 'mssql',
          sql: 'SELECT * FROM users WHERE userID = @p1',
          parameters: ['***'],
          durationMs: 12,
          status: 'success',
          resultSummary: '1 registro',
          resultRows: [{ userID: 1, name: 'Thiago' }],
          resultRowsTotal: 1,
          resultRowsTruncated: false
        }
      ]) as any, false, true);

      expect((operations[0] as any).resultRows).toEqual([{ userID: 1, name: 'Thiago' }]);
      expect((operations[0] as any).resultRowsTotal).toBe(1);
      expect((operations[0] as any).resultRowsTruncated).toBe(false);
    });

    test('includeDbRows=false remove as linhas mas preserva SQL, parâmetros e resumo', () => {
      const operations = collectDatabaseOperations(buildRunnerResults([
        {
          sgbd: 'mssql',
          sql: 'SELECT * FROM pedidos',
          parameters: ['***'],
          durationMs: 40,
          status: 'success',
          resultSummary: '137 registro(s)',
          resultRows: [{ id: 1 }],
          resultRowsTotal: 137,
          resultRowsTruncated: true
        }
      ]) as any, false, false);

      const operation = operations[0] as any;
      // As linhas somem (o relatório vira só metadados)...
      expect(operation.resultRows).toBeUndefined();
      expect(operation.resultRowsTotal).toBeUndefined();
      expect(operation.resultRowsTruncated).toBeUndefined();
      // ...mas o resto continua, inclusive o resumo com a contagem.
      expect(operation.sql).toBe('SELECT * FROM pedidos');
      expect(operation.parameters).toEqual(['***']);
      expect(operation.resultSummary).toBe('137 registro(s)');
    });
  });
});
