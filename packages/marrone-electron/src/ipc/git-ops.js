const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const simpleGit = require('simple-git');
const gitUtils = require('../utils/git');

/**
 * Operações Git da coleção no estilo da versão paga: status, inicializar, stage/commit,
 * branches, remotes, push/pull/fetch, stash, resolução de conflito e publicar.
 *
 * O renderer sempre envia o CAMINHO DA COLEÇÃO. A raiz do repositório é resolvida aqui,
 * no main process, para que o renderer não consiga operar sobre um caminho arbitrário.
 */

const findRepoRoot = (startPath) => {
  let dir = path.resolve(startPath);

  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
};

const requireRepo = (collectionPath) => {
  const root = findRepoRoot(collectionPath);
  if (!root) {
    throw new Error('A coleção não está em um repositório Git. Inicialize o Git primeiro.');
  }
  return root;
};

const requireMessage = (message, label = 'Mensagem') => {
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) {
    throw new Error(`${label} é obrigatória`);
  }
  return text;
};

const HASH_RE = /^[0-9a-f]{4,40}$/i;

const requireHash = (hash) => {
  if (typeof hash !== 'string' || !HASH_RE.test(hash)) {
    throw new Error('Commit inválido');
  }
  return hash;
};

// Caminho relativo à raiz do repositório, sem '..' e sem começar com '-' (evita virar opção do git).
const requireRelPath = (file) => {
  const text = typeof file === 'string' ? file.trim() : '';
  if (!text || text.startsWith('-') || path.isAbsolute(text) || text.split(/[\\/]/).includes('..')) {
    throw new Error('Caminho de arquivo inválido');
  }
  return text.replace(/\\/g, '/');
};

const absolutePaths = (root, files) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('Nenhum arquivo selecionado');
  }
  return files.map((f) => path.join(root, f));
};

const hasCommits = async (root) => {
  try {
    await simpleGit(root).revparse(['--verify', 'HEAD']);
    return true;
  } catch (err) {
    return false;
  }
};

const getStatus = async (collectionPath) => {
  const root = findRepoRoot(collectionPath);
  if (!root) {
    return { isRepo: false, collectionPath };
  }

  const git = simpleGit(root);
  const [summary, changes, branches, remotes, stashes] = await Promise.all([
    git.status(),
    gitUtils.getChangedFilesInCollectionGit(root, collectionPath),
    gitUtils.getCollectionGitBranches(root),
    gitUtils.fetchRemotes(root),
    gitUtils.listStashes(root)
  ]);

  return {
    isRepo: true,
    gitRootPath: root,
    branch: summary.current || null,
    tracking: summary.tracking || null,
    ahead: summary.ahead || 0,
    behind: summary.behind || 0,
    hasCommits: await hasCommits(root),
    mergeInProgress: fs.existsSync(path.join(root, '.git', 'MERGE_HEAD')),
    branches,
    remotes: remotes.map((r) => ({ name: r.name, url: (r.refs && r.refs.fetch) || '' })),
    staged: changes.staged,
    unstaged: changes.unstaged,
    conflicted: changes.conflicted || [],
    tooManyFiles: changes.tooManyFiles,
    stashes
  };
};

const init = async (collectionPath) => {
  if (findRepoRoot(collectionPath) === path.resolve(collectionPath)) {
    throw new Error('A coleção já é um repositório Git');
  }
  await gitUtils.initGit(collectionPath);
  return getStatus(collectionPath);
};

const createGitOpsHandlers = (mainWindow) => {
  const processUid = () => randomUUID();

  return {
    status: (collectionPath) => getStatus(collectionPath),

    init: (collectionPath) => init(collectionPath),

    stage: async (collectionPath, files) => {
      const root = requireRepo(collectionPath);
      await gitUtils.stageChanges(root, absolutePaths(root, files));
      return getStatus(collectionPath);
    },

    unstage: async (collectionPath, files) => {
      const root = requireRepo(collectionPath);
      await gitUtils.unstageChanges(root, absolutePaths(root, files));
      return getStatus(collectionPath);
    },

    discard: async (collectionPath, files) => {
      const root = requireRepo(collectionPath);
      await gitUtils.discardChanges(root, absolutePaths(root, files));
      return getStatus(collectionPath);
    },

    commit: async (collectionPath, message) => {
      const root = requireRepo(collectionPath);
      await gitUtils.commitChanges(root, requireMessage(message, 'Mensagem do commit'));
      return getStatus(collectionPath);
    },

    checkout: async (collectionPath, branchName, shouldCreate = false) => {
      const root = requireRepo(collectionPath);
      const name = requireMessage(branchName, 'Nome da branch');
      await gitUtils.checkoutGitBranch(mainWindow, {
        gitRootPath: root,
        branchName: name,
        processUid: processUid(),
        shouldCreate: Boolean(shouldCreate)
      });
      return getStatus(collectionPath);
    },

    addRemote: async (collectionPath, name, url) => {
      const root = requireRepo(collectionPath);
      await gitUtils.addRemote({
        gitRootPath: root,
        remoteName: requireMessage(name, 'Nome do remote'),
        remoteUrl: requireMessage(url, 'URL do remote')
      });
      return getStatus(collectionPath);
    },

    removeRemote: async (collectionPath, name) => {
      const root = requireRepo(collectionPath);
      await gitUtils.removeRemote({ gitRootPath: root, remoteName: requireMessage(name, 'Nome do remote') });
      return getStatus(collectionPath);
    },

    fetch: async (collectionPath, remote = 'origin') => {
      const root = requireRepo(collectionPath);
      await gitUtils.fetchChanges(root, remote);
      return getStatus(collectionPath);
    },

    push: async (collectionPath, remote = 'origin', branch) => {
      const root = requireRepo(collectionPath);
      const current = branch || (await getStatus(collectionPath)).branch;
      await gitUtils.pushGitChanges(mainWindow, {
        gitRootPath: root,
        processUid: processUid(),
        remote,
        remoteBranch: requireMessage(current, 'Branch')
      });
      return getStatus(collectionPath);
    },

    pull: async (collectionPath, remote = 'origin', branch, strategy = '--ff-only') => {
      const root = requireRepo(collectionPath);
      const current = branch || (await getStatus(collectionPath)).branch;
      await gitUtils.pullGitChanges(mainWindow, {
        gitRootPath: root,
        processUid: processUid(),
        remote,
        remoteBranch: requireMessage(current, 'Branch'),
        strategy
      });
      return getStatus(collectionPath);
    },

    // Histórico: grafo de commits da branch atual (paginado por limite).
    history: async (collectionPath, limit = 50) => {
      const root = requireRepo(collectionPath);
      const status = await getStatus(collectionPath);
      if (!status.hasCommits) {
        return { commits: [], branches: [], hasMore: false };
      }
      const size = Math.min(Math.max(Number(limit) || 50, 1), 500);
      return gitUtils.getGitGraph(root, status.branch || 'HEAD', size);
    },

    commitFiles: async (collectionPath, hash) => {
      const root = requireRepo(collectionPath);
      return gitUtils.getCommitFiles(root, requireHash(hash));
    },

    // Diff de um arquivo no commit (comparado com o pai).
    commitDiff: async (collectionPath, hash, file) => {
      const root = requireRepo(collectionPath);
      return gitUtils.getCommitFileDiff(root, requireHash(hash), requireRelPath(file));
    },

    // Commits que tocaram um arquivo (histórico por arquivo).
    fileHistory: async (collectionPath, file) => {
      const root = requireRepo(collectionPath);
      return gitUtils.getFileGitHistory(root, requireRelPath(file));
    },

    stashFiles: async (collectionPath, index) => {
      const root = requireRepo(collectionPath);
      return gitUtils.getStashFiles(root, Number(index));
    },

    stashDiff: async (collectionPath, index, file, untracked = false) => {
      const root = requireRepo(collectionPath);
      return gitUtils.getStashFileDiff(root, Number(index), requireRelPath(file), Boolean(untracked));
    },

    stashCreate: async (collectionPath, message) => {
      const root = requireRepo(collectionPath);
      await gitUtils.createStash(root, requireMessage(message, 'Mensagem do stash'));
      return getStatus(collectionPath);
    },

    stashApply: async (collectionPath, index) => {
      const root = requireRepo(collectionPath);
      await gitUtils.applyStash(root, Number(index));
      return getStatus(collectionPath);
    },

    stashDrop: async (collectionPath, index) => {
      const root = requireRepo(collectionPath);
      await gitUtils.dropStash(root, Number(index));
      return getStatus(collectionPath);
    },

    // side: 'ours' (versão atual da branch) ou 'theirs' (versão que está sendo mesclada)
    resolveConflict: async (collectionPath, file, side) => {
      const root = requireRepo(collectionPath);
      if (side !== 'ours' && side !== 'theirs') {
        throw new Error('Lado inválido: use "ours" ou "theirs"');
      }
      const rel = requireMessage(file, 'Arquivo');
      await simpleGit(root).raw(['checkout', `--${side}`, '--', rel]);
      await gitUtils.stageChanges(root, [path.join(root, rel)]);
      return getStatus(collectionPath);
    },

    // Conclui o merge: o conteúdo de cada arquivo é o que está no disco agora.
    completeMerge: async (collectionPath, message) => {
      const root = requireRepo(collectionPath);
      const status = await getStatus(collectionPath);
      if (!status.mergeInProgress) {
        throw new Error('Não há merge em andamento');
      }
      if (status.conflicted.length) {
        throw new Error('Ainda há conflitos não resolvidos');
      }
      await gitUtils.commitChanges(root, requireMessage(message, 'Mensagem do merge'));
      return getStatus(collectionPath);
    },

    abortMerge: async (collectionPath) => {
      const root = requireRepo(collectionPath);
      await gitUtils.abortConflictResolution(root);
      return getStatus(collectionPath);
    },

    /**
     * Publicar: inicializa se preciso, cria o remote, faz o commit inicial (se necessário)
     * e envia a branch atual com upstream. É o "compartilhar com Git" da coleção.
     */
    publish: async (collectionPath, remoteUrl, remote = 'origin') => {
      const url = requireMessage(remoteUrl, 'URL do remote');
      // Só usa um repositório que esteja DENTRO da pasta da coleção. Um .git de pasta pai
      // (coleção dentro de outro repo) não pode ser tocado: o add -A entraria no repo alheio.
      const own = path.resolve(collectionPath);
      let root = fs.existsSync(path.join(own, '.git')) ? own : null;
      if (!root) {
        await init(collectionPath);
        root = own;
      }

      const existing = (await gitUtils.fetchRemotes(root)).find((r) => r.name === remote);
      if (!existing) {
        await gitUtils.addRemote({ gitRootPath: root, remoteName: remote, remoteUrl: url });
      }

      const git = simpleGit(root);
      const status = await git.status();
      const pending = status.files.length > 0;
      if (pending) {
        await git.add(['-A']);
      }
      if (!(await hasCommits(root))) {
        await git.raw(['commit', '--allow-empty', '-m', 'Initial commit']);
      } else if (pending) {
        await git.commit('Compartilha coleção via Git');
      }

      const branch = (await git.raw(['symbolic-ref', '--short', 'HEAD'])).trim();
      await gitUtils.pushGitChanges(mainWindow, {
        gitRootPath: root,
        processUid: processUid(),
        remote,
        remoteBranch: branch
      });
      return getStatus(collectionPath);
    }
  };
};

const registerGitOpsIpc = (mainWindow) => {
  const handlers = createGitOpsHandlers(mainWindow);

  Object.entries(handlers).forEach(([name, handler]) => {
    const channel = `renderer:git-${name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`;
    ipcMain.handle(channel, (event, ...args) => handler(...args));
  });
};

module.exports = registerGitOpsIpc;
module.exports.createGitOpsHandlers = createGitOpsHandlers;
module.exports.findRepoRoot = findRepoRoot;
