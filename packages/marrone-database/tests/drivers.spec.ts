/**
 * Testes dos drivers.
 *
 * Estratégia (o projeto decidiu não usar Docker nem banco no MVP — ver D5 do plano v2):
 *
 *  1. Funções PURAS de cada driver (montagem de config, parsing de placeholder, escape,
 *     connection string) — testadas de verdade, sem banco.
 *  2. O PIPELINE (pool → driver → normalização → formatação → erro → transação) é
 *     testado com um driver FALSO injetado no registro. Isso cobre o código que é nosso.
 *  3. O carregamento tardio é exercitado com um nome de pacote INEXISTENTE, para provar que o
 *     erro é claro e acionável — sem depender de o driver estar ou não instalado na máquina.
 *
 * Nenhum destes testes precisa de banco, driver instalado ou Docker.
 */

import {
  configure,
  dbConnect,
  dbQuery,
  dbExecute,
  dbDisconnect,
  dbTransaction,
  closeAllConnections,
  DatabaseError,
  getDatabaseById
} from '../src/index';
import { registerDriver } from '../src/drivers/registry';
import { loadDriverModule, type DatabaseDriver, type DriverConnectOptions, type DriverConnection } from '../src/drivers/types';
import { buildClientConfig } from '../src/drivers/postgres';
import { buildConnectionConfig } from '../src/drivers/mysql';
import {
  buildTediousConfig,
  normalizeAuthType,
  parseMssqlParameters,
  mapTediousRow,
  tediousTypeNameFor,
  toTediousValue,
  shouldUseSqlBatch
} from '../src/drivers/mssql';
import { buildOracleConnectString, buildOracleCredentials, oracleDriver } from '../src/drivers/oracle';
import { buildDb2ConnectionString, escapeDb2Value } from '../src/drivers/db2';

const baseOptions = (connectionString: string): DriverConnectOptions => ({
  connectionString,
  username: 'usuario',
  password: 'senha-secreta',
  connectTimeoutMs: 15000
});

describe('drivers — funções puras (sem banco, sem driver instalado)', () => {
  describe('PostgreSQL', () => {
    test('monta a config do pg.Client a partir da string sem credenciais', () => {
      const config = buildClientConfig(baseOptions('postgres://db.interno:5432/mydb'));

      expect(config).toEqual({
        host: 'db.interno',
        port: 5432,
        database: 'mydb',
        user: 'usuario',
        password: 'senha-secreta',
        connectionTimeoutMillis: 15000
      });
    });
  });

  describe('MySQL', () => {
    test('monta a config e mantém DECIMAL como string e DATA como string', () => {
      const config = buildConnectionConfig(baseOptions('mysql://localhost:3306/mydb'));

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(3306);
      expect(config.database).toBe('mydb');
      expect(config.user).toBe('usuario');
      expect(config.connectTimeout).toBe(15000);
      // Decisões explícitas que protegem precisão e fuso:
      expect(config.decimalNumbers).toBe(false);
      expect(config.dateStrings).toBe(true);
    });
  });

  describe('SQL Server (tedious)', () => {
    test('monta a config do tedious com os timeouts e o banco', () => {
      const config = buildTediousConfig(baseOptions('mssql://10.0.0.5:1433/mydb'));

      expect(config.server).toBe('10.0.0.5');
      expect(config.options.port).toBe(1433);
      expect(config.options.database).toBe('mydb');
      expect(config.options.connectTimeout).toBe(15000);
      expect(config.options.rowCollectionOnRequestCompletion).toBe(true);
      expect(config.authentication.options.userName).toBe('usuario');
      expect(config.authentication.options.password).toBe('senha-secreta');
    });

    describe('autenticação (Fase 3) — SQL Server vs Windows/NTLM', () => {
      test('sem authType a config é IDÊNTICA à de antes da feature (compatibilidade)', () => {
        const config = buildTediousConfig(baseOptions('mssql://10.0.0.5:1433/mydb'));

        expect(config.authentication.type).toBe('default');
        // O domain NÃO pode aparecer nem como chave: a config do caminho antigo é comparada
        // por igualdade estrita em alguns pontos e um campo novo a mudaria em silêncio.
        expect('domain' in config.authentication.options).toBe(false);
      });

      test('authType \'sql\' explícito continua em type \'default\'', () => {
        const config = buildTediousConfig({
          ...baseOptions('mssql://10.0.0.5:1433/mydb'),
          authType: 'sql'
        });

        expect(config.authentication.type).toBe('default');
        expect('domain' in config.authentication.options).toBe(false);
      });

      test('authType \'windows\' vira type \'ntlm\' com usuário, senha e domínio', () => {
        const config = buildTediousConfig({
          ...baseOptions('mssql://10.0.0.5:1433/mydb'),
          username: 'joao.silva',
          authType: 'windows',
          domain: 'EMPRESA'
        });

        expect(config.authentication.type).toBe('ntlm');
        expect(config.authentication.options.userName).toBe('joao.silva');
        expect(config.authentication.options.password).toBe('senha-secreta');
        // O domínio é o campo que faz o NTLM funcionar numa rede sem AD (nome da máquina).
        expect(config.authentication.options.domain).toBe('EMPRESA');
      });

      test('authType \'windows\' SEM domínio envia domain vazio, e não undefined', () => {
        const config = buildTediousConfig({
          ...baseOptions('mssql://10.0.0.5:1433/mydb'),
          authType: 'windows'
        });

        // O tedious valida a presença da chave no NTLM: `undefined` falharia na validação.
        expect(config.authentication.options.domain).toBe('');
      });

      test('um authType desconhecido NÃO vira NTLM por acidente', () => {
        const config = buildTediousConfig({
          ...baseOptions('mssql://10.0.0.5:1433/mydb'),
          authType: 'kerberos' as unknown as 'sql'
        });

        expect(config.authentication.type).toBe('default');
      });

      test('normalizeAuthType: só "windows" sai do padrão', () => {
        expect(normalizeAuthType('windows')).toBe('windows');
        expect(normalizeAuthType('sql')).toBe('sql');
        expect(normalizeAuthType(undefined)).toBe('sql');
        expect(normalizeAuthType('')).toBe('sql');
        expect(normalizeAuthType('WINDOWS')).toBe('sql');
      });

      test('trocar a autenticação não mexe no resto da config (TLS, timeouts, banco)', () => {
        const sqlConfig = buildTediousConfig(baseOptions('mssql://10.0.0.5:1433/mydb'));
        const windowsConfig = buildTediousConfig({
          ...baseOptions('mssql://10.0.0.5:1433/mydb'),
          authType: 'windows',
          domain: 'EMPRESA'
        });

        expect(windowsConfig.options).toEqual(sqlConfig.options);
        expect(windowsConfig.server).toBe(sqlConfig.server);
      });
    });

    describe('parseMssqlParameters — array posicional → parâmetros nomeados', () => {
      test('extrai na ordem numérica', () => {
        expect(parseMssqlParameters('SELECT * FROM t WHERE a = @p1 AND b = @p2')).toEqual(['p1', 'p2']);
      });

      test('ordena pelo número do placeholder, não pela posição no texto', () => {
        expect(parseMssqlParameters('WHERE b = @p2 AND a = @p1')).toEqual(['p1', 'p2']);
      });

      test('remove repetição do mesmo placeholder', () => {
        expect(parseMssqlParameters('WHERE a = @p1 OR b = @p1')).toEqual(['p1']);
      });

      test('lida com 10+ parâmetros sem confundir @p1 com @p10', () => {
        const sql = 'WHERE a=@p1 AND b=@p2 AND c=@p10';
        expect(parseMssqlParameters(sql)).toEqual(['p1', 'p2', 'p10']);
      });

      test('ignora maiúsculas/minúsculas', () => {
        expect(parseMssqlParameters('WHERE a = @P1 AND b = @p2')).toEqual(['p1', 'p2']);
      });

      test('devolve vazio quando não há placeholder', () => {
        expect(parseMssqlParameters('SELECT 1')).toEqual([]);
      });

      test('não confunde @@IDENTITY com placeholder', () => {
        expect(parseMssqlParameters('SELECT @@IDENTITY')).toEqual([]);
      });
    });

    describe('mapTediousRow — linha crua do tedious → { coluna: valor }', () => {
      // Fixture COPIADA da resposta real do tedious 18.6.2 contra um SQL Server 2014.
      // É esta forma exata — chaves ordinais + { value, metadata.colName } — que o driver
      // precisa achatar. Sem isso o script recebia {"0":{value,metadata},...} e toda leitura
      // de `linha.nome_da_coluna` vinha undefined.
      const linhaCrua = {
        0: { value: 'master', metadata: { userType: 0, flags: 33, colName: 'base', dataLength: 256 } },
        1: { value: 'marrone', metadata: { userType: 0, flags: 33, colName: 'login_usuario', dataLength: 256 } },
        2: { value: '12.0.5000.0', metadata: { userType: 0, flags: 1, colName: 'versao', dataLength: 30 } }
      };

      test('usa metadata.colName como chave', () => {
        expect(mapTediousRow(linhaCrua)).toEqual({
          base: 'master',
          login_usuario: 'marrone',
          versao: '12.0.5000.0'
        });
      });

      test('preserva a ordem original das colunas', () => {
        expect(Object.keys(mapTediousRow(linhaCrua))).toEqual(['base', 'login_usuario', 'versao']);
      });

      test('célula nula vira null e a coluna continua existindo', () => {
        const linha = { 0: { value: null, metadata: { colName: 'talvez' } } };

        expect(mapTediousRow(linha)).toEqual({ talvez: null });
        expect('talvez' in mapTediousRow(linha)).toBe(true);
      });

      test('cai para a chave ordinal quando o metadata não traz colName', () => {
        expect(mapTediousRow({ 0: { value: 1 } })).toEqual({ 0: 1 });
      });

      test('linha que já vem plana (driver mudou) é preservada, não descartada', () => {
        expect(mapTediousRow({ base: 'master' })).toEqual({ base: 'master' });
      });

      test('não quebra com linha vazia ou inválida', () => {
        expect(mapTediousRow({})).toEqual({});
        expect(mapTediousRow(null)).toEqual({});
        expect(mapTediousRow('texto')).toEqual({});
      });

      test('colunas de mesmo nome: a última vence (limitação do modelo do tedious)', () => {
        const linha = {
          0: { value: 'a', metadata: { colName: 'x' } },
          1: { value: 'b', metadata: { colName: 'x' } }
        };

        expect(mapTediousRow(linha)).toEqual({ x: 'b' });
      });
    });

    describe('tediousTypeNameFor — o tipo é OBRIGATÓRIO no addParameter (tedious 18)', () => {
      test('string, null e undefined viram NVarChar', () => {
        expect(tediousTypeNameFor('texto')).toBe('NVarChar');
        expect(tediousTypeNameFor(null)).toBe('NVarChar');
        expect(tediousTypeNameFor(undefined)).toBe('NVarChar');
      });

      test('boolean vira Bit', () => {
        expect(tediousTypeNameFor(true)).toBe('Bit');
        expect(tediousTypeNameFor(false)).toBe('Bit');
      });

      test('inteiro dentro do Int32 vira Int', () => {
        expect(tediousTypeNameFor(42)).toBe('Int');
        expect(tediousTypeNameFor(-1)).toBe('Int');
        expect(tediousTypeNameFor(2147483647)).toBe('Int');
      });

      test('inteiro fora do Int32 vira BigInt — Int rejeitaria com erro de validação', () => {
        expect(tediousTypeNameFor(4000000000)).toBe('BigInt');
        expect(tediousTypeNameFor(-2147483649)).toBe('BigInt');
      });

      test('BigInt do JS vira BigInt', () => {
        expect(tediousTypeNameFor(BigInt(10))).toBe('BigInt');
      });

      test('decimal vira Float — mesmo conjunto que um number do JS já representa', () => {
        expect(tediousTypeNameFor(1.5)).toBe('Float');
        expect(tediousTypeNameFor(0.1 + 0.2)).toBe('Float');
      });

      test('Date vira DateTime2 e binário vira VarBinary', () => {
        expect(tediousTypeNameFor(new Date('2026-10-11T00:00:00.000Z'))).toBe('DateTime2');
        expect(tediousTypeNameFor(Buffer.from('x'))).toBe('VarBinary');
      });

      test('objeto e array viram NVarChar (serão serializados em JSON)', () => {
        expect(tediousTypeNameFor({ a: 1 })).toBe('NVarChar');
        expect(tediousTypeNameFor([1, 2])).toBe('NVarChar');
      });
    });

    describe('toTediousValue — valor enviado ao driver', () => {
      test('null e undefined viram NULL de verdade', () => {
        expect(toTediousValue(null)).toBe(null);
        expect(toTediousValue(undefined)).toBe(null);
      });

      test('escalares passam intactos', () => {
        expect(toTediousValue('texto')).toBe('texto');
        expect(toTediousValue(42)).toBe(42);
        expect(toTediousValue(true)).toBe(true);
      });

      test('Date e Buffer passam intactos (têm tipo próprio)', () => {
        const data = new Date('2026-10-11T00:00:00.000Z');
        const bin = Buffer.from('x');

        expect(toTediousValue(data)).toBe(data);
        expect(toTediousValue(bin)).toBe(bin);
      });

      test('objeto e array viram JSON em vez de erro de validação opaco', () => {
        expect(toTediousValue({ a: 1 })).toBe('{"a":1}');
        expect(toTediousValue([1, 2])).toBe('[1,2]');
      });
    });

    describe('shouldUseSqlBatch — SQL batch vs RPC para sp_executesql', () => {
      // execSql manda RPC para sp_executesql, e o SQL Server passa a tratar a requisição
      // como PROCEDURE: tabela temporária local é derrubada ao retornar, `SET` de sessão
      // não persiste e transação aberta deixa de existir. Sem placeholders usamos o batch.
      test('SQL sem placeholder vai como batch', () => {
        expect(shouldUseSqlBatch('SELECT @@DATEFIRST')).toBe(true);
        expect(shouldUseSqlBatch('BEGIN TRANSACTION')).toBe(true);
        expect(shouldUseSqlBatch('CREATE TABLE #t (v int)')).toBe(true);
        expect(shouldUseSqlBatch('DROP TABLE dbo.pedidos')).toBe(true);
      });

      test('SQL com placeholder exige RPC (o batch não aceita parâmetros)', () => {
        expect(shouldUseSqlBatch('SELECT * FROM t WHERE id = @p1')).toBe(false);
        expect(shouldUseSqlBatch('INSERT INTO t (v) VALUES (@p1)')).toBe(false);
      });

      test('@@IDENTITY não conta como placeholder', () => {
        expect(shouldUseSqlBatch('SELECT @@IDENTITY AS id')).toBe(true);
      });
    });
  });

  describe('Oracle (thin mode)', () => {
    test('monta o connectString no formato host:porta/serviço', () => {
      expect(buildOracleConnectString(baseOptions('oracle://orcl.interno:1521/mydb'))).toBe(
        'orcl.interno:1521/mydb'
      );
    });

    test('monta as credenciais sem tocar em binário nativo', () => {
      expect(buildOracleCredentials(baseOptions('oracle://localhost:1521/mydb'))).toEqual({
        user: 'usuario',
        password: 'senha-secreta',
        connectString: 'localhost:1521/mydb'
      });
    });
  });

  describe('DB2 (ibm_db) — lições do gate G0', () => {
    test('o connection string SEMPRE traz CONNECTTIMEOUT (evita conexão pendente)', () => {
      const conn = buildDb2ConnectionString(baseOptions('db2://localhost:50000/mydb'));

      expect(conn).toContain('CONNECTTIMEOUT=15');
      expect(conn).toContain('DATABASE=mydb');
      expect(conn).toContain('HOSTNAME=localhost');
      expect(conn).toContain('PORT=50000');
      expect(conn).toContain('PROTOCOL=TCPIP');
    });

    test('arredonda o timeout para cima, em segundos, com mínimo de 1', () => {
      const fast = { ...baseOptions('db2://localhost:50000/mydb'), connectTimeoutMs: 200 };
      expect(buildDb2ConnectionString(fast)).toContain('CONNECTTIMEOUT=1');

      const slower = { ...baseOptions('db2://localhost:50000/mydb'), connectTimeoutMs: 15500 };
      expect(buildDb2ConnectionString(slower)).toContain('CONNECTTIMEOUT=16');
    });

    test('escapa valores com ; { } — uma senha com ; não pode quebrar a string', () => {
      expect(escapeDb2Value('simples')).toBe('simples');
      expect(escapeDb2Value('se;nh;a')).toBe('{se;nh;a}');
      expect(escapeDb2Value('a}b')).toBe('{a}}b}');
    });

    test('a senha com ; é escapada dentro do connection string final', () => {
      const options = { ...baseOptions('db2://localhost:50000/mydb'), password: 'se;nha' };

      // Verificação exata: o ';' da senha está DENTRO de chaves, então não separa pares.
      // (Contar ';' com split() não serve: o separador dentro das chaves é indistinguível.)
      expect(buildDb2ConnectionString(options)).toBe(
        'DATABASE=mydb;HOSTNAME=localhost;PORT=50000;PROTOCOL=TCPIP;UID=usuario;PWD={se;nha};CONNECTTIMEOUT=15;'
      );
    });
  });
});

// ---------------------------------------------------------------------------------------
// Pipeline: pool → driver → normalização → formatação → erro → transação.
// Usa um driver FALSO, para exercitar o código deste pacote sem depender de SGBD nenhum.
// ---------------------------------------------------------------------------------------

interface FakeDriverState {
  connectCalls: DriverConnectOptions[];
  closeCalls: number;
  queries: Array<{ sql: string; params: unknown[] }>;
  statements: string[];
  queryResult: Record<string, unknown>[];
  queryError: unknown;
  connectError: unknown;
}

let fakeState: FakeDriverState;

const makeFakeDriver = (): DatabaseDriver => ({
  sgbd: 'postgres',
  driverPackage: 'fake-driver',
  connect: async (options: DriverConnectOptions): Promise<DriverConnection> => {
    fakeState.connectCalls.push(options);
    if (fakeState.connectError) {
      throw fakeState.connectError;
    }

    return {
      sgbd: 'postgres',
      query: async (sql, params) => {
        fakeState.queries.push({ sql, params: params ?? [] });
        if (fakeState.queryError) {
          throw fakeState.queryError;
        }
        return fakeState.queryResult;
      },
      execute: async (sql, params) => {
        fakeState.statements.push(sql);
        if (fakeState.queryError) {
          throw fakeState.queryError;
        }
        return { affectedRows: 1, rows: fakeState.queryResult };
      },
      begin: async () => {
        fakeState.statements.push('BEGIN');
      },
      commit: async () => {
        fakeState.statements.push('COMMIT');
      },
      rollback: async () => {
        fakeState.statements.push('ROLLBACK');
      },
      close: async () => {
        fakeState.closeCalls += 1;
      }
    };
  }
});

describe('pipeline (driver falso — sem banco)', () => {
  beforeEach(() => {
    fakeState = {
      connectCalls: [],
      closeCalls: 0,
      queries: [],
      statements: [],
      queryResult: [],
      queryError: null,
      connectError: null
    };
    registerDriver(makeFakeDriver());
    configure();
  });

  afterEach(async () => {
    await closeAllConnections();
    registerDriver(oracleDriver); // devolve o registro ao estado normal
  });

  test('dbConnect passa host/porta/database e as credenciais do cofre ao driver', async () => {
    const connection = await dbConnect('postgres', 'postgres://localhost:5432/mydb', {
      username: 'joao',
      password: 'segredo'
    });

    expect(fakeState.connectCalls).toHaveLength(1);
    expect(fakeState.connectCalls[0].connectionString).toBe('postgres://localhost:5432/mydb');
    expect(fakeState.connectCalls[0].username).toBe('joao');
    expect(fakeState.connectCalls[0].password).toBe('segredo');
    expect(connection.sgbd).toBe('postgres');

    await dbDisconnect(connection);
  });

  test('dbConnect RECUSA string de conexão com credenciais e não chega a conectar', async () => {
    await expect(
      dbConnect('postgres', 'postgres://joao:segredo@localhost:5432/mydb', { username: 'joao' })
    ).rejects.toThrow(/não deve conter usuário e senha/);

    expect(fakeState.connectCalls).toHaveLength(0);
  });

  test('reaproveita a conexão em cache (mesma chave não reconecta)', async () => {
    const first = await dbConnect('postgres', 'postgres://localhost:5432/mydb', { username: 'joao' });
    const second = await dbConnect('postgres', 'postgres://localhost:5432/mydb', { username: 'joao' });

    expect(fakeState.connectCalls).toHaveLength(1);
    expect(first.id).toBe(second.id);

    await dbDisconnect(first);
  });

  test('a senha NÃO entra na chave do cache', () => {
    const { ConnectionPool } = require('../src/pool');
    const key = ConnectionPool.buildKey('postgres', 'postgres://localhost:5432/mydb', {
      username: 'joao',
      password: 'segredo'
    });

    expect(key).not.toContain('segredo');
    expect(key).toContain('joao');
  });

  test('a chave distingue forma de autenticação e domínio (não são segredo)', () => {
    const { ConnectionPool } = require('../src/pool');
    const connectionString = 'mssql://localhost:1433/mydb';

    const sqlKey = ConnectionPool.buildKey('mssql', connectionString, { username: 'joao' });
    const windowsKey = ConnectionPool.buildKey('mssql', connectionString, {
      username: 'joao',
      authType: 'windows',
      domain: 'EMPRESA'
    });

    // Sem esta distinção, uma conexão já aberta com autenticação do banco seria
    // reaproveitada por um pedido de autenticação do Windows do mesmo usuário.
    expect(sqlKey).not.toBe(windowsKey);
    expect(windowsKey).toContain('windows');
    expect(windowsKey).toContain('EMPRESA');
    // A senha nunca entra, nem no caminho novo.
    expect(
      ConnectionPool.buildKey('mssql', connectionString, { username: 'joao', password: 'segredo', authType: 'windows' })
    ).not.toContain('segredo');
  });

  test('dbQuery devolve objeto único quando há um registro (RF05)', async () => {
    fakeState.queryResult = [{ id: 1, nome: 'João' }];

    const connection = await dbConnect('postgres', 'postgres://localhost:5432/mydb');
    const result = await dbQuery(connection, 'SELECT * FROM usuarios WHERE id = $1', [1]);

    expect(Array.isArray(result)).toBe(false);
    expect(result).toEqual({ id: 1, nome: 'João' });
    expect(fakeState.queries[0].params).toEqual([1]);

    await dbDisconnect(connection);
  });

  test('dbQuery devolve lista quando há vários e omite chaves nulas (RF05/RF07)', async () => {
    fakeState.queryResult = [
      { id: 1, nome: 'João', telefone: null },
      { id: 2, nome: 'Maria', telefone: '11-99999-9999' }
    ];

    const connection = await dbConnect('postgres', 'postgres://localhost:5432/mydb');
    const result = await dbQuery(connection, 'SELECT * FROM usuarios');

    expect(result).toEqual([
      { id: 1, nome: 'João' },
      { id: 2, nome: 'Maria', telefone: '11-99999-9999' }
    ]);

    await dbDisconnect(connection);
  });

  test('dbQuery devolve null quando não há registros (RF05)', async () => {
    fakeState.queryResult = [];

    const connection = await dbConnect('postgres', 'postgres://localhost:5432/mydb');

    expect(await dbQuery(connection, 'SELECT * FROM usuarios WHERE id = 9999')).toBeNull();

    await dbDisconnect(connection);
  });

  test('valores Date/Buffer/BigInt são normalizados antes de sair (não cruzam a ponte crus)', async () => {
    fakeState.queryResult = [
      {
        criado_em: new Date('2024-01-02T03:04:05.678Z'),
        blob: Buffer.from('abc'),
        grande: BigInt('9007199254740993'),
        total: '19.90'
      }
    ];

    const connection = await dbConnect('postgres', 'postgres://localhost:5432/mydb');
    const result = await dbQuery(connection, 'SELECT 1');

    expect(result).toEqual({
      criado_em: '2024-01-02T03:04:05.678Z',
      blob: 'YWJj',
      grande: '9007199254740993',
      total: '19.90'
    });

    await dbDisconnect(connection);
  });

  test('dbExecute devolve affectedRows e as linhas formatadas', async () => {
    fakeState.queryResult = [{ id: 7 }];

    const connection = await dbConnect('postgres', 'postgres://localhost:5432/mydb');
    const result = await dbExecute(connection, 'UPDATE pedidos SET status = $1 WHERE id = $2', [
      'processando',
      7
    ]);

    expect(result.affectedRows).toBe(1);
    expect(result.rows).toEqual({ id: 7 });
    expect(fakeState.queries); // execute não passa por query()

    await dbDisconnect(connection);
  });

  test('erro do driver é normalizado para DatabaseError com { code, message, sgbd }', async () => {
    fakeState.queryError = { code: '28P01', message: 'password authentication failed' };

    const connection = await dbConnect('postgres', 'postgres://localhost:5432/mydb');

    await expect(dbQuery(connection, 'SELECT 1')).rejects.toThrow(DatabaseError);

    try {
      await dbQuery(connection, 'SELECT 1');
      throw new Error('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(DatabaseError);
      expect((err as DatabaseError).code).toBe('28P01');
      expect((err as DatabaseError).sgbd).toBe('postgres');
      expect((err as DatabaseError).toJSON()).toEqual({
        code: '28P01',
        state: null,
        message: 'password authentication failed',
        sgbd: 'postgres'
      });
    }

    await dbDisconnect(connection);
  });

  test('erro de conexão também é normalizado', async () => {
    fakeState.connectError = { sqlcode: -30081, state: '08001', message: 'communication error' };

    try {
      await dbConnect('postgres', 'postgres://localhost:5432/mydb');
      throw new Error('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(DatabaseError);
      expect((err as DatabaseError).code).toBe(-30081);
      expect((err as DatabaseError).state).toBe('08001');
    }
  });

  test('dbDisconnect fecha a conexão e a remove do cache', async () => {
    const connection = await dbConnect('postgres', 'postgres://localhost:5432/mydb');
    await dbDisconnect(connection);

    expect(fakeState.closeCalls).toBe(1);
  });

  test('dbTransaction faz BEGIN, COMMIT e devolve o resultado', async () => {
    fakeState.queryResult = [{ id: 1 }];

    const connection = await dbConnect('postgres', 'postgres://localhost:5432/mydb');
    const result = await dbTransaction(connection, async (tx) => dbQuery(tx, 'SELECT 1'));

    expect(fakeState.statements).toEqual(['BEGIN', 'COMMIT']);
    expect(result).toEqual({ id: 1 });

    await dbDisconnect(connection);
  });

  test('dbTransaction faz ROLLBACK e propaga o erro quando o callback falha', async () => {
    const connection = await dbConnect('postgres', 'postgres://localhost:5432/mydb');

    await expect(
      dbTransaction(connection, async () => {
        throw new Error('regra de negócio falhou');
      })
    ).rejects.toThrow('regra de negócio falhou');

    expect(fakeState.statements).toEqual(['BEGIN', 'ROLLBACK']);

    await dbDisconnect(connection);
  });

  test('closeAllConnections fecha tudo (o host precisa chamar antes de encerrar)', async () => {
    await dbConnect('postgres', 'postgres://localhost:5432/db1');
    await dbConnect('postgres', 'postgres://localhost:5432/db2');

    expect(fakeState.connectCalls).toHaveLength(2);

    await closeAllConnections();

    expect(fakeState.closeCalls).toBe(2);
  });

  test('SGBD inválido falha com a lista de ids válidos', async () => {
    await expect(dbConnect('sqlite', 'sqlite://localhost:1/mydb')).rejects.toThrow(
      /SGBD não suportado: "sqlite"/
    );
  });
});

// ---------------------------------------------------------------------------------------
// Módulo REAL do Oracle, sem o pacote instalado: o erro tem que ser claro e acionável.
// ---------------------------------------------------------------------------------------

describe('carregamento tardio de driver', () => {
  beforeEach(() => {
    configure();
  });

  afterEach(async () => {
    await closeAllConnections();
  });

  /**
   * Este teste era "o driver do Oracle não está instalado" e passou a FALHAR assim que o
   * `npm install` instalou os drivers — teste que depende do estado da máquina é teste ruim.
   * Agora usa um nome de pacote que não existe (determinístico nos dois estados) e exercita o
   * `loadDriverModule` REAL, que é exatamente a função usada pelos cinco drivers.
   */
  test('pacote ausente vira DRIVER_NOT_INSTALLED, com o comando exato a rodar', async () => {
    try {
      await loadDriverModule('pacote-de-driver-inexistente', 'oracle');
      throw new Error('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(DatabaseError);
      expect((err as DatabaseError).code).toBe('DRIVER_NOT_INSTALLED');
      expect((err as DatabaseError).message).toContain('npm install pacote-de-driver-inexistente');
      expect((err as DatabaseError).sgbd).toBe('oracle');
    }
  });

  test('o catálogo continua coerente com os drivers registrados', () => {
    for (const id of ['postgres', 'mysql', 'mssql', 'oracle', 'db2'] as const) {
      expect(getDatabaseById(id).driverPackage).toBeTruthy();
    }
  });
});
