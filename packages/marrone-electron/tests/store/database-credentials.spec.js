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

    expect(store.getCredentials('postgres')).toEqual({
      username: 'joao',
      password: 'segredo',
      // authType/domain entram no retorno (Fase 3); sem eles informados, o padrão é 'sql'.
      authType: 'sql',
      domain: ''
    });
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
      { sgbdId: 'postgres', username: 'joao', authType: 'sql', domain: '', hasPassword: true },
      { sgbdId: 'mysql', username: 'maria', authType: 'sql', domain: '', hasPassword: false }
    ]);
  });

  test('cada SGBD tem seu próprio registro, sem vazamento entre eles', () => {
    store.setCredentials('postgres', { username: 'pg_user', password: 'pg_pass' });
    store.setCredentials('db2', { username: 'db2_user', password: 'db2_pass' });

    expect(store.getCredentials('postgres')).toEqual({
      username: 'pg_user',
      password: 'pg_pass',
      authType: 'sql',
      domain: ''
    });
    expect(store.getCredentials('db2')).toEqual({
      username: 'db2_user',
      password: 'db2_pass',
      authType: 'sql',
      domain: ''
    });
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

    expect(store.getCredentials('postgres')).toEqual({
      username: 'joao',
      password: 'segredo',
      authType: 'sql',
      domain: ''
    });
  });

  describe('autenticação do Windows (Fase 3)', () => {
    test('authType \'windows\' e o domínio sobrevivem ao round-trip', () => {
      store.setCredentials('mssql', {
        username: 'joao.silva',
        password: 'segredo',
        authType: 'windows',
        domain: 'EMPRESA'
      });

      expect(store.getCredentials('mssql')).toEqual({
        username: 'joao.silva',
        password: 'segredo',
        authType: 'windows',
        domain: 'EMPRESA'
      });
      // E a UI vê o mesmo (sem senha).
      expect(store.listCredentials()).toEqual([
        { sgbdId: 'mssql', username: 'joao.silva', authType: 'windows', domain: 'EMPRESA', hasPassword: true }
      ]);
    });

    test('authType desconhecido cai para sql, não vira windows por acidente', () => {
      store.setCredentials('mssql', { username: 'joao', password: 'x', authType: 'kerberos' });

      expect(store.getCredentials('mssql').authType).toBe('sql');
    });

    test('o store persiste o domínio como recebido; quem limpa a combinação é o formulário', () => {
      // O store não descarta o domínio (não é segredo), mas normaliza authType fora de
      // 'windows' para 'sql'. O formulário é quem não ENVIA domínio quando a autenticação
      // é do banco — assim trocar o radio não deixa um domínio velho salvo.
      store.setCredentials('mssql', { username: 'joao', password: 'x', authType: 'sql', domain: 'IGNORADO' });

      const credentials = store.getCredentials('mssql');

      expect(credentials.authType).toBe('sql');
      expect(credentials.domain).toBe('IGNORADO');
    });

    test('registro gravado por versão ANTERIOR (sem os campos) cai no padrão sql', () => {
      // Simula o formato antigo: só username/password cifrados.
      store.store.set('credentials', {
        mssql: {
          username: require('../../src/utils/encryption').encryptStringSafe('joao').value,
          password: require('../../src/utils/encryption').encryptStringSafe('segredo').value
        }
      });

      const credentials = store.getCredentials('mssql');

      expect(credentials.authType).toBe('sql');
      expect(credentials.domain).toBe('');
      expect(credentials.username).toBe('joao');
    });
  });

  describe('senha ausente × senha vazia (regressão)', () => {
    // O formulário promete "deixe o campo vazio para manter a senha". Antes, qualquer
    // salvamento gravava string vazia e apagava a senha guardada em silêncio.
    test('salvar SEM o campo password preserva a senha já guardada', () => {
      store.setCredentials('mssql', { username: 'joao', password: 'senha-original' });
      store.setCredentials('mssql', { username: 'joao' });

      expect(store.getCredentials('mssql').password).toBe('senha-original');
      expect(store.hasCredentials('mssql')).toBe(true);
    });

    test('salvar com password vazia APAGA a senha (é o jeito explícito)', () => {
      store.setCredentials('mssql', { username: 'joao', password: 'senha-original' });
      store.setCredentials('mssql', { username: 'joao', password: '' });

      expect(store.getCredentials('mssql').password).toBe('');
    });
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
      expect(store.getCredentials('postgres')).toEqual({
        username: 'joao',
        password: 'texto-plano',
        authType: 'sql',
        domain: ''
      });
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
