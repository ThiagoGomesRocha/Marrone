/**
 * Registro de drivers por SGBD.
 *
 * Os módulos dos drivers são importados ESTATICAMENTE aqui, mas cada um deles só toca o
 * pacote npm do SGBD de forma tardia (dentro do connect). Consequência: importar este
 * arquivo NÃO exige ter nenhum driver instalado.
 *
 * `registerDriver` existe para dois casos: testes (injetar um driver falso e exercitar
 * pool/formatação/transação sem banco) e extensão futura pelo host.
 */

import { getDatabaseById, type SgbdId } from '../constants';
import type { DatabaseDriver } from './types';
import { postgresDriver } from './postgres';
import { mysqlDriver } from './mysql';
import { mssqlDriver } from './mssql';
import { oracleDriver } from './oracle';
import { db2Driver } from './db2';

const DRIVERS: Record<SgbdId, DatabaseDriver> = {
  postgres: postgresDriver,
  mysql: mysqlDriver,
  mssql: mssqlDriver,
  oracle: oracleDriver,
  db2: db2Driver
};

/** Substitui (ou adiciona) o driver de um SGBD. */
export const registerDriver = (driver: DatabaseDriver): void => {
  DRIVERS[driver.sgbd] = driver;
};

/** Devolve o driver do SGBD. Lança se o id não for suportado (nunca devolve undefined). */
export const getDriver = (sgbd: string): DatabaseDriver => {
  const definition = getDatabaseById(sgbd);
  const driver = DRIVERS[definition.id];

  if (!driver) {
    throw new Error(`Nenhum driver registrado para o SGBD "${sgbd}".`);
  }

  return driver;
};

export const registeredDrivers = (): DatabaseDriver[] => Object.values(DRIVERS);
