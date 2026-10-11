/**
 * API pública do @marrone/database.
 *
 * Consumido APENAS pelo host: packages/marrone-electron (main process) e
 * packages/marrone-cli. Nunca pelo renderer (packages/marrone-app) — os drivers não
 * podem entrar no bundle do browser.
 *
 * As funções abaixo são as mesmas que o sandbox de scripts expõe como
 * bru.db.connect / bru.db.query / bru.db.execute / bru.db.disconnect / bru.db.transaction.
 * O QuickJS NUNCA fala com os drivers: ele chama o host, que chama este módulo.
 */

import { getDatabaseById, SUPPORTED_DATABASES, SUPPORTED_DATABASE_IDS, type SgbdId } from './constants';
import {
  createSandboxCapability as createSandboxCapabilityImpl,
  type SandboxCapabilityOptions,
  type SandboxDatabaseCapability
} from './sandboxCapability';
import { formatResult, type ResultRow } from './formatResult';
import { normalizeRows } from './normalizeType';
import { DatabaseError, normalizeError } from './errors';
import { parseConnectionString } from './connectionString';
import {
  ConnectionPool,
  DEFAULT_CONNECT_TIMEOUT_MS,
  DEFAULT_IDLE_TIMEOUT_MS,
  type ConnectionPoolOptions,
  type Credentials
} from './pool';
import { getDriver, registeredDrivers } from './drivers/registry';
import type { DriverConnection } from './drivers/types';

export interface ExecuteSummary {
  affectedRows: number | null;
  rows: ResultRow | ResultRow[] | null;
}

export interface DatabaseConnection {
  readonly id: string;
  readonly sgbd: SgbdId;
  /** A string de conexão original — sem credenciais, por construção. */
  readonly connectionString: string;
  query(sql: string, params?: unknown[]): Promise<ResultRow | ResultRow[] | null>;
  execute(sql: string, params?: unknown[]): Promise<ExecuteSummary>;
  disconnect(): Promise<void>;
  transaction<T>(fn: (connection: DatabaseConnection) => Promise<T>): Promise<T>;
}

let sharedPool: ConnectionPool | null = null;

/** Substitui o pool compartilhado. Útil para configurar timeouts no bootstrap do host. */
export const configure = (options: ConnectionPoolOptions = {}): ConnectionPool => {
  const previous = sharedPool;
  const next = new ConnectionPool(options);
  sharedPool = next;

  if (previous) {
    void previous.closeAll();
  }

  return next;
};

const getPool = (): ConnectionPool => {
  if (!sharedPool) {
    sharedPool = new ConnectionPool();
  }
  return sharedPool;
};

class ConnectionHandle implements DatabaseConnection {
  public readonly id: string;

  constructor(
    public readonly sgbd: SgbdId,
    public readonly connectionString: string,
    private readonly pool: ConnectionPool,
    private readonly key: string,
    private readonly driverConnection: DriverConnection
  ) {
    this.id = key;
  }

  async query(sql: string, params: unknown[] = []): Promise<ResultRow | ResultRow[] | null> {
    // Cada driver normaliza os seus próprios erros (com mensagens específicas do SGBD),
    // mas normalizamos TAMBÉM aqui: assim a garantia de que o script sempre recebe um
    // DatabaseError não depende de cada driver lembrar de fazer isso.
    const rows = await this.normalizing(() => this.driverConnection.query(sql, params));
    return formatResult(normalizeRows(rows));
  }

  async execute(sql: string, params: unknown[] = []): Promise<ExecuteSummary> {
    const result = await this.normalizing(() => this.driverConnection.execute(sql, params));
    return {
      affectedRows: result.affectedRows,
      rows: formatResult(normalizeRows(result.rows))
    };
  }

  /** Fronteira do pacote: nada sai daqui sem ser um DatabaseError. */
  private async normalizing<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (err) {
      throw normalizeError(this.sgbd, err);
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.release(this.key);
  }

  async transaction<T>(fn: (connection: DatabaseConnection) => Promise<T>): Promise<T> {
    // Um handle que reaproveita a MESMA conexão física — é o que faz a transação valer.
    const txConnection = new ConnectionHandle(
      this.sgbd,
      this.connectionString,
      this.pool,
      this.key,
      this.driverConnection
    );

    const begin = this.driverConnection.begin;
    if (typeof begin === 'function') {
      await begin.call(this.driverConnection);
    }

    try {
      const result = await fn(txConnection);
      await this.normalizing(() => this.driverConnection.commit());
      return result;
    } catch (err) {
      try {
        await this.driverConnection.rollback();
      } catch {
        // Se o rollback falhar, o erro original é o que importa.
      }
      throw err instanceof DatabaseError ? err : normalizeError(this.sgbd, err);
    }
  }
}

export interface ConnectOptions extends Credentials, ConnectionPoolOptions {}

/**
 * Abre (ou reaproveita do cache) uma conexão.
 *
 * @param sgbd            'postgres' | 'mysql' | 'mssql' | 'oracle' | 'db2'
 * @param connectionString string SEM credenciais: 'postgres://localhost:5432/mydb'
 * @param options         usuário/senha vêm do cofre do sistema, resolvidos pelo host
 */
export const dbConnect = async (
  sgbd: string,
  connectionString: string,
  options: ConnectOptions = {}
): Promise<DatabaseConnection> => {
  const definition = getDatabaseById(sgbd);

  if (options.connectTimeoutMs !== undefined || options.idleTimeoutMs !== undefined) {
    configure({
      connectTimeoutMs: options.connectTimeoutMs,
      idleTimeoutMs: options.idleTimeoutMs
    });
  }

  const pool = getPool();
  const credentials: Credentials = { username: options.username, password: options.password };

  // Valida host/porta/database — e RECUSA credenciais embutidas na URL — antes de
  // tocar em qualquer driver. Falha cedo, com mensagem clara.
  parseConnectionString(definition.id, connectionString);

  let driverConnection: DriverConnection;
  try {
    driverConnection = await pool.acquire(definition.id, connectionString, credentials);
  } catch (err) {
    // Mesma fronteira de erro aplicada ao connect.
    throw err instanceof DatabaseError ? err : normalizeError(definition.id, err);
  }

  const key = ConnectionPool.buildKey(definition.id, connectionString, credentials);

  return new ConnectionHandle(definition.id, connectionString, pool, key, driverConnection);
};

export const dbQuery = (
  connection: DatabaseConnection,
  sql: string,
  params: unknown[] = []
): Promise<ResultRow | ResultRow[] | null> => connection.query(sql, params);

export const dbExecute = (
  connection: DatabaseConnection,
  sql: string,
  params: unknown[] = []
): Promise<ExecuteSummary> => connection.execute(sql, params);

export const dbDisconnect = (connection: DatabaseConnection): Promise<void> =>
  connection.disconnect();

export const dbTransaction = <T>(
  connection: DatabaseConnection,
  fn: (connection: DatabaseConnection) => Promise<T>
): Promise<T> => connection.transaction(fn);

/** Fecha todas as conexões. O host DEVE chamar isto antes de encerrar o processo. */
export const closeAllConnections = (): Promise<void> => getPool().closeAll();

export {
  SUPPORTED_DATABASES,
  SUPPORTED_DATABASE_IDS,
  getDatabaseById,
  formatResult,
  normalizeRows,
  DatabaseError,
  normalizeError,
  parseConnectionString,
  ConnectionPool,
  getDriver,
  registeredDrivers,
  DEFAULT_CONNECT_TIMEOUT_MS,
  DEFAULT_IDLE_TIMEOUT_MS
};

export type { SgbdId, ResultRow, Credentials, ConnectionPoolOptions, DriverConnection };

// ---------------------------------------------------------------------------------------
// Capacidade de sandbox (`bru.db`) — compartilhada pelo app (Electron) e pelo CLI.
// ---------------------------------------------------------------------------------------

/**
 * Cria o objeto exposto ao sandbox de scripts como `bru.db`.
 *
 * O que muda entre os hosts é só a ORIGEM DA CREDENCIAL:
 *   - app Electron → cofre do sistema (safeStorage)
 *   - CLI          → createEnvironmentCredentialProvider()
 *
 * O resto — redação de segredos, resumo de resultado, ciclo de vida das conexões — é o
 * mesmo código para os dois (ver ./sandboxCapability). Duplicar isso significaria
 * duplicar a redação, e uma das cópias ficaria para trás.
 */
export const createSandboxCapability = (
  options: Omit<SandboxCapabilityOptions, 'database'>
): SandboxDatabaseCapability =>
  createSandboxCapabilityImpl({
    database: { dbConnect, dbQuery, dbExecute, dbDisconnect, closeAllConnections },
    ...options
  });

export {
  redactParameters,
  summarizeResult,
  createEnvironmentCredentialProvider,
  beginStatementFor,
  REDACTED
} from './sandboxCapability';

export type {
  CredentialProvider,
  ResolvedCredentials,
  SandboxCapabilityOptions,
  SandboxDatabaseCapability,
  ConnectionHandle
} from './sandboxCapability';
