/**
 * Driver Oracle — pacote `oracledb` em THIN MODE.
 *
 * Thin mode (padrão do oracledb 6+) é JS puro: NÃO exige o Oracle Instant Client e
 * NÃO chamamos initOracleClient(). Isso é o que torna este driver seguro para o build,
 * que roda com npmRebuild: false.
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

const SGBD: SgbdId = 'oracle';
const DRIVER_PACKAGE = 'oracledb';

export interface OracleCredentials {
  user: string;
  password: string;
  connectString: string;
}

/** Função pura: monta o connectString do Oracle no formato host:porta/serviço. */
export const buildOracleConnectString = (options: DriverConnectOptions): string => {
  const { host, port, database } = parseConnectionString(SGBD, options.connectionString);

  return `${host}:${port}/${database}`;
};

/** Função pura — testável sem banco e sem o driver instalado. */
export const buildOracleCredentials = (options: DriverConnectOptions): OracleCredentials => ({
  user: options.username ?? '',
  password: options.password ?? '',
  connectString: buildOracleConnectString(options)
});

export const connect = async (options: DriverConnectOptions): Promise<DriverConnection> => {
  const oracledb = await loadDriverModule(DRIVER_PACKAGE, SGBD);

  const connection = await (async () => {
    try {
      return await oracledb.getConnection(buildOracleCredentials(options));
    } catch (err) {
      throw normalizeError(SGBD, err);
    }
  })();

  const run = async (
    sql: string,
    params: unknown[] = [],
    useResultSet: boolean
  ): Promise<{ rows: Record<string, unknown>[]; rowsAffected: number | null }> => {
    try {
      const result = await connection.execute(sql, params, {
        // OUT_FORMAT_OBJECT entrega linhas como objetos { COLUNA: valor } em vez de arrays.
        // ATENÇÃO: o Oracle devolve os NOMES DE COLUNA EM MAIÚSCULAS. Não renomeamos nada —
        // é comportamento documentado do SGBD (ver docs/database-integration.md).
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: !useResultSet
      });

      return {
        rows: Array.isArray(result?.rows) ? (result.rows as Record<string, unknown>[]) : [],
        rowsAffected: typeof result?.rowsAffected === 'number' ? result.rowsAffected : null
      };
    } catch (err) {
      throw normalizeError(SGBD, err);
    }
  };

  return {
    sgbd: SGBD,
    query: async (sql, params) => (await run(sql, params, true)).rows,
    execute: async (sql, params) => {
      const result = await run(sql, params, false);
      return { affectedRows: result.rowsAffected, rows: result.rows };
    },
    // Oracle não tem BEGIN: a transação é implícita. Só COMMIT/ROLLBACK fazem sentido.
    commit: async () => {
      try {
        await connection.commit();
      } catch (err) {
        throw normalizeError(SGBD, err);
      }
    },
    rollback: async () => {
      try {
        await connection.rollback();
      } catch (err) {
        throw normalizeError(SGBD, err);
      }
    },
    close: async () => {
      try {
        await connection.close();
      } catch (err) {
        throw normalizeError(SGBD, err);
      }
    }
  };
};

export const oracleDriver: DatabaseDriver = { sgbd: SGBD, driverPackage: DRIVER_PACKAGE, connect };
