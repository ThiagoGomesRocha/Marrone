const { ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const {
  browseDirectory,
  browseDirectories,
  browseFiles,
  normalizeAndResolvePath,
  isFile,
  isDirectory
} = require('../utils/filesystem');
const { findUniqueFolderName } = require('../utils/collection-import');

const registerFilesystemIpc = (mainWindow) => {
  ipcMain.handle('renderer:browse-directory', async (event, pathname, request) => {
    try {
      return await browseDirectory(mainWindow);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:browse-directories', async () => {
    try {
      return await browseDirectories(mainWindow);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:browse-files', async (_, filters, properties) => {
    try {
      return await browseFiles(mainWindow, filters, properties);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:browse-pac-file', async () => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'PAC Files', extensions: ['pac', 'js'] }]
    });
    if (!filePaths || filePaths.length === 0) return null;
    return pathToFileURL(filePaths[0]).href;
  });

  ipcMain.handle('renderer:exists-sync', async (_, filePath) => {
    try {
      const normalizedPath = normalizeAndResolvePath(filePath);
      return isFile(normalizedPath);
    } catch (error) {
      return false;
    }
  });

  ipcMain.handle('renderer:resolve-path', async (_, relativePath, basePath) => {
    try {
      const resolvedPath = path.resolve(basePath, relativePath);
      return normalizeAndResolvePath(resolvedPath);
    } catch (error) {
      return relativePath;
    }
  });

  ipcMain.handle('renderer:is-directory', async (_, pathname) => {
    return isDirectory(pathname);
  });

  ipcMain.handle('renderer:find-unique-folder-name', async (_, baseName, location) => {
    try {
      return await findUniqueFolderName(baseName, location);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:save-report', async (_, payload) => {
    try {
      const {
        defaultDir = '',
        suggestedName = 'report',
        format = 'html',
        html = '',
        json = ''
      } = payload || {};

      const primaryExt = format === 'json' ? 'json' : 'html';
      const baseName = String(suggestedName).replace(/\.(html|json)$/i, '');
      const dialogOptions = {
        title: 'Export report',
        filters: [
          { name: 'HTML report', extensions: ['html'] },
          { name: 'JSON', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      };
      dialogOptions.defaultPath = defaultDir
        ? path.join(defaultDir, `${baseName}.${primaryExt}`)
        : `${baseName}.${primaryExt}`;

      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, dialogOptions);

      if (canceled || !filePath) {
        return { canceled: true, files: [] };
      }

      // Strip any chosen extension so "both" can write .html and .json with the same base name.
      const base = filePath.replace(/\.(html|json)$/i, '');
      const written = [];

      if (format === 'both') {
        fs.writeFileSync(`${base}.html`, html, 'utf8');
        fs.writeFileSync(`${base}.json`, json, 'utf8');
        written.push(`${base}.html`, `${base}.json`);
      } else if (format === 'json') {
        fs.writeFileSync(filePath, json, 'utf8');
        written.push(filePath);
      } else {
        fs.writeFileSync(filePath, html, 'utf8');
        written.push(filePath);
      }

      return { canceled: false, files: written };
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

module.exports = registerFilesystemIpc;
