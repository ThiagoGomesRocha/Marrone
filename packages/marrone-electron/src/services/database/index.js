/**
 * Capacidade de banco do APP (processo main do Electron).
 *
 * Este arquivo é FINO de propósito: a lógica comum (redação de segredos, resumo de
 * resultado, ciclo de vida das conexões, passos de transação) vive em
 * `@marrone/database` → `createSandboxCapability`, compartilhada com o CLI.
 *
 * O que é exclusivo do app e mora aqui: a ORIGEM DA CREDENCIAL — o cofre do sistema
 * operacional (electron `safeStorage`), via DatabaseCredentialsStore.
 */

const DatabaseCredentialsStore = require('../../store/database-credentials');

// Efeito colateral necessário, e na ordem certa: define IBM_DB_HOME antes de qualquer driver
// ser carregado, senão o DB2 quebra no aplicativo empacotado. Ver o cabeçalho do módulo.
require('../../utils/db2-packaged-env');

const credentialsStore = new DatabaseCredentialsStore();

let marroneDatabase = null;

/**
 * Carrega @marrone/database de forma tardia.
 *
 * Por que tardio: se o pacote ainda não foi construído (`npm run build` em
 * packages/marrone-database), o app continua subindo e o erro só aparece quando alguém
 * usa o banco — com mensagem acionável, em vez de um stack trace no boot.
 */
const loadDatabasePackage = () => {
  if (marroneDatabase) {
    return marroneDatabase;
  }

  try {
    marroneDatabase = require('@marrone/database');
  } catch (err) {
    throw new Error(
      'O pacote @marrone/database não pôde ser carregado. Rode `npm install` na raiz do '
      + 'monorepo (para criar o link do workspace) e `npm run build` em packages/marrone-database. '
      + `Causa: ${err.message}`
    );
  }

  return marroneDatabase;
};

/** Fonte de credencial do app: o cofre do sistema. */
const vaultCredentialProvider = {
  getCredentials(sgbdId) {
    return credentialsStore.getCredentials(sgbdId);
  },

  credentialsHint() {
    return (
      'Abra Settings > Database e cadastre usuário e senha. A senha fica no cofre do '
      + 'sistema operacional — ela nunca é gravada no arquivo da coleção, no git nem no relatório.'
    );
  }
};

/** Cria o objeto `bru.db` do app. */
const createDatabaseCapability = (options = {}) =>
  loadDatabasePackage().createSandboxCapability({
    credentialsProvider: vaultCredentialProvider,
    ...options
  });

/** Adaptador usado na construção dos runtimes: o Bru chama databaseFactory(record). */
const databaseFactoryForBru = (record) => createDatabaseCapability({ record });

/** Fecha todas as conexões do pacote. Chamar no shutdown do app. */
const closeAllDatabaseConnections = async () => {
  if (!marroneDatabase) {
    return;
  }

  try {
    await marroneDatabase.closeAllConnections();
  } catch (err) {
    console.error('Erro ao fechar conexões de banco no shutdown:', err.message);
  }
};

module.exports = {
  createDatabaseCapability,
  databaseFactoryForBru,
  closeAllDatabaseConnections,
  credentialsStore,
  vaultCredentialProvider,
  // Reexportado para conveniência dos testes e de outros pontos do main process.
  get redactParameters() {
    return loadDatabasePackage().redactParameters;
  },
  get REDACTED() {
    return loadDatabasePackage().REDACTED;
  }
};
