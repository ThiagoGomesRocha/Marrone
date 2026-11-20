import { getSnippets, placeholderFor, SNIPPET_GROUPS } from './index';

// Membros reais do runtime (marrone-js). Se o runtime mudar, este spec quebra antes do usuário.
const ALLOWED_BRU = ['setVar', 'getVar', 'setEnvVar', 'getEnvVar', 'sleep', 'db'];
const ALLOWED_BRU_DB = ['connect', 'query', 'execute', 'disconnect', 'begin', 'commit', 'rollback'];
const ALLOWED_RES = ['getStatus', 'getBody', 'getHeader', 'getResponseTime'];
const ALLOWED_REQ = ['setHeader'];
const SGBDS = ['postgres', 'mysql', 'mssql', 'oracle', 'db2'];

const members = (code, pattern) => [...code.matchAll(pattern)].map((m) => m[1]);

describe('script snippets', () => {
  const all = getSnippets({ sgbdId: 'postgres' });

  test('todo snippet tem id, grupo conhecido e código', () => {
    const ids = new Set();
    all.forEach((s) => {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
      expect(Object.keys(SNIPPET_GROUPS)).toContain(s.group);
      expect(s.code.trim().length).toBeGreaterThan(0);
    });
  });

  test('todos os grupos têm pelo menos um snippet', () => {
    Object.keys(SNIPPET_GROUPS).forEach((group) => {
      expect(getSnippets({ group, sgbdId: 'postgres' }).length).toBeGreaterThan(0);
    });
  });

  test.each(SGBDS)('os snippets de banco são JavaScript válido (%s)', (sgbdId) => {
    getSnippets({ sgbdId }).forEach((s) => {
      // Compila o corpo dentro de uma async function (como o runtime faz). Só compila; não executa.
      // Usa string, para o Babel do Jest não transformar o `async` do próprio teste.
      expect(() => new Function('return (async function () {\n' + s.code + '\n});')).not.toThrow();
    });
  });

  test('usa apenas a API que existe no runtime', () => {
    all.forEach((s) => {
      expect(members(s.code, /\bbru\.([a-zA-Z]+)\b/g).filter((m) => !ALLOWED_BRU.includes(m))).toEqual([]);
      expect(members(s.code, /\bbru\.db\.([a-zA-Z]+)\b/g).filter((m) => !ALLOWED_BRU_DB.includes(m))).toEqual([]);
      expect(members(s.code, /\bres\.([a-zA-Z]+)\(/g).filter((m) => !ALLOWED_RES.includes(m))).toEqual([]);
      expect(members(s.code, /\breq\.([a-zA-Z]+)\(/g).filter((m) => !ALLOWED_REQ.includes(m))).toEqual([]);
      // Nada de `db` global, dbQuery/dbExecute ou API do Postman.
      expect(s.code).not.toMatch(/(^|[^.\w])db\.(connect|query|execute)\(/m);
      expect(s.code).not.toMatch(/\bdb(Query|Execute)\(/);
      expect(s.code).not.toMatch(/\bpm\./);
    });
  });

  test('nenhuma string de conexão tem usuário ou senha', () => {
    SGBDS.forEach((sgbdId) => {
      getSnippets({ sgbdId, group: 'db' }).forEach((s) => {
        const conn = [...s.code.matchAll(/connect\('[^']+', '([^']*)'\)/g)].map((m) => m[1]);
        conn.forEach((url) => expect(url).not.toMatch(/\/\/[^/@]+:[^/@]*@/));
      });
    });
  });

  test('placeholder SQL depende do SGBD', () => {
    expect(placeholderFor('postgres', 2)).toBe('$2');
    expect(placeholderFor('mysql', 2)).toBe('?');
    expect(placeholderFor('mssql', 2)).toBe('@p2');
    expect(placeholderFor('oracle', 2)).toBe(':2');
    expect(placeholderFor('db2', 2)).toBe('?');

    const mssql = getSnippets({ sgbdId: 'mssql', group: 'db' }).find((s) => s.id.startsWith('db-pre-insert'));
    expect(mssql.code).toContain('@p1');
    expect(mssql.code).not.toContain('$1');
  });

  test('exemplos de INSERT, UPDATE e DELETE existem para o banco', () => {
    const db = getSnippets({ sgbdId: 'postgres', group: 'db' }).map((s) => s.code).join('\n');
    expect(db).toMatch(/INSERT INTO/);
    expect(db).toMatch(/UPDATE /);
    expect(db).toMatch(/DELETE FROM/);
  });

  test('validações de banco no pre-request e no post-response', () => {
    const byId = (id) => all.find((s) => s.id.startsWith(id));
    expect(byId('db-pre-insert').group).toBe('db');
    expect(byId('db-post-validar').code).toMatch(/expect\(linha\.nome\)\.to\.equal\(corpo\.nome\)/);
  });

  test('cada snippet de banco fecha a conexão no finally', () => {
    getSnippets({ sgbdId: 'postgres', group: 'db' }).forEach((s) => {
      if (!s.code.includes('bru.db.connect')) return;
      expect(s.code).toMatch(/finally\s*\{[\s\S]*bru\.db\.disconnect\(conn\)/);
    });
  });
});
