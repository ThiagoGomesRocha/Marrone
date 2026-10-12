import {
  createSandboxCapability,
  redactParameters,
  summarizeResult,
  createEnvironmentCredentialProvider,
  beginStatementFor,
  REDACTED,
  configure,
  closeAllConnections
} from '../src/index';
import { registerDriver } from '../src/drivers/registry';
import type { DatabaseDriver, DriverConnectOptions, DriverConnection } from '../src/drivers/types';
import { oracleDriver } from '../src/drivers/oracle';

/**
 * Testes da capacidade `bru.db` compartilhada entre o app (Electron) e o CLI.
 *
 * Usa um driver FALSO injetado no registro (sem banco, sem driver instalado) e um provider
 * de credenciais FALSO, para exercitar o código deste pacote — redação de segredos,
 * resumo de resultado, ciclo de vida das conexões e passos de transação.
 */

interface FakeState {
  connectOptions: DriverConnectOptions[];
  statements: string[];
  closed: number;
  /** Linhas devolvidas pelo driver falso. Sem valor, devolve 1 registro. */
  rows?: unknown[];
}

let fake: FakeState;

const makeFakeDriver = (): DatabaseDriver => ({
  sgbd: 'postgres',
  driverPackage: 'fake',
  connect: async (options: DriverConnectOptions): Promise<DriverConnection> => {
    fake.connectOptions.push(options);

    return {
      sgbd: 'postgres',
      query: async () => fake.rows ?? [{ id: 1, nome: 'João' }],
      execute: async (sql) => {
        fake.statements.push(sql);
        return { affectedRows: 1, rows: [] };
      },
      commit: async () => {
        fake.statements.push('COMMIT');
      },
      rollback: async () => {
        fake.statements.push('ROLLBACK');
      },
      begin: async () => {
        fake.statements.push('BEGIN');
      },
      close: async () => {
        fake.closed += 1;
      }
    };
  }
});

const providerWith = (credentials: { username: string; password: string } | null) => ({
  getCredentials: () => credentials,
  credentialsHint: (sgbdId: string) => `Dica específica para ${sgbdId}.`
});

describe('redactParameters', () => {
  test('omite os valores por padrão, mantendo a quantidade', () => {
    expect(redactParameters(['a', 1, true])).toEqual([REDACTED, REDACTED, REDACTED]);
  });

  test('preserva quando includeSensitive está ligado', () => {
    expect(redactParameters(['valor'], { includeSensitive: true })).toEqual(['valor']);
  });

  test('nunca lança com entrada inválida', () => {
    expect(redactParameters(undefined)).toEqual([]);
    expect(redactParameters('não é array')).toEqual([]);
  });
});

describe('summarizeResult', () => {
  test('resume sem despejar dados', () => {
    expect(summarizeResult(null)).toBe('sem registros');
    expect(summarizeResult([])).toBe('sem registros');
    // Objeto, para o formatResult, significa exatamente 1 registro (RF05).
    expect(summarizeResult({ id: 1, nome: 'João' })).toBe('1 registro');
    expect(summarizeResult([{ a: 1 }, { a: 2 }])).toBe('2 registro(s)');
    expect(summarizeResult({ affectedRows: 3, rows: null })).toBe('3 linha(s) afetada(s)');
  });
});

describe('beginStatementFor — transação por SGBD', () => {
  test('usa o BEGIN correto, e nada de BEGIN onde a transação é implícita', () => {
    expect(beginStatementFor('postgres')).toBe('BEGIN');
    expect(beginStatementFor('mysql')).toBe('START TRANSACTION');
    expect(beginStatementFor('mssql')).toBe('BEGIN TRANSACTION');
    // Oracle e DB2 não têm BEGIN.
    expect(beginStatementFor('oracle')).toBe('SELECT 1');
    expect(beginStatementFor('db2')).toBe('SELECT 1');
  });
});

describe('createEnvironmentCredentialProvider (usado pelo CLI)', () => {
  test('lê as variáveis por SGBD, com o prefixo padrão', () => {
    const provider = createEnvironmentCredentialProvider({
      MARRONE_DB_POSTGRES_USER: 'joao',
      MARRONE_DB_POSTGRES_PASSWORD: 'segredo',
      MARRONE_DB_DB2_USER: 'db2user'
    } as Record<string, string | undefined>);

    expect(provider.getCredentials('postgres')).toEqual({ username: 'joao', password: 'segredo' });
    expect(provider.getCredentials('db2')).toEqual({ username: 'db2user', password: '' });
  });

  test('devolve null quando não há NENHUMA variável daquele SGBD', () => {
    const provider = createEnvironmentCredentialProvider({} as Record<string, string | undefined>);

    expect(provider.getCredentials('oracle')).toBeNull();
  });

  // Isolamento: uma credencial de um SGBD não pode ser usada em outro.
  test('não vaza credencial entre SGBDs', () => {
    const provider = createEnvironmentCredentialProvider({
      MARRONE_DB_POSTGRES_USER: 'joao',
      MARRONE_DB_POSTGRES_PASSWORD: 'segredo'
    } as Record<string, string | undefined>);

    expect(provider.getCredentials('mysql')).toBeNull();
    expect(provider.getCredentials('db2')).toBeNull();
  });

  test('a dica cita os nomes exatos das variáveis que faltam', () => {
    const provider = createEnvironmentCredentialProvider({} as Record<string, string | undefined>);
    const hint = provider.credentialsHint!('mssql');

    expect(hint).toContain('MARRONE_DB_MSSQL_USER');
    expect(hint).toContain('MARRONE_DB_MSSQL_PASSWORD');
  });

  test('aceita prefixo customizado', () => {
    const provider = createEnvironmentCredentialProvider(
      { CI_DB_MYSQL_USER: 'u', CI_DB_MYSQL_PASSWORD: 'p' } as Record<string, string | undefined>,
      'CI_DB'
    );

    expect(provider.getCredentials('mysql')).toEqual({ username: 'u', password: 'p' });
  });
});

describe('createSandboxCapability', () => {
  beforeEach(() => {
    fake = { connectOptions: [], statements: [], closed: 0 };
    registerDriver(makeFakeDriver());
    configure();
  });

  afterEach(async () => {
    await closeAllConnections();
    registerDriver(oracleDriver);
  });

  test('connect RECUSA sem credencial e usa a dica do provider', async () => {
    const capability = createSandboxCapability({ credentialsProvider: providerWith(null) });

    await expect(capability.connect('postgres', 'postgres://localhost:5432/mydb')).rejects.toThrow(
      /Dica específica para postgres/
    );
    expect(fake.connectOptions).toHaveLength(0);
  });

  test('connect resolve a credencial no provider e a entrega ao driver', async () => {
    const capability = createSandboxCapability({
      credentialsProvider: providerWith({ username: 'joao', password: 'segredo' })
    });

    const handle = await capability.connect('postgres', 'postgres://localhost:5432/mydb');

    expect(fake.connectOptions[0]).toMatchObject({
      connectionString: 'postgres://localhost:5432/mydb',
      username: 'joao',
      password: 'segredo'
    });
    // O handle que atravessa para o sandbox não pode conter a senha.
    expect(JSON.stringify(handle)).not.toContain('segredo');
  });

  test('connect rejeita sgbdId vazio com mensagem clara', async () => {
    const capability = createSandboxCapability({
      credentialsProvider: providerWith({ username: 'u', password: 'p' })
    });

    await expect(capability.connect('', 'postgres://localhost:5432/x')).rejects.toThrow(
      /primeiro argumento deve ser o id do SGBD/
    );
  });

  test('query registra a operação com parâmetros REDIGIDOS e resumo do resultado', async () => {
    const recorded: Record<string, unknown>[] = [];
    const capability = createSandboxCapability({
      credentialsProvider: providerWith({ username: 'joao', password: 'segredo' }),
      record: (entry) => recorded.push(entry)
    });

    const handle = await capability.connect('postgres', 'postgres://localhost:5432/mydb');
    const result = await capability.query(handle, 'SELECT * FROM usuarios WHERE senha = $1', ['minha-senha']);

    // dbQuery aplica formatResult: 1 registro volta como OBJETO, não como lista (RF05).
    expect(result).toEqual({ id: 1, nome: 'João' });

    const queryEntry = recorded.find((entry) => entry.sql && String(entry.sql).startsWith('SELECT'));
    expect(queryEntry).toMatchObject({
      sgbd: 'postgres',
      status: 'success',
      parameters: [REDACTED],
      resultSummary: '1 registro'
    });
    expect(typeof queryEntry!.durationMs).toBe('number');
    expect(JSON.stringify(recorded)).not.toContain('minha-senha');
    expect(JSON.stringify(recorded)).not.toContain('segredo');
  });

  test('grava no máximo 20 linhas e informa o total e o corte', async () => {
    const recorded: Record<string, unknown>[] = [];
    const capability = createSandboxCapability({
      credentialsProvider: providerWith({ username: 'joao', password: 'segredo' }),
      record: (entry) => recorded.push(entry)
    });

    fake.rows = Array.from({ length: 137 }, (_, index) => ({ userID: index + 1 }));

    const handle = await capability.connect('postgres', 'postgres://localhost:5432/mydb');
    await capability.query(handle, 'SELECT * FROM users');

    const queryEntry = recorded.find((entry) => entry.sql === 'SELECT * FROM users')!;
    const rows = queryEntry.resultRows as unknown[];

    // O teto existe para o relatório não virar um dump de tabela...
    expect(rows).toHaveLength(20);
    expect(rows[0]).toEqual({ userID: 1 });
    // ...mas o total real e o aviso de corte ficam registrados, para avisar quem lê.
    expect(queryEntry.resultRowsTotal).toBe(137);
    expect(queryEntry.resultRowsTruncated).toBe(true);
  });

  test('não marca corte quando o resultado cabe no teto', async () => {
    const recorded: Record<string, unknown>[] = [];
    const capability = createSandboxCapability({
      credentialsProvider: providerWith({ username: 'u', password: 'p' }),
      record: (entry) => recorded.push(entry)
    });

    fake.rows = Array.from({ length: 3 }, (_, index) => ({ id: index + 1 }));

    const handle = await capability.connect('postgres', 'postgres://localhost:5432/mydb');
    await capability.query(handle, 'SELECT id FROM pedidos');

    const queryEntry = recorded.find((entry) => entry.sql === 'SELECT id FROM pedidos')!;
    expect(queryEntry.resultRows).toHaveLength(3);
    expect(queryEntry.resultRowsTotal).toBe(3);
    expect(queryEntry.resultRowsTruncated).toBe(false);
  });

  test('query com 1 registro grava a linha única (formatResult devolve objeto)', async () => {
    const recorded: Record<string, unknown>[] = [];
    const capability = createSandboxCapability({
      credentialsProvider: providerWith({ username: 'u', password: 'p' }),
      record: (entry) => recorded.push(entry)
    });

    const handle = await capability.connect('postgres', 'postgres://localhost:5432/mydb');
    await capability.query(handle, 'SELECT * FROM usuarios WHERE id = $1', [1]);

    const queryEntry = recorded.find((entry) => String(entry.sql).startsWith('SELECT * FROM usuarios'))!;
    // 1 registro chega como objeto; ainda assim precisa virar uma linha no relatório.
    expect(queryEntry.resultRows).toEqual([{ id: 1, nome: 'João' }]);
    expect(queryEntry.resultRowsTotal).toBe(1);
  });

  test('execute registra o statement', async () => {
    const recorded: Record<string, unknown>[] = [];
    const capability = createSandboxCapability({
      credentialsProvider: providerWith({ username: 'u', password: 'p' }),
      record: (entry) => recorded.push(entry)
    });

    const handle = await capability.connect('postgres', 'postgres://localhost:5432/mydb');
    const result = await capability.execute(handle, 'UPDATE pedidos SET status = $1 WHERE id = $2', ['ok', 1]);

    expect(result.affectedRows).toBe(1);
    expect(recorded.some((entry) => entry.sql === 'UPDATE pedidos SET status = $1 WHERE id = $2')).toBe(true);
  });

  test('erro no driver é registrado com status error e continua propagando', async () => {
    const recorded: Record<string, unknown>[] = [];
    const capability = createSandboxCapability({
      credentialsProvider: providerWith({ username: 'u', password: 'p' }),
      record: (entry) => recorded.push(entry)
    });

    // Troca o driver por um que falha na query.
    registerDriver({
      sgbd: 'postgres',
      driverPackage: 'fake-broken',
      connect: async () => ({
        sgbd: 'postgres',
        query: async () => {
          const err = new Error('SQL30081N') as Error & { code?: string };
          err.code = '-30081';
          throw err;
        },
        execute: async () => ({ affectedRows: null, rows: [] }),
        commit: async () => {},
        rollback: async () => {},
        close: async () => {}
      })
    });

    const handle = await capability.connect('postgres', 'postgres://localhost:5432/mydb');

    await expect(capability.query(handle, 'SELECT 1', [])).rejects.toThrow('SQL30081N');

    const errorEntry = recorded.find((entry) => entry.status === 'error');
    expect((errorEntry!.error as { code?: string }).code).toBe('-30081');
  });

  test('usar conexão inexistente ou já encerrada falha com mensagem clara', async () => {
    const capability = createSandboxCapability({
      credentialsProvider: providerWith({ username: 'u', password: 'p' })
    });

    await expect(capability.query({ id: 'nao-existe', sgbd: 'postgres', connectionString: 'x' }, 'SELECT 1')).rejects.toThrow(
      /conexão inválida ou já encerrada/
    );
  });

  test('transação executa o BEGIN correto e registra os passos', async () => {
    const recorded: Record<string, unknown>[] = [];
    const capability = createSandboxCapability({
      credentialsProvider: providerWith({ username: 'u', password: 'p' }),
      record: (entry) => recorded.push(entry)
    });

    const handle = await capability.connect('postgres', 'postgres://localhost:5432/mydb');
    await capability.begin(handle);
    await capability.commit(handle);

    expect(fake.statements).toEqual(['BEGIN', 'COMMIT']);
    expect(recorded.filter((entry) => entry.operation === 'begin')).toHaveLength(1);
    expect(recorded.filter((entry) => entry.operation === 'commit')).toHaveLength(1);
  });

  test('rollback é registrado como passo de transação', async () => {
    const capability = createSandboxCapability({
      credentialsProvider: providerWith({ username: 'u', password: 'p' })
    });

    const handle = await capability.connect('postgres', 'postgres://localhost:5432/mydb');
    await capability.rollback(handle);

    expect(fake.statements).toEqual(['ROLLBACK']);
  });

  test('disconnect é idempotente e closeAll fecha o que sobrou', async () => {
    const capability = createSandboxCapability({
      credentialsProvider: providerWith({ username: 'u', password: 'p' })
    });

    const first = await capability.connect('postgres', 'postgres://localhost:5432/db1');
    await capability.connect('postgres', 'postgres://localhost:5432/db2');

    expect(capability.openConnectionCount()).toBe(2);

    await capability.disconnect(first);
    await expect(capability.disconnect(first)).resolves.toBeUndefined();

    expect(capability.openConnectionCount()).toBe(1);

    await capability.closeAll();

    expect(capability.openConnectionCount()).toBe(0);
    expect(fake.closed).toBe(2);
  });
});
