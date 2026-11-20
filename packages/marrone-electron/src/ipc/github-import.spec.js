jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { listGithubRepos, inspectGitFolder } = require('./github-import');
const gitUtils = require('../utils/git');

jest.setTimeout(60000);

const TOKEN = 'ghp_TESTE_NAO_REAL_1234567890';

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
});

const repo = (i) => ({
  full_name: `org/repo-${i}`,
  clone_url: `https://github.com/org/repo-${i}.git`,
  private: i % 2 === 0,
  default_branch: 'main',
  description: null
});

let tmp;
beforeAll(() => {
  process.env.GIT_AUTHOR_NAME = 'Marrone Teste';
  process.env.GIT_AUTHOR_EMAIL = 'teste@exemplo.com';
  process.env.GIT_COMMITTER_NAME = 'Marrone Teste';
  process.env.GIT_COMMITTER_EMAIL = 'teste@exemplo.com';
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'marrone-github-'));
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));
afterEach(() => { delete global.fetch; });

describe('listGithubRepos', () => {
  test('lista os repositórios e identifica o usuário', async () => {
    global.fetch = jest.fn(async (url) => {
      if (url.endsWith('/user')) return jsonResponse(200, { login: 'ana' });
      return jsonResponse(200, [repo(1), repo(2)]);
    });

    const result = await listGithubRepos(TOKEN);

    expect(result.login).toBe('ana');
    expect(result.repos).toHaveLength(2);
    expect(result.repos[0]).toEqual({
      fullName: 'org/repo-1',
      cloneUrl: 'https://github.com/org/repo-1.git',
      private: false,
      defaultBranch: 'main',
      description: ''
    });
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  test('pagina enquanto a página vier cheia', async () => {
    const full = Array.from({ length: 100 }, (_, i) => repo(i));
    global.fetch = jest.fn(async (url) => {
      if (url.endsWith('/user')) return jsonResponse(200, { login: 'ana' });
      return /[?&]page=1&/.test(url) ? jsonResponse(200, full) : jsonResponse(200, [repo(999)]);
    });

    const result = await listGithubRepos(TOKEN);
    expect(result.repos).toHaveLength(101);
  });

  test('token inválido: mensagem clara e sem o token', async () => {
    global.fetch = jest.fn(async () => jsonResponse(401, { message: 'Bad credentials' }));
    const err = await listGithubRepos(TOKEN).catch((e) => e);
    expect(err.message).toBe('Token inválido ou expirado');
    expect(err.message).not.toContain(TOKEN);
  });

  test('token vazio é recusado sem chamar a rede', async () => {
    global.fetch = jest.fn();
    await expect(listGithubRepos('   ')).rejects.toThrow('Informe um token');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('inspectGitFolder', () => {
  test('pasta sem Git', async () => {
    const dir = path.join(tmp, 'sem-git');
    fs.mkdirSync(dir, { recursive: true });
    const r = await inspectGitFolder(dir);
    expect(r.isRepo).toBe(false);
  });

  test('raiz de repositório mostra a branch atual', async () => {
    const dir = path.join(tmp, 'com-git');
    fs.mkdirSync(dir, { recursive: true });
    execFileSync('git', ['init', '-q', '-b', 'feature/x'], { cwd: dir });
    const r = await inspectGitFolder(dir);
    expect(r).toMatchObject({ isRepo: true, root: path.resolve(dir), branch: 'feature/x' });
  });

  test('subpasta de repositório aponta para a raiz', async () => {
    const dir = path.join(tmp, 'com-git');
    const sub = path.join(dir, 'colecoes', 'api');
    fs.mkdirSync(sub, { recursive: true });
    const r = await inspectGitFolder(sub);
    expect(r.root).toBe(path.resolve(dir));
  });

  test('pasta inexistente é recusada', async () => {
    await expect(inspectGitFolder(path.join(tmp, 'nao-existe'))).rejects.toThrow('A pasta não existe');
  });
});

describe('clone autenticado', () => {
  test('clona com token sem gravar o token no .git/config', async () => {
    const bare = path.join(tmp, 'remoto.git');
    execFileSync('git', ['init', '--bare', '-q', bare]);
    // HEAD do remoto precisa apontar para main (o padrão é master) para o clone trazer arquivos.
    execFileSync('git', ['symbolic-ref', 'HEAD', 'refs/heads/main'], { cwd: bare });
    const seed = path.join(tmp, 'seed');
    fs.mkdirSync(seed, { recursive: true });
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: seed });
    fs.writeFileSync(path.join(seed, 'a.bru'), 'a\n');
    execFileSync('git', ['add', '.'], { cwd: seed });
    execFileSync('git', ['commit', '-q', '-m', 'inicial'], { cwd: seed });
    execFileSync('git', ['push', '-q', bare, 'main'], { cwd: seed });

    const dest = path.join(tmp, 'clone-autenticado');
    const win = { webContents: { send: () => {} } };
    await gitUtils.cloneGitRepository(win, { url: bare, path: dest, processUid: 'p1', authToken: TOKEN });

    expect(fs.existsSync(path.join(dest, 'a.bru'))).toBe(true);
    const config = fs.readFileSync(path.join(dest, '.git', 'config'), 'utf8');
    expect(config).not.toContain(TOKEN);
    expect(config).not.toMatch(/extraheader/i);
  });

  test('erro de clone não expõe o token', () => {
    expect(gitUtils.redact(`falhou com ${TOKEN} no caminho`, TOKEN)).toBe('falhou com *** no caminho');
    expect(gitUtils.redact('sem token', undefined)).toBe('sem token');
  });
});
