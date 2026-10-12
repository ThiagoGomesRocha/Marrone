import { T_RunnerResults } from '../../types';
import { isHtmlContentType, getContentType, redactImageData, encodeBase64 } from '../../utils';
import { buildCurl } from './curl';
import htmlTemplateString from './template';

const REDACTED = '***';

/**
 * Redação final dos parâmetros de operações de banco.
 *
 * O host JÁ registra os parâmetros redigidos (ver marrone-electron/src/services/database).
 * Esta segunda passada existe porque o relatório é um artefato compartilhável e a garantia
 * não pode depender de quem monta o payload — é o mesmo espírito de `buildCurl(request,
 * { includeSensitive })`, que também decide aqui, no último momento, o que pode aparecer.
 */
const redactDatabaseParameters = (parameters: unknown, includeSensitive: boolean): unknown[] => {
  if (!Array.isArray(parameters)) {
    return [];
  }

  if (includeSensitive) {
    return parameters;
  }

  return parameters.map(() => REDACTED);
};

/**
 * Coleta as operações de banco de todas as iterações/requisições e anexa o contexto
 * da requisição em que cada uma rodou (nome, método e url), para o relatório poder
 * dizer de onde veio cada SQL.
 */
const collectDatabaseOperations = (
  runnerResults: T_RunnerResults[],
  includeSensitive: boolean,
  includeDbRows: boolean
): unknown[] => {
  return runnerResults.flatMap(({ results }) =>
    (results || []).flatMap((result) => {
      const operations = result?.databaseOperations;

      if (!Array.isArray(operations)) {
        return [];
      }

      return operations.map((operation) => {
        const mapped: Record<string, unknown> = {
          ...operation,
          parameters: redactDatabaseParameters(operation.parameters, includeSensitive),
          // O NOME da requisição está no RESULTADO, não dentro de `request` (que carrega só
          // method/url/headers/data). Ler de `request.name` devolvia null sempre.
          requestName: result?.name || null,
          requestUrl: result?.request?.url || null,
          requestMethod: result?.request?.method || null
        };

        // As linhas do resultado saem quando o relatório é montado SEM dados de linha.
        // O padrão é incluir (limitado a 20 por operação, ver @marrone/database), mas o
        // relatório circula e um SELECT pode trazer dado pessoal — daí o interruptor.
        if (!includeDbRows) {
          delete mapped.resultRows;
          delete mapped.resultRowsTotal;
          delete mapped.resultRowsTruncated;
        }

        return mapped;
      });
    })
  );
};

const generateHtmlReport = ({
  runnerResults,
  version = '', // Default to empty string if not provided
  environment = null, // Default environment if not provided
  runCompletionTime = '', // Default run completion time if not provided
  logo = '', // Optional data-URL (data:image/png;base64,...) shown in the report header
  includeSensitive = false, // Whether to include credential headers/query params in generated CURL commands
  includeDbRows = true // Whether the Database Operations tab carries the rows the queries returned
}: {
  runnerResults: T_RunnerResults[];
  version?: string;
  environment?: string | null;
  runCompletionTime?: string;
  logo?: string;
  includeSensitive?: boolean;
  includeDbRows?: boolean;
}): string => {
  const resultsWithSummaryAndCleanData = runnerResults.map(({ iterationIndex, results, summary }) => {
    return {
      iterationIndex,
      results: results.map((result) => {
        // databaseOperations é REMOVIDO daqui de propósito.
        //
        // Ele é agregado e redigido em `collectDatabaseOperations`, no nível do payload.
        // Se ficasse no spread de cada result, os parâmetros CRUS (sem redação) viajariam
        // junto dentro de payload.results — e a redação do topo seria inútil. Este detalhe
        // é coberto por teste (database-report.spec.ts).
        const { request, response, databaseOperations: omittedOperations, ...resultRest } = result || {};
        void omittedOperations;

        const requestContentType = request?.headers ? getContentType(request?.headers) : '';
        const responseContentType = response?.headers ? getContentType(response?.headers) : '';
        return {
          ...resultRest,
          request: {
            ...request,
            data: request?.data ? redactImageData(request?.data, requestContentType) : request?.data,
            isHtml: isHtmlContentType(requestContentType)
          },
          response: {
            ...response,
            data: response?.data ? redactImageData(response?.data, responseContentType) : response?.data,
            isHtml: isHtmlContentType(responseContentType)
          },
          curl: buildCurl(request, { includeSensitive })
        };
      }),
      summary
    };
  });

  // Seção "Database Operations" (RF08 / P4). Os SQL executados pelos scripts de pré e
  // pós-requisição vêm de bru.databaseOperations, serializado pelo runtime.
  const databaseOperations = collectDatabaseOperations(runnerResults, includeSensitive, includeDbRows);

  const htmlString = htmlTemplateString(encodeBase64(JSON.stringify({
    results: resultsWithSummaryAndCleanData,
    version,
    environment,
    runCompletionTime,
    logo,
    databaseOperations
  })));
  return htmlString;
};

export { generateHtmlReport, collectDatabaseOperations, redactDatabaseParameters };
