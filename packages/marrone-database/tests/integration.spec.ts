/**
 * Testes de INTEGRAÇÃO — desligados por padrão.
 *
 * O MVP decidiu não depender de Docker nem de servidor de banco (D5 do plano v2).
 * Estes testes só rodam quando você aponta para um banco REAL você mesmo:
 *
 *   DB_INTEGRATION=true \
 *   POSTGRES_URL=postgres://localhost:5432/mydb \
 *   POSTGRES_USER=usuario POSTGRES_PASSWORD=senha \
 *   npx jest tests/integration.spec.ts
 *
 * Sem DB_INTEGRATION=true, tudo aqui é skipped — o `npm test` normal fica verde em
 * qualquer máquina, sem banco instalado.
 */

import { dbConnect, dbQuery, dbDisconnect, closeAllConnections } from '../src/index';
import type { SgbdId } from '../src/constants';

const RUN_INTEGRATION = process.env.DB_INTEGRATION === 'true';

const describeIntegration = RUN_INTEGRATION ? describe : describe.skip;

interface IntegrationTarget {
  sgbd: SgbdId;
  urlEnv: string;
  userEnv: string;
  passwordEnv: string;
  selectOne: string;
}

const TARGETS: IntegrationTarget[] = [
  {
    sgbd: 'postgres',
    urlEnv: 'POSTGRES_URL',
    userEnv: 'POSTGRES_USER',
    passwordEnv: 'POSTGRES_PASSWORD',
    selectOne: 'SELECT 1 AS um'
  },
  {
    sgbd: 'mysql',
    urlEnv: 'MYSQL_URL',
    userEnv: 'MYSQL_USER',
    passwordEnv: 'MYSQL_PASSWORD',
    selectOne: 'SELECT 1 AS um'
  },
  {
    sgbd: 'mssql',
    urlEnv: 'MSSQL_URL',
    userEnv: 'MSSQL_USER',
    passwordEnv: 'MSSQL_PASSWORD',
    selectOne: 'SELECT 1 AS um'
  },
  {
    sgbd: 'oracle',
    urlEnv: 'ORACLE_URL',
    userEnv: 'ORACLE_USER',
    passwordEnv: 'ORACLE_PASSWORD',
    selectOne: 'SELECT 1 AS um FROM DUAL'
  },
  {
    sgbd: 'db2',
    urlEnv: 'DB2_URL',
    userEnv: 'DB2_USER',
    passwordEnv: 'DB2_PASSWORD',
    selectOne: 'SELECT 1 AS um FROM SYSIBM.SYSDUMMY1'
  }
];

describeIntegration('integração com banco real (opt-in)', () => {
  afterAll(async () => {
    await closeAllConnections();
  });

  for (const target of TARGETS) {
    const connectionString = process.env[target.urlEnv];

    if (!connectionString) {
      test.skip(`${target.sgbd}: pulado (defina ${target.urlEnv})`, () => {});
      continue;
    }

    test(`${target.sgbd}: conecta, consulta e desconecta`, async () => {
      const connection = await dbConnect(target.sgbd, connectionString, {
        username: process.env[target.userEnv],
        password: process.env[target.passwordEnv]
      });

      const result = await dbQuery(connection, target.selectOne);

      expect(result).not.toBeNull();

      await dbDisconnect(connection);
    });
  }
});
