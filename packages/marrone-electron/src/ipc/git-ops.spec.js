// Testes de integração com Git real: repositórios temporários e um remote bare local.
// Não mocka o Git. Só o `electron` (ipcMain) e a janela (win.webContents.send).
jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { createGitOpsHandlers, findRepoRoot } = require('./git-ops');

// Windows grava CRLF no checkout; normaliza para comparar o conteúdo lógico.
const readText = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

const win = { webContents: { send: jest.fn() } };
const ops = createGitOpsHandlers(win);

let tmp;
const newDir = (name) => {
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

beforeAll(() => {
  process.env.GIT_AUTHOR_NAME = 'Marrone Teste';
  process.env.GIT_AUTHOR_EMAIL = 'teste@exemplo.com';
  process.env.GIT_COMMITTER_NAME = 'Marrone Teste';
  process.env.GIT_COMMITTER_EMAIL = 'teste@exemplo.com';
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'marrone-git-ops-'));
});

afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('git-ops: sem repositório', () => {
  test('status de pasta comum diz que não é repositório', async () => {
    const dir = newDir('sem-git');
    const status = await ops.status(dir);
    expect(status.isRepo).toBe(false);
  });

  test('operações exigem repositório', async () => {
    const dir = newDir('sem-git-2');
    await expect(ops.commit(dir, 'msg')).rejects.toThrow('não está em um repositório');
  });

  test('findRepoRoot sobe até achar .git', () => {
    const root = newDir('achar-raiz');
    fs.mkdirSync(path.join(root, '.git'));
    const deep = newDir('achar-raiz/a/b');
    expect(findRepoRoot(deep)).toBe(path.resolve(root));
  });
});

describe('git-ops: ciclo local', () => {
  let coll;

  beforeAll(async () => {
    coll = newDir('colecao');
    await ops.init(coll);
  });

  test('init cria repositório na branch main sem commits', async () => {
    const status = await ops.status(coll);
    expect(status.isRepo).toBe(true);
    expect(status.branch).toBe('main');
    expect(status.hasCommits).toBe(false);
  });

  test('init de pasta que já é repositório falha', async () => {
    await expect(ops.init(coll)).rejects.toThrow('já é um repositório');
  });

  test('arquivo novo aparece como alteração não staged', async () => {
    fs.writeFileSync(path.join(coll, 'login.bru'), 'meta { name: login }\n');
    const status = await ops.status(coll);
    expect(status.unstaged.map((f) => f.path)).toContain('login.bru');
  });

  test('stage move o arquivo para staged', async () => {
    const status = await ops.stage(coll, ['login.bru']);
    expect(status.staged.map((f) => f.path)).toContain('login.bru');
    expect(status.unstaged.map((f) => f.path)).not.toContain('login.bru');
  });

  test('commit sem mensagem é recusado', async () => {
    await expect(ops.commit(coll, '   ')).rejects.toThrow('obrigatória');
  });

  test('commit registra o arquivo e limpa as alterações', async () => {
    const status = await ops.commit(coll, 'Adiciona login');
    expect(status.hasCommits).toBe(true);
    expect(status.staged).toEqual([]);
    expect(git(coll, ['log', '-1', '--format=%s'])).toBe('Adiciona login');
  });

  test('descartar alteração restaura o arquivo commitado', async () => {
    fs.writeFileSync(path.join(coll, 'login.bru'), 'alterado\n');
    await ops.discard(coll, ['login.bru']);
    expect(readText(path.join(coll, 'login.bru'))).toBe('meta { name: login }\n');
  });

  test('criar branch e voltar para main', async () => {
    let status = await ops.checkout(coll, 'feature/x', true);
    expect(status.branch).toBe('feature/x');
    expect(status.branches).toEqual(expect.arrayContaining(['main', 'feature/x']));

    status = await ops.checkout(coll, 'main', false);
    expect(status.branch).toBe('main');
  });

  test('adicionar e remover remote', async () => {
    let status = await ops.addRemote(coll, 'origin', 'https://exemplo.com/repo.git');
    expect(status.remotes).toEqual([{ name: 'origin', url: 'https://exemplo.com/repo.git' }]);

    status = await ops.removeRemote(coll, 'origin');
    expect(status.remotes).toEqual([]);
  });

  test('stash guarda a alteração, aplica de volta e apaga', async () => {
    fs.writeFileSync(path.join(coll, 'login.bru'), 'wip\n');
    let status = await ops.stashCreate(coll, 'trabalho em andamento');
    expect(status.stashes).toHaveLength(1);
    expect(readText(path.join(coll, 'login.bru'))).toBe('meta { name: login }\n');

    status = await ops.stashApply(coll, 0);
    expect(readText(path.join(coll, 'login.bru'))).toBe('wip\n');

    await ops.discard(coll, ['login.bru']);
    status = await ops.stashDrop(coll, 0);
    expect(status.stashes).toEqual([]);
  });
});

describe('git-ops: push, pull e publicar', () => {
  test('push envia a branch para o remote e cria upstream', async () => {
    const bare = newDir('remoto-bare.git');
    git(bare, ['init', '--bare', '-q']);

    const coll = newDir('colecao-push');
    await ops.init(coll);
    fs.writeFileSync(path.join(coll, 'a.bru'), 'a\n');
    await ops.stage(coll, ['a.bru']);
    await ops.commit(coll, 'primeiro');
    await ops.addRemote(coll, 'origin', bare);

    await ops.push(coll, 'origin', 'main');

    expect(git(bare, ['branch', '--list', 'main'])).toContain('main');
    const status = await ops.status(coll);
    expect(status.tracking).toBe('origin/main');
    expect(status.ahead).toBe(0);
  });

  test('publicar cria o repositório, o remote e envia a coleção', async () => {
    const bare = newDir('remoto-publicar.git');
    git(bare, ['init', '--bare', '-q']);

    const coll = newDir('colecao-publicar');
    fs.writeFileSync(path.join(coll, 'novo.bru'), 'novo\n');

    const status = await ops.publish(coll, bare);
    expect(status.isRepo).toBe(true);
    expect(status.remotes.map((r) => r.name)).toEqual(['origin']);
    expect(status.hasCommits).toBe(true);
    expect(git(bare, ['branch', '--list', 'main'])).toContain('main');
    expect(git(bare, ['ls-tree', '--name-only', 'main'])).toContain('novo.bru');
  });

  test('publicar de repositório já existente reaproveita o remote', async () => {
    const bare = newDir('remoto-existente.git');
    git(bare, ['init', '--bare', '-q']);

    const coll = newDir('colecao-existente');
    await ops.init(coll);
    fs.writeFileSync(path.join(coll, 'x.bru'), 'x\n');
    await ops.publish(coll, bare);

    const again = await ops.publish(coll, bare);
    expect(again.remotes).toHaveLength(1);
  });
});

describe('git-ops: conflito de merge', () => {
  let coll;
  let n = 0;

  beforeAll(async () => {
    coll = newDir('colecao-conflito');
    await ops.init(coll);
    fs.writeFileSync(path.join(coll, 'req.bru'), 'url: base\n');
    await ops.stage(coll, ['req.bru']);
    await ops.commit(coll, 'base');
  });

  // Cria uma branch com mudança na mesma linha da main e tenta o merge.
  // Cada chamada usa nomes novos, porque um merge já concluído deixa de conflitar.
  const conflictOn = async () => {
    n += 1;
    const branch = `lado-${n}`;
    await ops.checkout(coll, 'main', false);
    await ops.checkout(coll, branch, true);
    fs.writeFileSync(path.join(coll, 'req.bru'), `url: ${branch}\n`);
    await ops.stage(coll, ['req.bru']);
    await ops.commit(coll, `muda em ${branch}`);

    await ops.checkout(coll, 'main', false);
    fs.writeFileSync(path.join(coll, 'req.bru'), `url: main-${n}\n`);
    await ops.stage(coll, ['req.bru']);
    await ops.commit(coll, `muda na main ${n}`);

    try {
      git(coll, ['merge', branch]);
    } catch (err) {
      // esperado: o merge para com conflito
    }
  };

  test('merge com conflito aparece na lista de conflitos', async () => {
    await conflictOn();
    const status = await ops.status(coll);
    expect(status.mergeInProgress).toBe(true);
    expect(status.conflicted.map((f) => f.path)).toEqual(['req.bru']);
  });

  test('resolver pelo lado "ours" limpa o conflito e mantém a versão da main', async () => {
    const status = await ops.resolveConflict(coll, 'req.bru', 'ours');
    expect(status.conflicted).toEqual([]);
    expect(readText(path.join(coll, 'req.bru'))).toBe(`url: main-${n}\n`);
  });

  test('concluir o merge cria o commit de merge', async () => {
    const status = await ops.completeMerge(coll, `Merge lado-${n}`);
    expect(status.mergeInProgress).toBe(false);
    expect(git(coll, ['log', '-1', '--format=%s'])).toBe(`Merge lado-${n}`);
  });

  test('concluir sem merge em andamento é recusado', async () => {
    await expect(ops.completeMerge(coll, 'x')).rejects.toThrow('Não há merge em andamento');
  });

  test('resolver pelo lado "theirs" usa a versão da branch que está entrando', async () => {
    await conflictOn();
    const status = await ops.resolveConflict(coll, 'req.bru', 'theirs');
    expect(status.conflicted).toEqual([]);
    expect(readText(path.join(coll, 'req.bru'))).toBe(`url: lado-${n}\n`);
    await ops.abortMerge(coll);
  });

  test('abortar merge volta ao estado anterior', async () => {
    await conflictOn();
    expect((await ops.status(coll)).mergeInProgress).toBe(true);

    const status = await ops.abortMerge(coll);
    expect(status.mergeInProgress).toBe(false);
    expect(status.conflicted).toEqual([]);
  });

  test('lado inválido de resolução é recusado', async () => {
    await conflictOn();
    await expect(ops.resolveConflict(coll, 'req.bru', 'meio')).rejects.toThrow('Lado inválido');
    await ops.abortMerge(coll);
  });
});
