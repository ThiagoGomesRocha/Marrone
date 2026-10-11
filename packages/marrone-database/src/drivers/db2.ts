/**
 * Driver IBM DB2 — pacote `ibm_db`.
 *
 * ESTE É O ÚNICO DRIVER NATIVO. Fatos verificados empiricamente no gate G0
 * (ver integracaoBD-v2.md §5 e §10):
 *
 *   - `ibm_db` É N-API (usa node-addon-api), portanto o binário é ABI-estável entre
 *     Node e Electron: NÃO precisa de electron-rebuild.
 *   - Ele depende de um install script que baixa o `clidriver` (83 MB). O npm 12 bloqueia
 *     install scripts por padrão → é obrigatório rodar `npm install-scripts approve ibm_db`.
 *   - DUAS coisas quebram no app EMPACOTADO (verificadas rodando o binário empacotado):
 *     1. o clidriver são DLLs e não carregam de dentro do app.asar → o electron-builder precisa
 *        de asarUnpack para node_modules/ibm_db E para node_modules/bindings (o pacote
 *        `bindings` localiza o .node varrendo o sistema de arquivos e falha dentro do asar);
 *     2. o próprio ibm_db monta o PATH do clidriver a partir do __dirname, que dentro do asar
 *        aponta para um lugar inútil → o host define IBM_DB_HOME apontando para o clidriver em
 *        app.asar.unpacked (ver marrone-electron/src/utils/db2-packaged-env.js).
 *     Sem as duas, o DB2 funciona em desenvolvimento e falha no aplicativo instalado.
 *   - ⚠️ Encerrar o processo com uma conexão ODBC ainda pendente causa SEGFAULT (exit 139).
 *     Por isso o CONNECTTIMEOUT é SEMPRE definido aqui e o close() é sempre aguardado.
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

const SGBD: SgbdId = 'db2';
const DRIVER_PACKAGE = 'ibm_db';

/**
 * Escapa um valor no connection string do DB2 CLI.
 * Valores com `;`, `{` ou `}` precisam ser envolvidos em chaves, e o `}` interno é
 * duplicado. Sem isto, uma senha contendo `;` quebraria a string em silêncio.
 */
export const escapeDb2Value = (value: string): string => {
  if (!/[;{}]/.test(value)) {
    return value;
  }

  const escaped = value.split('}').join('}}');

  return `{${escaped}}`;
};

/**
 * Função pura — monta o connection string do DB2.
 *
 * `CONNECTTIMEOUT` é sempre emitido: é o que impede uma conexão pendente de travar o
 * processo (e de virar segfault no encerramento).
 */
export const buildDb2ConnectionString = (options: DriverConnectOptions): string => {
  const { host, port, database } = parseConnectionString(SGBD, options.connectionString);

  const timeoutSeconds = Math.max(1, Math.ceil(options.connectTimeoutMs / 1000));

  const parts = [
    `DATABASE=${escapeDb2Value(database)}`,
    `HOSTNAME=${escapeDb2Value(host)}`,
    `PORT=${port}`,
    'PROTOCOL=TCPIP',
    `UID=${escapeDb2Value(options.username ?? '')}`,
    `PWD=${escapeDb2Value(options.password ?? '')}`,
    `CONNECTTIMEOUT=${timeoutSeconds}`
  ];

  return `${parts.join(';')};`;
};

export const connect = async (options: DriverConnectOptions): Promise<DriverConnection> => {
  const ibmdb = await loadDriverModule(DRIVER_PACKAGE, SGBD);

  const connection = await new Promise<any>((resolve, reject) => {
    try {
      ibmdb.open(buildDb2ConnectionString(options), (err: unknown, conn: unknown) => {
        if (err) {
          reject(normalizeError(SGBD, err));
          return;
        }
        resolve(conn);
      });
    } catch (err) {
      reject(normalizeError(SGBD, err));
    }
  });

  const run = (sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> =>
    new Promise((resolve, reject) => {
      try {
        connection.query(sql, params, (err: unknown, rows: unknown) => {
          if (err) {
            reject(normalizeError(SGBD, err));
            return;
          }
          resolve(Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []);
        });
      } catch (err) {
        reject(normalizeError(SGBD, err));
      }
    });

  return {
    sgbd: SGBD,
    query: async (sql, params) => run(sql, params),
    // O ibm_db não informa linhas afetadas de forma uniforme — devolvemos null em vez de chutar.
    execute: async (sql, params) => ({ affectedRows: null, rows: await run(sql, params) }),
    // DB2 usa transação implícita: não existe BEGIN.
    commit: async () => {
      await run('COMMIT');
    },
    rollback: async () => {
      await run('ROLLBACK');
    },
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        try {
          connection.close((err: unknown) => {
            if (err) {
              reject(normalizeError(SGBD, err));
              return;
            }
            resolve();
          });
        } catch (err) {
          reject(normalizeError(SGBD, err));
        }
      });
    }
  };
};

export const db2Driver: DatabaseDriver = { sgbd: SGBD, driverPackage: DRIVER_PACKAGE, connect };
