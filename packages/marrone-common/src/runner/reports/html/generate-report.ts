import { T_RunnerResults } from '../../types';
import { encodeBase64 } from '../../utils';
import htmlTemplateString from './template';
import { enrichResult } from '../shared/report-results';
import { collectDatabaseOperations, redactDatabaseParameters } from '../shared/database-operations';
import { getHtmlReportTranslations } from './translations';

/**
 * Gerador do relatório HTML.
 *
 * A transformação de cada requisição e a coleta das operações de banco vivem em
 * `../shared/` porque o gerador de JSON usa EXATAMENTE as mesmas — é assim que os dois
 * relatórios não podem divergir.
 */
const generateHtmlReport = ({
  runnerResults,
  version = '', // Default to empty string if not provided
  environment = null, // Default environment if not provided
  runCompletionTime = '', // Default run completion time if not provided
  logo = '', // Optional data-URL (data:image/png;base64,...) shown in the report header
  includeSensitive = false, // Whether to include credential headers/query params in generated CURL commands
  includeDbRows = true, // Whether the Database Operations tab carries the rows the queries returned
  lang = 'en' // Report language (en, pt-BR); falls back to en when unknown
}: {
  runnerResults: T_RunnerResults[];
  version?: string;
  environment?: string | null;
  runCompletionTime?: string;
  logo?: string;
  includeSensitive?: boolean;
  includeDbRows?: boolean;
  lang?: string;
}): string => {
  const resultsWithSummaryAndCleanData = (runnerResults || []).map(({ iterationIndex, results, summary }) => {
    return {
      iterationIndex,
      results: (results || []).map((result) => enrichResult(result, includeSensitive, includeDbRows)),
      summary
    };
  });

  // Visão consolidada (aba "Database Operations"). Sai da MESMA função que alimenta a
  // visão por requisição, para as duas não poderem divergir.
  const databaseOperations = collectDatabaseOperations(runnerResults, includeSensitive, includeDbRows);

  const htmlString = htmlTemplateString(encodeBase64(JSON.stringify({
    results: resultsWithSummaryAndCleanData,
    version,
    environment,
    runCompletionTime,
    logo,
    databaseOperations
  })), getHtmlReportTranslations(lang));
  return htmlString;
};

export { generateHtmlReport, collectDatabaseOperations, redactDatabaseParameters };
