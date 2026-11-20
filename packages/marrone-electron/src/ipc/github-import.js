const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { findRepoRoot } = require('./git-ops');

const GITHUB_API = 'https://api.github.com';
const MAX_PAGES = 10;
const PER_PAGE = 100;

/**
 * Lista os repositórios que o token pode acessar: próprios, de colaboração e de organizações.
 * O token só vive na chamada: não é salvo, e não aparece em mensagens de erro.
 */
const listGithubRepos = async (token) => {
  const value = typeof token === 'string' ? token.trim() : '';
  if (!value) {
    throw new Error('Informe um token de acesso do GitHub');
  }

  const headers = {
    'Authorization': `Bearer ${value}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'marrone-app'
  };

  const userRes = await fetch(`${GITHUB_API}/user`, { headers });
  if (userRes.status === 401) {
    throw new Error('Token inválido ou expirado');
  }
  if (!userRes.ok) {
    throw new Error(`GitHub respondeu ${userRes.status} ao validar o token`);
  }
  const user = await userRes.json();

  const repos = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `${GITHUB_API}/user/repos?per_page=${PER_PAGE}&page=${page}&sort=updated`
      + '&affiliation=owner,collaborator,organization_member';
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`GitHub respondeu ${res.status} ao listar repositórios`);
    }
    const batch = await res.json();
    repos.push(
      ...batch.map((r) => ({
        fullName: r.full_name,
        cloneUrl: r.clone_url,
        private: Boolean(r.private),
        defaultBranch: r.default_branch,
        description: r.description || ''
      }))
    );
    if (batch.length < PER_PAGE) {
      break;
    }
  }

  return { login: user.login, repos };
};

/**
 * Diz se uma pasta é repositório Git e em qual branch está. A pasta pode ser a raiz do repo
 * ou uma subpasta dele; `root` é sempre a raiz encontrada.
 */
const inspectGitFolder = async (folderPath) => {
  if (typeof folderPath !== 'string' || !folderPath.trim()) {
    throw new Error('Escolha uma pasta');
  }
  const dir = path.resolve(folderPath);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error('A pasta não existe');
  }

  const root = findRepoRoot(dir);
  if (!root) {
    return { isRepo: false, folderPath: dir };
  }

  const head = fs.readFileSync(path.join(root, '.git', 'HEAD'), 'utf8').trim();
  const branch = head.startsWith('ref: refs/heads/') ? head.slice('ref: refs/heads/'.length) : null;
  return { isRepo: true, folderPath: dir, root, branch };
};

const registerGithubImportIpc = () => {
  ipcMain.handle('renderer:github-list-repos', (event, token) => listGithubRepos(token));
  ipcMain.handle('renderer:git-inspect-folder', (event, folderPath) => inspectGitFolder(folderPath));
};

module.exports = registerGithubImportIpc;
module.exports.listGithubRepos = listGithubRepos;
module.exports.inspectGitFolder = inspectGitFolder;
