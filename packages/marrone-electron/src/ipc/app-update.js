const { ipcMain, shell, app } = require('electron');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

const REPO = 'ThiagoGomesRocha/Marrone';
const LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const INSTALLER_PATTERN = /^marrone-setup-.+\.exe$/;
// Só baixamos de hosts do GitHub: o link vem da API, então não confiamos nele às cegas.
const ALLOWED_DOWNLOAD_HOSTS = ['github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com'];

const parseVersion = (value) => {
  const clean = String(value || '').trim().replace(/^v/, '');
  const [core, pre = null] = clean.split(/-(.+)/);
  const nums = core.split('.').map((n) => parseInt(n, 10) || 0);
  while (nums.length < 3) nums.push(0);
  return { nums, pre };
};

/**
 * Compara duas versões no formato X.Y.Z[-rc.N]. Retorna >0 se a é mais nova, <0 se é mais
 * antiga, 0 se são iguais. Versão estável vence a RC de mesmo número (1.3.0 > 1.3.0-rc.3).
 */
const compareVersions = (a, b) => {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  for (let i = 0; i < 3; i += 1) {
    if (va.nums[i] !== vb.nums[i]) return va.nums[i] - vb.nums[i];
  }
  if (va.pre === vb.pre) return 0;
  if (va.pre === null) return 1;
  if (vb.pre === null) return -1;
  return va.pre < vb.pre ? -1 : 1;
};

const pickInstaller = (assets = []) => {
  const asset = assets.find((a) => INSTALLER_PATTERN.test(a.name));
  if (!asset) return null;
  return { name: asset.name, url: asset.browser_download_url, size: asset.size };
};

/**
 * Consulta a última release STABLE. O endpoint /releases/latest já ignora pré-releases e rascunhos.
 */
const fetchLatestStableRelease = async () => {
  const res = await fetch(LATEST_URL, {
    headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'marrone-app' }
  });
  if (res.status === 404) return null; // nenhuma release stable publicada ainda
  if (!res.ok) throw new Error(`GitHub respondeu ${res.status} ao buscar a release`);
  const body = await res.json();
  return {
    version: String(body.tag_name || '').replace(/^v/, ''),
    htmlUrl: body.html_url,
    changelog: body.body || '',
    publishedAt: body.published_at || null,
    installer: pickInstaller(body.assets)
  };
};

/** Verifica se há uma release stable mais nova que a versão instalada. */
const checkForUpdate = async (currentVersion) => {
  try {
    const latest = await fetchLatestStableRelease();
    if (!latest || compareVersions(latest.version, currentVersion) <= 0) {
      return { updateAvailable: false, currentVersion };
    }
    return { updateAvailable: true, currentVersion, ...latest };
  } catch (err) {
    // Falha de rede não pode atrapalhar o app: o renderer ignora o erro.
    return { updateAvailable: false, currentVersion, error: err.message };
  }
};

const isAllowedDownloadUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ALLOWED_DOWNLOAD_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
  } catch (_err) {
    return false;
  }
};

// Nome livre na pasta de destino: marrone-setup.exe, marrone-setup (1).exe, ...
const uniqueDestination = (dir, fileName) => {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let dest = path.join(dir, fileName);
  let n = 1;
  while (fs.existsSync(dest)) {
    dest = path.join(dir, `${base} (${n})${ext}`);
    n += 1;
  }
  return dest;
};

/** Baixa o instalador para a pasta Downloads do usuário (só quando ele clicar). */
const downloadInstaller = async ({ url, name }) => {
  if (!isAllowedDownloadUrl(url)) {
    throw new Error('Endereço de download não permitido');
  }
  if (!INSTALLER_PATTERN.test(name || '')) {
    throw new Error('Nome de arquivo inesperado para o instalador');
  }
  const res = await fetch(url, { headers: { 'User-Agent': 'marrone-app' }, redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`Falha no download (${res.status})`);
  }
  const dest = uniqueDestination(app.getPath('downloads'), name);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
  return { path: dest };
};

const registerAppUpdateIpc = () => {
  ipcMain.handle('renderer:check-app-update', (event, currentVersion) => checkForUpdate(currentVersion));
  ipcMain.handle('renderer:download-app-update', (event, payload) => downloadInstaller(payload || {}));
  ipcMain.handle('renderer:show-item-in-folder', (event, filePath) => {
    if (typeof filePath !== 'string' || !fs.existsSync(filePath)) return false;
    shell.showItemInFolder(filePath);
    return true;
  });
};

module.exports = registerAppUpdateIpc;
module.exports.compareVersions = compareVersions;
module.exports.pickInstaller = pickInstaller;
module.exports.fetchLatestStableRelease = fetchLatestStableRelease;
module.exports.checkForUpdate = checkForUpdate;
module.exports.isAllowedDownloadUrl = isAllowedDownloadUrl;
module.exports.downloadInstaller = downloadInstaller;
