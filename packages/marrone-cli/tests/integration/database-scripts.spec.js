const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

/**
 * Ponta a ponta pelo BINÁRIO do CLI: um script de pré-requisição de verdade chamando `bru.db`.
 *
 * Isto exercita a cadeia completa:
 *   bin/marrone.js → runner → ScriptRuntime(databaseFactory) → Bru.db →
 *   shim do QuickJS → capacidade do host → provider de ambiente → @marrone/database
 *
 * Sem banco instalado e sem servidor de banco: o que se prova aqui é que a ponte existe,
 * que as funções chegam ao script, e que a credencial é procurada no AMBIENTE.
 */

const CLI_BIN = path.resolve(__dirname, '..', '..', 'bin', 'marrone.js');

const writeFixtureFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

/**
 * ATENÇÃO ao escrever script dentro de um bloco `script:pre-request { ... }` do formato .bru:
 * uma linha que COMEÇA com `}` fecha o bloco antecipadamente. Por isso este script usa
 * encadeamento de promises em vez de try/catch — as chaves ficam todas dentro da linha.
 */
const PRE_REQUEST_SCRIPT = `console.log('DB_CHAIN:' + typeof bru.db.connect);
await bru.db
  .connect('postgres', 'postgres://localhost:5432/mydb')
  .then(function () { console.log('DB_CONNECT:unexpected-success'); })
  .catch(function (err) { console.log('DB_ERROR:' + (err && err.message)); });`;

describe('CLI run - bru.db disponível nos scripts', () => {
  let server;
  let baseUrl;
  let tmpDir;

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-db-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /**
   * O ambiente do filho começa limpo das variáveis de banco, para que o teste controle
   * exatamente o que o CLI enxerga.
   */
  const runCli = (args, extraEnv = {}) =>
    new Promise((resolve, reject) => {
      const childEnv = { ...process.env };

      for (const name of Object.keys(childEnv)) {
        if (name.startsWith('MARRONE_DB_')) {
          delete childEnv[name];
        }
      }

      Object.assign(childEnv, extraEnv);

      const child = spawn(process.execPath, [CLI_BIN, ...args], { cwd: tmpDir, env: childEnv });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, stdout, stderr }));
    });

  const seedCollection = () => {
    writeFixtureFile(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'db-cli', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(path.join(tmpDir, 'collection.bru'), 'meta {\n  name: db-cli\n  seq: 1\n}\n');
    writeFixtureFile(
      path.join(tmpDir, 'ping.bru'),
      `meta {\n  name: ping\n  type: http\n  seq: 1\n}\n\nget {\n  url: ${baseUrl}/ping\n  body: none\n  auth: none\n}\n\nscript:pre-request {\n${PRE_REQUEST_SCRIPT}\n}\n`
    );
  };

  const expectRunOk = (result) => {
    if (result.code !== 0) {
      throw new Error(
        `CLI saiu com código ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }
  };

  it('expõe bru.db.connect ao script no sandbox safe (QuickJS)', async () => {
    seedCollection();

    const result = await runCli(['run', 'ping.bru', '--sandbox', 'safe', '--noproxy']);
    expectRunOk(result);

    const output = `${result.stdout}\n${result.stderr}`;

    // A ponte chegou ao script: bru.db.connect é uma função.
    expect(output).toContain('DB_CHAIN:function');
    // e não "undefined" — que é o que apareceria se o shim não fosse injetado.
    expect(output).not.toContain('DB_CHAIN:undefined');
  }, 90_000);

  it('sem variáveis de ambiente, o script recebe a instrução exata de quais definir', async () => {
    seedCollection();

    const result = await runCli(['run', 'ping.bru', '--sandbox', 'safe', '--noproxy']);
    expectRunOk(result);

    const output = `${result.stdout}\n${result.stderr}`;

    expect(output).toContain('DB_ERROR:');
    expect(output).toContain('MARRONE_DB_POSTGRES_USER');
    expect(output).toContain('MARRONE_DB_POSTGRES_PASSWORD');
    // A mensagem do CLI não deve mandar o usuário para a UI do app.
    expect(output).not.toContain('Settings > Database');
  }, 90_000);

  // A prova de que a variável de ambiente REALMENTE alimenta a conexão: com ela definida,
  // o erro deixa de ser "faltam credenciais".
  it('com MARRONE_DB_POSTGRES_* definidas, o erro deixa de ser de credencial', async () => {
    seedCollection();

    const result = await runCli(['run', 'ping.bru', '--sandbox', 'safe', '--noproxy'], {
      MARRONE_DB_POSTGRES_USER: 'joao',
      MARRONE_DB_POSTGRES_PASSWORD: 'segredo'
    });
    expectRunOk(result);

    const output = `${result.stdout}\n${result.stderr}`;

    expect(output).toContain('DB_ERROR:');
    // O texto do erro depende de o driver estar instalado (ECONNREFUSED com o pg instalado,
    // DRIVER_NOT_INSTALLED sem ele), então não se asserta o texto — e sim que a mensagem NÃO é
    // mais a de credencial ausente. É isso que prova que a variável de ambiente foi usada.
    expect(output).not.toContain('MARRONE_DB_POSTGRES_USER');
  }, 90_000);
});
