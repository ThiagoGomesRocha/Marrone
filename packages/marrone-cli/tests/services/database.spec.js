const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

/**
 * Testes da capacidade de banco do CLI.
 *
 * Usa o @marrone/database REAL (via o symlink do workspace). A lógica da capacidade já é
 * testada no pacote; aqui verificamos o que é exclusivo do CLI: a origem da credencial ser
 * o AMBIENTE, e o aviso apontar os nomes exatos das variáveis.
 */

const {
  createCliDatabaseCapability,
  databaseFactoryForBru,
  credentialsProvider,
  DATABASE_CREDENTIALS_HELP
} = require('../../src/services/database');

const ORACLE_VARS = ['MARRONE_DB_ORACLE_USER', 'MARRONE_DB_ORACLE_PASSWORD'];
const POSTGRES_VARS = ['MARRONE_DB_POSTGRES_USER', 'MARRONE_DB_POSTGRES_PASSWORD'];

const clearVars = (names) => names.forEach((name) => delete process.env[name]);

describe('credenciais de banco no CLI (variáveis de ambiente)', () => {
  beforeEach(() => {
    clearVars([...ORACLE_VARS, ...POSTGRES_VARS]);
  });

  afterEach(() => {
    clearVars([...ORACLE_VARS, ...POSTGRES_VARS]);
  });

  test('lê usuário e senha do ambiente, por SGBD', () => {
    process.env.MARRONE_DB_POSTGRES_USER = 'joao';
    process.env.MARRONE_DB_POSTGRES_PASSWORD = 'segredo';

    expect(credentialsProvider.getCredentials('postgres')).toEqual({
      username: 'joao',
      password: 'segredo'
    });
  });

  test('sem as variáveis, devolve null (e o SGBD não é afetado por outro)', () => {
    process.env.MARRONE_DB_POSTGRES_USER = 'joao';
    process.env.MARRONE_DB_POSTGRES_PASSWORD = 'segredo';

    expect(credentialsProvider.getCredentials('oracle')).toBeNull();
  });

  test('o texto de ajuda expõe o padrão das variáveis', () => {
    expect(DATABASE_CREDENTIALS_HELP).toContain('MARRONE_DB_<SGBD>_USER');
    expect(DATABASE_CREDENTIALS_HELP).toContain('MARRONE_DB_<SGBD>_PASSWORD');
    expect(DATABASE_CREDENTIALS_HELP).toMatch(/NÃO leva usuário e senha/);
  });
});

describe('createCliDatabaseCapability', () => {
  beforeEach(() => {
    clearVars([...ORACLE_VARS, ...POSTGRES_VARS]);
  });

  afterEach(() => {
    clearVars([...ORACLE_VARS, ...POSTGRES_VARS]);
  });

  test('expõe a API bru.db completa', () => {
    const capability = createCliDatabaseCapability();

    for (const method of ['connect', 'query', 'execute', 'disconnect', 'begin', 'commit', 'rollback', 'closeAll']) {
      expect(typeof capability[method]).toBe('function');
    }
  });

  test('sem credencial no ambiente, a mensagem diz exatamente quais variáveis definir', async () => {
    const capability = createCliDatabaseCapability();

    try {
      await capability.connect('oracle', 'oracle://localhost:1521/mydb');
      throw new Error('deveria ter lançado');
    } catch (err) {
      expect(err.message).toMatch(/MARRONE_DB_ORACLE_USER/);
      expect(err.message).toMatch(/MARRONE_DB_ORACLE_PASSWORD/);
      // E não deve mencionar o cofre do sistema, que é exclusivo do app.
      expect(err.message).not.toMatch(/Settings > Database/);
    }
  });

  // Ponta a ponta pelo pacote real: ambiente → dbConnect → driver.
  // Mesmo ajuste do spec do app: a asserção não pode depender de o driver estar instalado.
  test('com as variáveis definidas, o erro deixa de ser de credencial', async () => {
    process.env.MARRONE_DB_ORACLE_USER = 'u';
    process.env.MARRONE_DB_ORACLE_PASSWORD = 'p';

    const capability = createCliDatabaseCapability();

    try {
      await capability.connect('oracle', 'oracle://localhost:1521/mydb');
      // Nada escutando em 1521: chegar aqui sem erro seria inesperado.
    } catch (err) {
      expect(err.message).not.toMatch(/MARRONE_DB_/);
    }
  });

  test('databaseFactoryForBru entrega o objeto esperado ao runtime do sandbox', () => {
    const capability = databaseFactoryForBru(() => {});

    expect(typeof capability.connect).toBe('function');
    expect(capability.openConnectionCount()).toBe(0);
  });
});
