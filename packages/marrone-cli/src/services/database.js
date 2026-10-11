/**
 * Capacidade de banco do CLI (`marrone run`).
 *
 * Este arquivo é FINO de propósito: a lógica comum (redação de segredos, resumo de
 * resultado, ciclo de vida das conexões, passos de transação) vive em `@marrone/database`
 * → `createSandboxCapability`, a MESMA usada pelo app.
 *
 * O que é exclusivo do CLI: a ORIGEM DA CREDENCIAL. O CLI não tem `safeStorage` (é API do
 * Electron), então as credenciais vêm de variáveis de ambiente:
 *
 *   MARRONE_DB_<SGBD>_USER
 *   MARRONE_DB_<SGBD>_PASSWORD
 *
 * Exemplos:
 *   MARRONE_DB_POSTGRES_USER=joao MARRONE_DB_POSTGRES_PASSWORD=segredo \
 *     marrone run --env Local
 *
 * Não existe variável genérica de propósito: uma credencial global seria aplicada a
 * qualquer SGBD, inclusive a um que você não pretendia conectar a partir do CI.
 */

const { createSandboxCapability, createEnvironmentCredentialProvider } = require('@marrone/database');

const credentialsProvider = createEnvironmentCredentialProvider();

/** Texto para a ajuda do comando, deixando o contrato explícito ao usuário. */
const DATABASE_CREDENTIALS_HELP
  = 'Credenciais de banco vêm do ambiente: MARRONE_DB_<SGBD>_USER e MARRONE_DB_<SGBD>_PASSWORD '
    + '(ex.: MARRONE_DB_POSTGRES_USER, MARRONE_DB_POSTGRES_PASSWORD). '
    + 'A string de conexão no script NÃO leva usuário e senha.';

let marroneDatabase = null;

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

/** Cria o objeto `bru.db` do CLI. */
const createCliDatabaseCapability = (options = {}) =>
  createSandboxCapability({ credentialsProvider, ...options });

/** Adaptador usado na construção dos runtimes: o Bru chama databaseFactory(record). */
const databaseFactoryForBru = (record) => createCliDatabaseCapability({ record });

/** Fecha todas as conexões do pacote. Chamar antes de o processo encerrar. */
const closeAllDatabaseConnections = async () => {
  try {
    await loadDatabasePackage().closeAllConnections();
  } catch (err) {
    console.error('Erro ao fechar conexões de banco:', err.message);
  }
};

module.exports = {
  createCliDatabaseCapability,
  databaseFactoryForBru,
  closeAllDatabaseConnections,
  credentialsProvider,
  DATABASE_CREDENTIALS_HELP
};
