/**
 * Driver PostgreSQL — pacote `pg`, com conexão dedicada (pg.Client).
 *
 * Placeholders: posicionais numerados ($1, $2). O pg aceita o array de valores direto.
 */

import { parseConnectionString } from '../connectionString';
import { normalizeError } from '../errors';
import type { SgbdId } from '../constants';
import {
  loadDriverModule,
  type DatabaseDriver,
  type DriverConnectOptions,
  type DriverConnection
} from './types';

const SGBD: SgbdId = 'postgres';
const DRIVER_PACKAGE = 'pg';

export interface PostgresClientConfig {
  host: string;
  port: number;
  database: string;
  user?: string;
  password?: string;
  connectionTimeoutMillis: number;
}

/** Função pura — testável sem banco e sem o driver instalado. */
export const buildClientConfig = (options: DriverConnectOptions): PostgresClientConfig => {
  const { host, port, database } = parseConnectionString(SGBD, options.connectionString);

  return {
    host,
    port,
    database,
    user: options.username,
    password: options.password,
    connectionTimeoutMillis: options.connectTimeoutMs
  };
};

const toRows = (result: unknown): Record<string, unknown>[] => {
  const rows = (result as { rows?: unknown })?.rows;
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
};

export const connect = async (options: DriverConnectOptions): Promise<DriverConnection> => {
  const pg = await loadDriverModule(DRIVER_PACKAGE, SGBD);
  const client = new pg.Client(buildClientConfig(options));

  const run = async (sql: string, params: unknown[] = []): Promise<unknown> => {
    try {
      return await client.query(sql, params);
    } catch (err) {
      throw normalizeError(SGBD, err);
    }
  };

  try {
    await client.connect();
  } catch (err) {
    throw normalizeError(SGBD, err);
  }

  return {
    sgbd: SGBD,
    query: async (sql, params) => toRows(await run(sql, params)),
    execute: async (sql, params) => {
      const result = await run(sql, params);
      const rowCount = (result as { rowCount?: unknown })?.rowCount;
      return {
        affectedRows: typeof rowCount === 'number' ? rowCount : null,
        rows: toRows(result)
      };
    },
    begin: async () => {
      await run('BEGIN');
    },
    commit: async () => {
      await run('COMMIT');
    },
    rollback: async () => {
      await run('ROLLBACK');
    },
    close: async () => {
      try {
        await client.end();
      } catch (err) {
        throw normalizeError(SGBD, err);
      }
    }
  };
};

export const postgresDriver: DatabaseDriver = { sgbd: SGBD, driverPackage: DRIVER_PACKAGE, connect };
