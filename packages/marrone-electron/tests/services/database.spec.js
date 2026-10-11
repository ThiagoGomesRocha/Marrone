const { describe, test, expect, beforeEach } = require('@jest/globals');

// electron-store em memória: o que interessa aqui é a origem da credencial, não o arquivo.
jest.mock('electron-store', () => {
  class MockStore {
    constructor() {
      this.data = {};
    }

    get(key) {
      return this.data[key];
    }

    set(key, value) {
      this.data[key] = value;
    }

    get store() {
      return this.data;
    }
  }

  return MockStore;
});

// NOTA: este spec usa o @marrone/database REAL (via o symlink do workspace), não um mock.
// A lógica da capacidade é testada no próprio pacote (tests/sandboxCapability.spec.ts);
// aqui verificamos o que é exclusivo do APP — a fonte de credencial ser o cofre do sistema.
const {
  createDatabaseCapability,
  databaseFactoryForBru,
  vaultCredentialProvider,
  credentialsStore,
  redactParameters,
  REDACTED
} = require('../../src/services/database');

describe('vaultCredentialProvider — origem da credencial no app', () => {
  beforeEach(() => {
    credentialsStore.deleteCredentials('postgres');
    credentialsStore.deleteCredentials('oracle');
  });

  test('devolve o que está no cofre', () => {
    credentialsStore.setCredentials('postgres', { username: 'joao', password: 'segredo' });

    expect(vaultCredentialProvider.getCredentials('postgres')).toEqual({
      username: 'joao',
      password: 'segredo'
    });
  });

  test('devolve null quando o SGBD não tem credencial', () => {
    expect(vaultCredentialProvider.getCredentials('oracle')).toBeNull();
  });

  test('a dica manda o usuário para Settings > Database', () => {
    expect(vaultCredentialProvider.credentialsHint('postgres')).toMatch(/Settings > Database/);
  });
});

describe('createDatabaseCapability — app', () => {
  beforeEach(() => {
    credentialsStore.deleteCredentials('postgres');
    credentialsStore.deleteCredentials('oracle');
  });

  test('expõe a API bru.db completa', () => {
    const capability = createDatabaseCapability();

    for (const method of ['connect', 'query', 'execute', 'disconnect', 'begin', 'commit', 'rollback', 'closeAll']) {
      expect(typeof capability[method]).toBe('function');
    }
  });

  test('sem credencial no cofre, connect explica onde cadastrar (não vaza detalhe interno)', async () => {
    const capability = createDatabaseCapability();

    await expect(capability.connect('oracle', 'oracle://localhost:1521/mydb')).rejects.toThrow(
      /Settings > Database/
    );
  });

  // Teste ponta a ponta pelo pacote REAL: provider do cofre → dbConnect → driver.
  //
  // A asserção é "o erro DEIXOU de ser de credencial", que vale nos DOIS estados: com o driver
  // instalado (ECONNREFUSED) e sem ele (DRIVER_NOT_INSTALLED). A versão anterior afirmava
  // DRIVER_NOT_INSTALLED e quebrou no momento em que o npm install instalou os drivers.
  test('com credencial no cofre, o erro deixa de ser de credencial (cadeia completa, sem mock)', async () => {
    credentialsStore.setCredentials('oracle', { username: 'u', password: 'p' });

    const capability = createDatabaseCapability();

    try {
      await capability.connect('oracle', 'oracle://localhost:1521/mydb');
      // Nada escutando em 1521: chegar aqui sem erro seria inesperado.
    } catch (err) {
      // Se o cofre não tivesse fornecido a credencial, viria a dica de configuração.
      expect(err.message).not.toMatch(/Settings > Database/);
    }
  });

  test('databaseFactoryForBru entrega o objeto esperado ao runtime do sandbox', () => {
    const recorded = [];
    const capability = databaseFactoryForBru((entry) => recorded.push(entry));

    expect(typeof capability.connect).toBe('function');
    expect(typeof capability.query).toBe('function');
    expect(capability.openConnectionCount()).toBe(0);
  });

  test('redactParameters é reexportado e redige por padrão', () => {
    expect(redactParameters(['segredo'])).toEqual([REDACTED]);
    expect(REDACTED).toBe('***');
  });
});
