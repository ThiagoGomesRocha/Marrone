const fs = require('fs');
const { generateJsonReport } = require('@marrone/common/runner');
const { CLI_VERSION } = require('../constants');

/**
 * Reporter JSON do CLI.
 *
 * Espelha o reporter HTML: os dois consomem o MESMO gerador de dados em @marrone/common,
 * então o JSON tem as mesmas informações que o HTML (CURL, testes mesclados de
 * pré/pós-requisição, operações de banco redigidas) — antes o `--reporter-json` gravava o
 * objeto interno do CLI cru, sem nada disso.
 */
const makeJsonOutput = async (results, outputPath, runCompletionTime, environment = null, options = {}) => {
  let runnerResults = results;
  if (!results) {
    runnerResults = [];
  } else if (results.results) {
    // Convert CLI format to expected format: array of { iterationIndex, results, summary }
    runnerResults = [{
      iterationIndex: 0,
      results: results.results,
      summary: results.summary
    }];
  } else if (Array.isArray(results)) {
    runnerResults = results;
  }

  const report = generateJsonReport({
    runnerResults: runnerResults,
    version: `Marrone v${CLI_VERSION}`,
    environment: environment,
    runCompletionTime: runCompletionTime,
    includeSensitive: options.includeSensitive === true,
    // Linhas do resultado por padrão; use --reporter-hide-db-rows para um relatório só
    // com metadados (mesma decisão do HTML, pelo mesmo motivo: o arquivo circula).
    includeDbRows: options.includeDbRows !== false
  });

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
};

module.exports = makeJsonOutput;
