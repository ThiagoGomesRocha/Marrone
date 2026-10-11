const { ipcMain } = require('electron');
const { credentialsStore } = require('../services/database');

/**
 * IPC da feature de banco de dados.
 *
 * O renderer NUNCA importa @marrone/database nem fala com safeStorage — ele não tem
 * acesso a nenhum dos dois. Tudo passa por aqui.
 *
 * REGRA DE OURO: nenhum handler devolve senha ao renderer. `list` devolve apenas
 * `hasPassword`. A senha só é lida no main process, no momento de abrir a conexão.
 */

const normalizeSgbdId = (sgbdId) => {
  if (typeof sgbdId !== 'string' || sgbdId.trim() === '') {
    throw new Error('sgbdId é obrigatório.');
  }

  return sgbdId.trim().toLowerCase();
};

const registerDatabaseIpc = () => {
  // Catálogo de SGBDs para a aba Settings > Database.
  // Vem do MAIN process de propósito: o renderer não pode importar @marrone/database
  // (isso arrastaria os drivers para o bundle do browser).
  ipcMain.handle('database:catalog', () => {
    try {
      const { SUPPORTED_DATABASES, SUPPORTED_DATABASE_IDS } = require('@marrone/database');
      return { ids: SUPPORTED_DATABASE_IDS, databases: SUPPORTED_DATABASES };
    } catch (err) {
      // Fallback mínimo: a aba continua renderizando mesmo antes do build do pacote.
      return {
        ids: ['mysql', 'postgres', 'mssql', 'oracle', 'db2'],
        databases: {},
        warning: `Catálogo de @marrone/database indisponível: ${err.message}`
      };
    }
  });

  // Lista o que está cadastrado. NUNCA inclui senha.
  ipcMain.handle('database:credentials:list', () => credentialsStore.listCredentials());

  ipcMain.handle('database:credentials:set', (_event, params = {}) => {
    const sgbdId = normalizeSgbdId(params.sgbdId);

    return credentialsStore.setCredentials(sgbdId, {
      username: params.username,
      password: params.password
    });
  });

  ipcMain.handle('database:credentials:delete', (_event, params = {}) => {
    const sgbdId = normalizeSgbdId(params.sgbdId);

    return credentialsStore.deleteCredentials(sgbdId);
  });

  ipcMain.handle('database:credentials:has', (_event, params = {}) => {
    const sgbdId = normalizeSgbdId(params.sgbdId);

    return credentialsStore.hasCredentials(sgbdId);
  });

  /**
   * Testa a conexão usando as credenciais JÁ GUARDADAS no cofre.
   *
   * A string de conexão vem da UI apenas para este teste — ela não é persistida em
   * lugar nenhum (o que fica salvo é só usuário/senha). A conexão é aberta e fechada
   * na hora, e nunca fica pendente (o pacote sempre define CONNECTTIMEOUT).
   */
  ipcMain.handle('database:test-connection', async (_event, params = {}) => {
    const sgbdId = normalizeSgbdId(params.sgbdId);

    if (typeof params.connectionString !== 'string' || params.connectionString.trim() === '') {
      return { ok: false, error: { message: 'Informe a string de conexão para testar.', code: null } };
    }

    const { createDatabaseCapability } = require('../services/database');
    const capability = createDatabaseCapability({});
    let connection = null;

    try {
      connection = await capability.connect(sgbdId, params.connectionString.trim());
      return { ok: true };
    } catch (err) {
      return { ok: false, error: { message: err.message, code: err.code ?? null } };
    } finally {
      if (connection) {
        await capability.disconnect(connection).catch(() => {});
      }
    }
  });
};

module.exports = { registerDatabaseIpc };
