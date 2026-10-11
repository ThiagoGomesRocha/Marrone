/**
 * Contrato único que todo driver de SGBD implementa.
 *
 * IMPORTANTE — conexão DEDICADA, não pool do driver:
 * cada DriverConnection representa UMA conexão única com o servidor (pg.Client,
 * mysql2.createConnection, tedious.Connection, oracledb single connection, ibm_db single).
 * O pool deste projeto é o `ConnectionPool` (src/pool.ts), que guarda essas conexões
 * num Map por string de conexão.
 *
 * Por que conexão dedicada e não o pool do driver: `dbTransaction()` precisa que BEGIN e
 * COMMIT rodem na MESMA conexão física. Com `pool.query()` isso não é garantido e a
 * transação silenciosamente não funciona.
 */

import type { SgbdId } from '../constants';
import { driverNotInstalledError } from '../errors';

export interface ExecuteResult {
  /** Linhas afetadas, quando o driver informa. */
  affectedRows: number | null;
  /** Linhas devolvidas (INSERT ... RETURNING, por exemplo). */
  rows: Record<string, unknown>[];
}

export interface DriverConnection {
  readonly sgbd: SgbdId;
  query(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
  /** Presente só onde a sintaxe existe (PostgreSQL, MySQL, SQL Server). */
  begin?(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  /** Encerra a conexão físicamente. SEMPRE aguardado — ver a lição do G0. */
  close(): Promise<void>;
}

export interface DriverConnectOptions {
  /** String de conexão SEM credenciais (host/porta/database). */
  connectionString: string;
  /** Vem do cofre do sistema, resolvido pelo host. Nunca do arquivo da coleção. */
  username?: string;
  password?: string;
  connectTimeoutMs: number;
}

export interface DatabaseDriver {
  readonly sgbd: SgbdId;
  readonly driverPackage: string;
  connect(options: DriverConnectOptions): Promise<DriverConnection>;
}

/**
 * Carrega o pacote do driver de forma TARDIA.
 *
 * Por que tardio: o pacote @marrone/database precisa ser importável (e testável) mesmo
 * sem nenhum driver instalado — quem só usa PostgreSQL não deve precisar instalar o
 * clidriver do DB2. O driver só é carregado no momento do primeiro connect() daquele SGBD.
 */
export const loadDriverModule = async (driverPackage: string, sgbd: SgbdId): Promise<any> => {
  try {
    const module = await import(driverPackage);
    return (module as { default?: unknown }).default ?? module;
  } catch (err) {
    throw driverNotInstalledError(sgbd, driverPackage);
  }
};
