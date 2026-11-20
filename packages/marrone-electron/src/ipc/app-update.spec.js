jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() },
  shell: { showItemInFolder: jest.fn() },
  app: { getPath: jest.fn() }
}));

const fs = require('fs');
const os = require('os');
const path = require('path');
const { ReadableStream } = require('stream/web');
const { app } = require('electron');
const updater = require('./app-update');

let downloads;
beforeAll(() => {
  downloads = fs.mkdtempSync(path.join(os.tmpdir(), 'marrone-update-'));
  app.getPath.mockReturnValue(downloads);
});
afterAll(() => fs.rmSync(downloads, { recursive: true, force: true }));
afterEach(() => { delete global.fetch; });

const jsonRes = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

const release = (over = {}) => ({
  tag_name: 'v1.3.0',
  html_url: 'https://github.com/ThiagoGomesRocha/Marrone/releases/tag/1.3.0',
  body: '## Novidades\n- aba Git',
  published_at: '2026-12-01T10:00:00Z',
  assets: [
    { name: 'latest.yml', browser_download_url: 'https://github.com/x/latest.yml', size: 10 },
    { name: 'marrone-setup-1.3.0.exe', browser_download_url: 'https://github.com/ThiagoGomesRocha/Marrone/releases/download/1.3.0/marrone-setup-1.3.0.exe', size: 142000000 }
  ],
  ...over
});

describe('compareVersions', () => {
  test.each([
    ['1.3.0', '1.3.0-rc.3', 1],
    ['1.3.0-rc.4', '1.3.0-rc.3', 1],
    ['1.2.0', '1.3.0-rc.1', -1],
    ['1.3.0', '1.3.0', 0],
    ['v1.3.0', '1.3.0', 0],
    ['2.0.0', '1.9.9', 1]
  ])('%s vs %s = sinal %i', (a, b, sign) => {
    expect(Math.sign(updater.compareVersions(a, b))).toBe(sign);
  });
});

describe('release stable', () => {
  test('lê versão, changelog, página e o instalador', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes(200, release()));
    const latest = await updater.fetchLatestStableRelease();
    expect(latest.version).toBe('1.3.0');
    expect(latest.htmlUrl).toContain('/releases/tag/1.3.0');
    expect(latest.changelog).toContain('aba Git');
    expect(latest.installer).toEqual(expect.objectContaining({ name: 'marrone-setup-1.3.0.exe', size: 142000000 }));
    expect(global.fetch.mock.calls[0][0]).toBe('https://api.github.com/repos/ThiagoGomesRocha/Marrone/releases/latest');
  });

  test('release sem instalador devolve installer null', () => {
    expect(updater.pickInstaller([{ name: 'latest.yml', browser_download_url: 'x' }])).toBeNull();
  });

  test('nenhuma release publicada (404) não é erro', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes(404, {}));
    expect(await updater.fetchLatestStableRelease()).toBeNull();
  });
});

describe('checkForUpdate', () => {
  test('versão mais nova: avisa', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes(200, release()));
    const r = await updater.checkForUpdate('1.3.0-rc.3');
    expect(r).toEqual(expect.objectContaining({ updateAvailable: true, version: '1.3.0', currentVersion: '1.3.0-rc.3' }));
  });

  test('já está na stable: não avisa', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes(200, release()));
    expect((await updater.checkForUpdate('1.3.0')).updateAvailable).toBe(false);
  });

  test('sem internet: não avisa e não lança erro', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    const r = await updater.checkForUpdate('1.3.0-rc.3');
    expect(r.updateAvailable).toBe(false);
    expect(r.error).toBe('offline');
  });
});

describe('segurança do download', () => {
  test.each([
    'http://github.com/a/marrone-setup.exe',
    'https://github.com.evil.com/a/marrone-setup.exe',
    'https://evil.com/marrone-setup.exe',
    'não é url'
  ])('recusa %s', (url) => {
    expect(updater.isAllowedDownloadUrl(url)).toBe(false);
  });

  test.each([
    'https://github.com/ThiagoGomesRocha/Marrone/releases/download/1.3.0/marrone-setup-1.3.0.exe',
    'https://objects.githubusercontent.com/abc/marrone-setup-1.3.0.exe'
  ])('aceita %s', (url) => {
    expect(updater.isAllowedDownloadUrl(url)).toBe(true);
  });

  test('recusa download de host não permitido sem chamar a rede', async () => {
    global.fetch = jest.fn();
    await expect(updater.downloadInstaller({ url: 'https://evil.com/x.exe', name: 'marrone-setup-1.3.0.exe' }))
      .rejects.toThrow('Endereço de download não permitido');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('recusa arquivo com nome fora do padrão', async () => {
    global.fetch = jest.fn();
    await expect(updater.downloadInstaller({ url: 'https://github.com/a.exe', name: 'virus.exe' }))
      .rejects.toThrow('Nome de arquivo inesperado');
  });
});

describe('downloadInstaller', () => {
  const body = () => new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('CONTEUDO-DO-INSTALADOR'));
      controller.close();
    }
  });

  test('salva na pasta Downloads e não sobrescreve arquivo existente', async () => {
    global.fetch = jest.fn().mockImplementation(async () => ({ ok: true, status: 200, body: body() }));
    const payload = { url: 'https://github.com/ThiagoGomesRocha/Marrone/releases/download/1.3.0/marrone-setup-1.3.0.exe', name: 'marrone-setup-1.3.0.exe' };

    const first = await updater.downloadInstaller(payload);
    const second = await updater.downloadInstaller(payload);

    expect(path.dirname(first.path)).toBe(downloads);
    expect(first.path).not.toBe(second.path);
    expect(path.basename(second.path)).toBe('marrone-setup-1.3.0 (1).exe');
    expect(fs.readFileSync(first.path, 'utf8')).toBe('CONTEUDO-DO-INSTALADOR');
  });
});
