/**
 * Driver SQL Server — pacote `tedious`.
 *
 * Este é o driver com a maior diferença de modelo: o tedious usa parâmetros NOMEADOS
 * (@p1, @p2) ligados via request.addParameter(), e não um array posicional.
 *
 * Para manter a API uniforme (dbQuery(conn, sql, [v1, v2])), convertemos o array
 * posicional em parâmetros nomeados. Essa conversão é uma função PURA e testável.
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

const SGBD: SgbdId = 'mssql';
const DRIVER_PACKAGE = 'tedious';

/**
 * Extrai os placeholders @pN de um SQL, na ordem numérica e sem repetição.
 *
 * Exemplo: 'UPDATE t SET a = @p1 WHERE id = @p2 AND x = @p1'
 *          → ['p1', 'p2']   (o @p1 repetido aparece uma única vez, na ordem certa)
 *
 * O usuário pode escrever os placeholders fora de ordem no SQL — a ordenação é feita
 * pelo número do placeholder, não pela posição no texto, que é o que o array de valores
 * posicional exige.
 */
export const parseMssqlParameters = (sql: string): string[] => {
  const matches = sql.match(/@p\d+/gi);

  if (!matches) {
    return [];
  }

  const unique = Array.from(new Set(matches.map((token) => token.slice(1).toLowerCase())));

  return unique.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
};

export interface TediousConfig {
  server: string;
  authentication: { type: string; options: { userName: string; password: string } };
  options: {
    port: number;
    database: string;
    connectTimeout: number;
    requestTimeout: number;
    encrypt: boolean;
    trustServerCertificate: boolean;
    rowCollectionOnRequestCompletion: boolean;
  };
}

/** Função pura — testável sem banco e sem o driver instalado. */
export const buildTediousConfig = (options: DriverConnectOptions): TediousConfig => {
  const { host, port, database } = parseConnectionString(SGBD, options.connectionString);

  return {
    server: host,
    authentication: {
      type: 'default',
      options: {
        userName: options.username ?? '',
        password: options.password ?? ''
      }
    },
    options: {
      port,
      database,
      connectTimeout: options.connectTimeoutMs,
      requestTimeout: options.connectTimeoutMs,
      // Padrão seguro para servidores internos com certificado autoassinado.
      encrypt: true,
      trustServerCertificate: true,
      // Sem isto o callback do Request não devolve as linhas.
      rowCollectionOnRequestCompletion: true
    }
  };
};

export const connect = async (options: DriverConnectOptions): Promise<DriverConnection> => {
  const tedious = await loadDriverModule(DRIVER_PACKAGE, SGBD);
  const connection = new tedious.Connection(buildTediousConfig(options));

  await new Promise<void>((resolve, reject) => {
    connection.on('connect', (err: unknown) => {
      if (err) {
        reject(normalizeError(SGBD, err));
        return;
      }
      resolve();
    });
    try {
      connection.connect();
    } catch (err) {
      reject(normalizeError(SGBD, err));
    }
  });

  const run = (sql: string, params: unknown[] = []): Promise<{ rowCount: number; rows: unknown[] }> =>
    new Promise((resolve, reject) => {
      const request = new tedious.Request(sql, (err: unknown, rowCount: number, rows: unknown[]) => {
        if (err) {
          reject(normalizeError(SGBD, err));
          return;
        }
        resolve({ rowCount, rows: rows ?? [] });
      });

      // Array posicional → parâmetros nomeados, na ordem de @pN.
      const names = parseMssqlParameters(sql);
      names.forEach((name, index) => {
        // Forma de 2 argumentos: o tedious infere o tipo a partir do valor JS.
        request.addParameter(name, params[index]);
      });

      connection.execSql(request);
    });

  const toRows = (rows: unknown[]): Record<string, unknown>[] =>
    Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];

  return {
    sgbd: SGBD,
    query: async (sql, params) => {
      const result = await run(sql, params);
      return toRows(result.rows);
    },
    execute: async (sql, params) => {
      const result = await run(sql, params);
      return {
        affectedRows: typeof result.rowCount === 'number' ? result.rowCount : null,
        rows: toRows(result.rows)
      };
    },
    begin: async () => {
      await run('BEGIN TRANSACTION');
    },
    commit: async () => {
      await run('COMMIT');
    },
    rollback: async () => {
      await run('ROLLBACK');
    },
    close: async () => {
      // O tedious não tem close assíncrono: encerrar é síncrono, mas mantemos a
      // assinatura uniforme (e nunca saímos sem chamar isto — lição do G0).
      connection.close();
    }
  };
};

export const mssqlDriver: DatabaseDriver = { sgbd: SGBD, driverPackage: DRIVER_PACKAGE, connect };
