const { describe, test, expect, beforeEach } = require('@jest/globals');

// electron-store em memoria: o que importa aqui e a logica de cifragem e a forma
// do que vai para o disco, nao o arquivo em si.
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

const DatabaseCredentialsStore = require('../../src/store/database-credentials');

describe('DatabaseCredentialsStore — cofre de credenciais (P5)', () => {
  let store;

  beforeEach(() => {
    store = new DatabaseCredentialsStore();
  });

  test('grava e lê as credenciais de volta em claro', () => {
    store.setCredentials('postgres', { username: 'joao', password: 'segredo' });

    expect(store.getCredentials('postgres')).toEqual({ username: 'joao', password: 'segredo' });
  });

  // Este e o teste que prova a decisao D4 / RF01.
  test('a senha NUNCA é gravada em texto plano no armazenamento', () => {
    store.setCredentials('postgres', { username: 'joao', password: 'minha-senha-secreta' });

    const raw = JSON.stringify(store.store.store);

    expect(raw).not.toContain('minha-senha-secreta');
    // E o valor gravado esta marcado como cifrado ($00: = safeStorage, $01: = AES-256).
    expect(store.store.store.credentials.postgres.password).toMatch(/^\$0[01]:/);
    expect(store.store.store.credentials.postgres.username).toMatch(/^\$0[01]:/);
  });

  test('listCredentials NUNCA devolve a senha (é o que a UI consome)', () => {
    store.setCredentials('postgres', { username: 'joao', password: 'segredo' });
    store.setCredentials('mysql', { username: 'maria', password: '' });

    const list = store.listCredentials();
    const serialized = JSON.stringify(list);

    expect(serialized).not.toContain('segredo');
    expect(list).toEqual([
      { sgbdId: 'postgres', username: 'joao', hasPassword: true },
      { sgbdId: 'mysql', username: 'maria', hasPassword: false }
    ]);
  });

  test('cada SGBD tem seu próprio registro, sem vazamento entre eles', () => {
    store.setCredentials('postgres', { username: 'pg_user', password: 'pg_pass' });
    store.setCredentials('db2', { username: 'db2_user', password: 'db2_pass' });

    expect(store.getCredentials('postgres')).toEqual({ username: 'pg_user', password: 'pg_pass' });
    expect(store.getCredentials('db2')).toEqual({ username: 'db2_user', password: 'db2_pass' });
  });

  test('SGBD sem credencial devolve null (e listCredentials não o inclui)', () => {
    expect(store.getCredentials('oracle')).toBeNull();
    expect(store.listCredentials()).toEqual([]);
    expect(store.hasCredentials('oracle')).toBe(false);
  });

  test('deleteCredentials remove o registro', () => {
    store.setCredentials('postgres', { username: 'joao', password: 'segredo' });

    expect(store.deleteCredentials('postgres')).toBe(true);
    expect(store.getCredentials('postgres')).toBeNull();
    expect(store.deleteCredentials('postgres')).toBe(false);
  });

  test('regravar substitui a credencial anterior', () => {
    store.setCredentials('postgres', { username: 'joao', password: 'antiga' });
    store.setCredentials('postgres', { username: 'joao', password: 'nova' });

    expect(store.getCredentials('postgres').password).toBe('nova');
    expect(store.listCredentials()).toHaveLength(1);
  });

  test('sgbdId inválido lança erro explícito', () => {
    expect(() => store.setCredentials('', { username: 'a' })).toThrow(/sgbdId é obrigatório/);
    expect(() => store.setCredentials(null, { username: 'a' })).toThrow(/sgbdId é obrigatório/);
    expect(() => store.getCredentials(undefined)).toThrow(/sgbdId é obrigatório/);
  });

  test('o id do SGBD é normalizado (maiúsculas e espaços)', () => {
    store.setCredentials('  POSTGRES  ', { username: 'joao', password: 'segredo' });

    expect(store.getCredentials('postgres')).toEqual({ username: 'joao', password: 'segredo' });
  });

  describe('migração de credenciais em texto plano', () => {
    test('recifra o que estava em claro e não mexe no que já estava cifrado', () => {
      // Simula o formato antigo (texto plano) gravado diretamente no store.
      store.store.set('credentials', {
        postgres: { username: 'joao', password: 'texto-plano' }
      });

      const migrated = store.migratePlaintextCredentials();

      expect(migrated).toBe(1);
      expect(store.store.store.credentials.postgres.password).toMatch(/^\$0[01]:/);
      expect(JSON.stringify(store.store.store)).not.toContain('texto-plano');
      // E continua legível:
      expect(store.getCredentials('postgres')).toEqual({ username: 'joao', password: 'texto-plano' });
    });

    test('é idempotente: rodar de novo não migra nada', () => {
      store.setCredentials('postgres', { username: 'joao', password: 'segredo' });

      expect(store.migratePlaintextCredentials()).toBe(0);
      expect(store.migratePlaintextCredentials()).toBe(0);
      expect(store.getCredentials('postgres').password).toBe('segredo');
    });

    test('migra apenas os campos que estão em claro (registro misto)', () => {
      const alreadyEncrypted = store.setCredentials('mysql', {
        username: 'maria',
        password: 'ok'
      });
      expect(alreadyEncrypted.sgbdId).toBe('mysql');

      store.store.store.credentials.mysql.username = 'maria-em-claro';

      expect(store.migratePlaintextCredentials()).toBe(1);
      expect(store.getCredentials('mysql').username).toBe('maria-em-claro');
      expect(store.store.store.credentials.mysql.username).toMatch(/^\$0[01]:/);
    });
  });
});
