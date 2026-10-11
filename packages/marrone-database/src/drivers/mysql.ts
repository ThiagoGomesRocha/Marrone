/**
 * Driver MySQL — pacote `mysql2/promise`, com conexão dedicada.
 *
 * Placeholders: posicionais (?). O mysql2 aceita o array de valores direto.
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

const SGBD: SgbdId = 'mysql';
const DRIVER_PACKAGE = 'mysql2/promise';

export interface MysqlConnectionConfig {
  host: string;
  port: number;
  database: string;
  user?: string;
  password?: string;
  connectTimeout: number;
  /** MySQL devolve DECIMAL como string — queremos isso, para não perder precisão. */
  decimalNumbers: boolean;
  /** Evita que DATETIME seja entregue como objeto Date já convertido para o fuso local. */
  dateStrings: boolean;
}

/** Função pura — testável sem banco e sem o driver instalado. */
export const buildConnectionConfig = (options: DriverConnectOptions): MysqlConnectionConfig => {
  const { host, port, database } = parseConnectionString(SGBD, options.connectionString);

  return {
    host,
    port,
    database,
    user: options.username,
    password: options.password,
    connectTimeout: options.connectTimeoutMs,
    // Decisão deliberada: manter DECIMAL como string (precisão) e DATETIME como string
    // (evita conversão de fuso feita pelo driver — quem normaliza é o normalizeType).
    decimalNumbers: false,
    dateStrings: true
  };
};

const toRows = (rows: unknown): Record<string, unknown>[] =>
  Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];

export const connect = async (options: DriverConnectOptions): Promise<DriverConnection> => {
  const mysql = await loadDriverModule(DRIVER_PACKAGE, SGBD);
  const connection = await (async () => {
    try {
      return await mysql.createConnection(buildConnectionConfig(options));
    } catch (err) {
      throw normalizeError(SGBD, err);
    }
  })();

  const run = async (
    sql: string,
    params: unknown[] = [],
    usePrepared: boolean
  ): Promise<unknown> => {
    try {
      const [rows] = usePrepared
        ? await connection.execute(sql, params)
        : await connection.query(sql, params);
      return rows;
    } catch (err) {
      throw normalizeError(SGBD, err);
    }
  };

  const affectedRows = (rows: unknown): number | null => {
    const value = (rows as { affectedRows?: unknown })?.affectedRows;
    return typeof value === 'number' ? value : null;
  };

  return {
    sgbd: SGBD,
    query: async (sql, params) => toRows(await run(sql, params, false)),
    execute: async (sql, params) => {
      const rows = await run(sql, params, true);
      return { affectedRows: affectedRows(rows), rows: toRows(rows) };
    },
    begin: async () => {
      await run('START TRANSACTION', [], false);
    },
    commit: async () => {
      await run('COMMIT', [], false);
    },
    rollback: async () => {
      await run('ROLLBACK', [], false);
    },
    close: async () => {
      try {
        await connection.end();
      } catch (err) {
        throw normalizeError(SGBD, err);
      }
    }
  };
};

export const mysqlDriver: DatabaseDriver = { sgbd: SGBD, driverPackage: DRIVER_PACKAGE, connect };
