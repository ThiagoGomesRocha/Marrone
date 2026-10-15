import { T_RunnerResults } from '../../types';
import { getRunnerSummary } from '../../runner-summary';
import { mergeTestResults } from '../shared/test-results';
import { enrichResult, type T_EnrichedResult } from '../shared/report-results';
import { collectDatabaseOperations } from '../shared/database-operations';

export interface T_JsonReport {
  version: string;
  environment: string | null;
  runCompletionTime: string;
  summary: ReturnType<typeof getRunnerSummary>;
  results: T_EnrichedResult[];
  databaseOperations: unknown[];
}

/**
 * Gerador do relatório JSON — ESPELHA o relatório HTML.
 *
 * POR QUE ESTE GERADOR EXISTE
 * ---------------------------
 * O `--reporter-json` antigo gravava o objeto interno do CLI cru (`{ summary, results }`).
 * Esse formato não tinha CURL, não tinha o merge dos testes de pré/pós-requisição e não
 * tinha NENHUMA informação de banco — ou seja, o JSON não permitia reproduzir o que o
 * HTML mostrava. Aqui os dois relatórios saem da mesma transformação (`enrichResult`) e
 * do mesmo merge (`mergeTestResults`), então o que existe no HTML existe no JSON.
 *
 * O QUE FOI MANTIDO DE PROPÓSITO (compatibilidade)
 * ------------------------------------------------
 * 1. `results` continua sendo a chave do array e continua PLANO (uma entrada por
 *    requisição, não por iteração). Dois testes e2e já consomem
 *    `report.results[0].request.url` via `--reporter-json`
 *    (tests/runner/cli-json-env-file e tests/runner/cli-env-combined); renomear para
 *    `requests` — como sugeria o plano original — quebraria os dois.
 * 2. Os nomes do resumo são os do `getRunnerSummary` (`totalRequests`, `passedRequests`,
 *    `failedRequests`, `skippedRequests`, ...), que é o MESMO resumo exibido no HTML. Um
 *    resumo com nomes próprios seria uma segunda fonte de verdade.
 *
 * As adições são todas novas chaves: `curl`, `databaseOperation`, `databaseOperations`
 * (por requisição) e `databaseOperations` (consolidado no topo).
 */
export const generateJsonReport = ({
  runnerResults,
  version = '',
  environment = null,
  runCompletionTime = '',
  includeSensitive = false,
  includeDbRows = true
}: {
  runnerResults: T_RunnerResults[];
  version?: string;
  environment?: string | null;
  runCompletionTime?: string;
  includeSensitive?: boolean;
  includeDbRows?: boolean;
}): T_JsonReport => {
  // 1. Mesma transformação por requisição que o HTML usa (redação de imagem, isHtml,
  //    curl respeitando includeSensitive, operações de banco redigidas DESTA requisição).
  const iterations = (runnerResults || []).map(({ iterationIndex, results, summary }) => ({
    iterationIndex,
    results: (results || []).map((result) => enrichResult(result, includeSensitive, includeDbRows)),
    summary: summary as unknown as Record<string, unknown>
  }));

  // 2. Mesma regra de merge do template (pré-requisição + pós-resposta + tests), para o
  //    JSON listar os testes exatamente como a aba Tests do HTML lista.
  mergeTestResults(iterations);

  const results = iterations.flatMap((iteration) => iteration.results);

  // 3. Cada requisição ganha também a forma singular que o relatório descreve
  //    (`databaseOperation`), sem perder a lista completa quando o script roda varias
  //    operações na mesma requisição.
  const resultsWithSingularOperation = results.map((result) => {
    const operations = Array.isArray(result.databaseOperations) ? result.databaseOperations : [];

    return {
      ...result,
      databaseOperation: operations.length > 0 ? operations[0] : null
    };
  });

  return {
    version,
    environment,
    runCompletionTime,
    // Mesmo resumo do HTML (`getRunnerSummary`), calculado sobre o resultado já com os
    // testes mesclados.
    summary: getRunnerSummary(results as never),
    results: resultsWithSingularOperation,
    databaseOperations: collectDatabaseOperations(runnerResults, includeSensitive, includeDbRows)
  };
};

export default generateJsonReport;
