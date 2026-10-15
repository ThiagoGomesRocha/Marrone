/**
 * Driver SQL Server — pacote `tedious`.
 *
 * Este é o driver com a maior diferença de modelo, em DOIS aspectos. Os dois foram
 * descobertos rodando contra um SQL Server real (tedious 18.6.2), e nenhum dos dois
 * aparecia nos testes porque ambos vivem na parte que só existe com o driver carregado:
 *
 * 1. PARÂMETROS. O tedious usa parâmetros nomeados (@p1, @p2) registrados com
 *    request.addParameter(name, TIPO, valor). A assinatura de 2 argumentos (com inferência
 *    de tipo) foi REMOVIDA: passar o valor no lugar do tipo falha em runtime com
 *    "parameter.type.validate is not a function". Convertemos o array posicional para @pN
 *    e resolvemos o tipo em `tediousTypeNameFor` (função pura).
 *
 * 2. FORMATO DAS LINHAS. O tedious NÃO devolve { coluna: valor }: devolve um objeto
 *    indexado pela POSIÇÃO ordinal, onde cada célula é { value, metadata: { colName } }.
 *    Nenhuma camada achatava isso — `normalizeRows` recursava no envelope e o script
 *    recebia {"0":{value,metadata},...}. O achatamento é `mapTediousRow` (função pura).
 *
 * 3. ESCOPO DE EXECUÇÃO. `connection.execSql` NÃO manda o SQL como um batch comum: ele
 *    manda um RPC para `sp_executesql`, e o SQL Server trata a requisição como uma
 *    PROCEDURE. Consequência medida em servidor real: ao retornar, tudo que é escopo de
 *    procedure morre — tabela temporária local é derrubada, `SET` de sessão não persiste e
 *    uma transação aberta deixa de existir (erro 266, "mismatching number of BEGIN and
 *    COMMIT"). O próprio tedious documenta isso (ver o JSDoc de `execSql`) e aponta
 *    `execSqlBatch` como a saída. Então: sem placeholders a ligar usamos `execSqlBatch`
 *    (batch de verdade); com placeholders não há escolha, e `execSql` é necessário.
 *
 * As duas conversões ficam em funções puras exatamente para serem testáveis sem banco —
 * foi a ausência disso que deixou os dois bugs passarem.
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

/**
 * Converte uma linha crua do tedious em um objeto plano { coluna: valor }.
 *
 * Linha crua: { '0': { value, metadata: { colName } }, '1': { ... } } — as chaves são a
 * POSIÇÃO da coluna, não o nome. Sem este achatamento o script recebe o envelope inteiro.
 *
 * Colunas de MESMO NOME: o tedious as indexa por posição, então as duas existem na linha
 * crua e a última vence aqui. É limitação do modelo do tedious, não escolha nossa.
 */
export const mapTediousRow = (row: unknown): Record<string, unknown> => {
  if (!row || typeof row !== 'object') {
    return {};
  }

  const flat: Record<string, unknown> = {};

  for (const [key, cell] of Object.entries(row as Record<string, unknown>)) {
    const isCell = cell !== null && typeof cell === 'object' && 'value' in (cell as Record<string, unknown>);

    if (!isCell) {
      // Forma inesperada (o driver mudou): preserva o que veio em vez de descartar.
      flat[key] = cell;
      continue;
    }

    const { metadata, value } = cell as { metadata?: { colName?: string }; value: unknown };
    flat[metadata?.colName ?? key] = value;
  }

  return flat;
};

/**
 * Nome do tipo do tedious adequado a um valor JS. Devolve o NOME (e não o objeto TYPES)
 * para continuar pura — quem chama resolve `TYPES[nome]` ao registrar o parâmetro.
 *
 * Int32 quando o inteiro cabe (caso comum: ids e contadores); BigInt quando não cabe, porque
 * o tipo Int REJEITA fora da faixa com erro de validação. Float é IEEE-754 double — o mesmo
 * conjunto que um number do JS já representa, então não perde nada que o JS não perca antes.
 */
export const tediousTypeNameFor = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'NVarChar';
  }

  switch (typeof value) {
    case 'boolean':
      return 'Bit';
    case 'bigint':
      return 'BigInt';
    case 'number':
      if (!Number.isSafeInteger(value)) {
        return 'Float';
      }
      return value >= -2147483648 && value <= 2147483647 ? 'Int' : 'BigInt';
    case 'object':
      if (value instanceof Date) {
        return 'DateTime2';
      }
      if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
        return 'VarBinary';
      }
      return 'NVarChar';
    default:
      return 'NVarChar';
  }
};

/**
 * Converte o valor antes de registrar o parâmetro.
 *
 * Objetos e arrays não têm representação nativa no protocolo TDS (fora de TVP, que está
 * fora do escopo): serializamos em JSON em vez de deixar o tedious falhar com um erro de
 * validação opaco. `null`/`undefined` viram NULL de verdade.
 */
export const toTediousValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return null;
  }

  const isBinary = Buffer.isBuffer(value) || value instanceof Uint8Array;

  if (typeof value === 'object' && !(value instanceof Date) && !isBinary) {
    return JSON.stringify(value);
  }

  return value;
};

/**
 * A instrução deve ir como SQL BATCH (e não como RPC para `sp_executesql`)?
 *
 * Só é possível quando não há placeholder a ligar — o batch não aceita parâmetros. Em troca,
 * ele roda com escopo de INSTRUÇÃO, e não de PROCEDURE: é o que faz tabela temporária local,
 * transação aberta e `SET` de sessão sobreviverem entre chamadas. Com placeholder não há
 * escolha — a ligação de parâmetros exige o RPC.
 */
export const shouldUseSqlBatch = (sql: string): boolean => parseMssqlParameters(sql).length === 0;

export interface TediousConfig {
  server: string;
  authentication: {
    type: string;
    options: {
      userName: string;
      password: string;
      /** Só no NTLM (`authType: 'windows'`). */
      domain?: string;
    };
  };
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

/** Normaliza a forma de autenticação: qualquer coisa diferente de 'windows' é 'sql'. */
export const normalizeAuthType = (authType: unknown): 'sql' | 'windows' =>
  authType === 'windows' ? 'windows' : 'sql';

/**
 * Função pura — testável sem banco e sem o driver instalado.
 *
 * AUTENTICAÇÃO DO WINDOWS (NTLM)
 * ------------------------------
 * `tedious` não usa o token do Windows já logado (não há SSPI): com `type: 'ntlm'` ele
 * negocia NTLM com o usuário, a senha e o DOMÍNIO informados. Ou seja, a senha continua
 * sendo necessária — "logar como o usuário atual" sem senha não é suportado por este
 * driver, e a UI diz isso.
 *
 * O domínio vai em `authentication.options.domain`. Numa rede sem Active Directory o
 * domínio de uma conta local é o nome da máquina (`SEU-PC\joao.silva` → domain
 * `SEU-PC`); sem o domínio, o NTLM autentica `userName` como conta do próprio
 * servidor e a validação falha com usuário/senha correto — sintoma que engana.
 *
 * Com `authType: 'sql'` (o padrão) o comportamento é exatamente o anterior: `type:
 * 'default'`, sem `domain` no objeto — nem como chave vazia, para o config seguir
 * idêntico ao de antes quando ninguém usa a feature nova.
 */
export const buildTediousConfig = (options: DriverConnectOptions): TediousConfig => {
  const { host, port, database } = parseConnectionString(SGBD, options.connectionString);
  const authType = normalizeAuthType(options.authType);

  const authentication = authType === 'windows'
    ? {
        type: 'ntlm',
        options: {
          userName: options.username ?? '',
          password: options.password ?? '',
          // `?? ''` e não `undefined`: o tedious valida a presença da chave no NTLM.
          domain: options.domain ?? ''
        }
      }
    : {
        type: 'default',
        options: {
          userName: options.username ?? '',
          password: options.password ?? ''
        }
      };

  return {
    server: host,
    authentication,
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

      if (names.length === 0) {
        // SEM parâmetros: batch de verdade, para o escopo continuar sendo de instrução.
        // Ver o item 3 do cabeçalho deste arquivo.
        connection.execSqlBatch(request);
        return;
      }

      names.forEach((name, index) => {
        const value = params[index];

        // O TIPO é obrigatório: a forma de 2 argumentos não existe mais no tedious 18.
        request.addParameter(name, tedious.TYPES[tediousTypeNameFor(value)], toTediousValue(value));
      });

      connection.execSql(request);
    });

  const toRows = (rows: unknown[]): Record<string, unknown>[] =>
    Array.isArray(rows) ? rows.map(mapTediousRow) : [];

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
