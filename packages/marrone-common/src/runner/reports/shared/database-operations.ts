/**
 * Operações de banco no relatório — fonte única para o HTML e o JSON.
 *
 * POR QUE ESTE MÓDULO EXISTE
 * --------------------------
 * O HTML e o JSON têm de mostrar os MESMOS dados. Enquanto cada gerador tinha a sua
 * própria cópia da redação/contextualização, bastava alguém corrigir um lado para os dois
 * relatórios divergirem em silêncio. Aqui a transformação é uma só e os dois geradores a
 * consomem.
 *
 * DUAS GARANTIAS QUE NÃO PODEM DEPENDER DE QUEM MONTA O PAYLOAD
 * -------------------------------------------------------------
 * 1. REDAÇÃO. Os parâmetros chegam já redigidos do host, mas a redação é repetida aqui
 *    de propósito: o relatório é um artefato compartilhável e a garantia não pode
 *    depender de quem montou o objeto. Mesmo espírito de `buildCurl(request,
 *    { includeSensitive })`, que decide no último momento o que pode aparecer.
 * 2. TETO DE LINHAS. As linhas do resultado saem quando o relatório é montado sem dados
 *    de linha (`includeDbRows: false` / `--reporter-hide-db-rows`). Sem esse interruptor,
 *    um SELECT sem WHERE viraria um dump de tabela dentro de um arquivo que circula.
 */

import type { T_DatabaseOperation, T_RunnerRequestExecutionResult, T_RunnerResults } from '../../types';

export const REDACTED = '***';

/**
 * Rótulo legível do SGBD.
 *
 * POR QUE UMA CÓPIA AQUI (e não importar @marrone/database): o @marrone/common é
 * empacotado no bundle do RENDERER, que não tem socket TCP nem fs — importar o
 * @marrone/database arrastaria pg/mysql2/tedious/oracledb/ibm_db para o browser. O
 * catálogo canônico continua em @marrone/database/src/constants.ts; este mapa é só de
 * apresentação e cai para o próprio id quando o SGBD é desconhecido.
 */
export const SGBD_LABELS: Record<string, string> = {
  mysql: 'MySQL',
  postgres: 'PostgreSQL',
  mssql: 'SQL Server',
  oracle: 'Oracle',
  db2: 'IBM DB2'
};

export const sgbdLabel = (sgbd: unknown): string => {
  if (typeof sgbd !== 'string' || sgbd.length === 0) {
    return 'desconhecido';
  }

  return SGBD_LABELS[sgbd] ?? sgbd;
};

export const redactDatabaseParameters = (parameters: unknown, includeSensitive: boolean): unknown[] => {
  if (!Array.isArray(parameters)) {
    return [];
  }

  if (includeSensitive) {
    return parameters;
  }

  return parameters.map(() => REDACTED);
};

/**
 * Operação de banco enriquecida para o relatório: parâmetros redigidos, rótulo do SGBD e
 * o contexto da requisição em que ela rodou.
 *
 * O NOME da requisição está no RESULTADO (`T_RunnerRequestExecutionResult.name`), não
 * dentro de `request` (que carrega só method/url/headers/data). Ler de `request.name`
 * devolvia null sempre — havia teste concordando com esse bug.
 */
export type T_ReportDatabaseOperation = T_DatabaseOperation & {
  sgbdLabel: string;
  /** Arquivo .bru/.sql que disparou a operação (nome do arquivo, para exibição). */
  script: string;
  /** Caminho completo do arquivo da requisição, sem credenciais. */
  requestPath: string | null;
  requestName: string | null;
  requestUrl: string | null;
  requestMethod: string | null;
};

/** Último segmento de um caminho, aceitando separador do Windows e do POSIX. */
export const fileNameFromPath = (path: unknown): string => {
  if (typeof path !== 'string' || path.length === 0) {
    return '-';
  }

  const segments = path.split(/[\\/]/).filter((segment) => segment.length > 0);

  return segments.length > 0 ? segments[segments.length - 1] : path;
};

export const enrichOperation = (
  operation: T_DatabaseOperation,
  result: T_RunnerRequestExecutionResult | undefined,
  includeSensitive: boolean,
  includeDbRows: boolean
): T_ReportDatabaseOperation => {
  const mapped: Record<string, unknown> = {
    ...operation,
    sgbdLabel: sgbdLabel(operation?.sgbd),
    parameters: redactDatabaseParameters(operation?.parameters, includeSensitive),
    // O arquivo que disparou a operação é o arquivo DESTA requisição — o mesmo
    // `result.path` que o relatório já usa no título do card.
    script: fileNameFromPath(result?.path),
    requestPath: result?.path || null,
    requestName: result?.name || null,
    requestUrl: result?.request?.url || null,
    requestMethod: result?.request?.method || null
  };

  if (!includeDbRows) {
    delete mapped.resultRows;
    delete mapped.resultRowsTotal;
    delete mapped.resultRowsTruncated;
  }

  return mapped as T_ReportDatabaseOperation;
};

/** Operações de UMA requisição, já enriquecidas e redigidas. */
export const enrichResultOperations = (
  result: T_RunnerRequestExecutionResult | undefined,
  includeSensitive: boolean,
  includeDbRows: boolean
): T_ReportDatabaseOperation[] => {
  const operations = result?.databaseOperations;

  if (!Array.isArray(operations)) {
    return [];
  }

  return operations.map((operation) => enrichOperation(operation, result, includeSensitive, includeDbRows));
};

/**
 * Visão consolidada: todas as operações de todas as iterações/requisições, achatadas e
 * com o contexto da requisição de origem.
 *
 * É construída a partir de `enrichResultOperations` para que a visão por requisição e a
 * consolidada não possam divergir (mesma redação, mesmas linhas, mesmos rótulos).
 */
export const collectDatabaseOperations = (
  runnerResults: T_RunnerResults[],
  includeSensitive: boolean,
  includeDbRows: boolean
): T_ReportDatabaseOperation[] => {
  return (runnerResults ?? []).flatMap(({ results }) =>
    (results ?? []).flatMap((result) => enrichResultOperations(result, includeSensitive, includeDbRows))
  );
};
