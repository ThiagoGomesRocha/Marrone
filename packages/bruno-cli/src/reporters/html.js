const fs = require('fs');
const path = require('path');
const { generateHtmlReport } = require('@usebruno/common/runner');
const { CLI_VERSION } = require('../constants');

const readLogoAsDataUrl = (logoPath) => {
  if (!logoPath) {
    return '';
  }
  const absolute = path.resolve(logoPath);
  const data = fs.readFileSync(absolute);
  const ext = path.extname(absolute).toLowerCase();
  const mime
    = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.png' ? 'image/png'
        : ext === '.webp' ? 'image/webp'
          : ext === '.gif' ? 'image/gif'
            : ext === '.svg' ? 'image/svg+xml'
              : 'image/png';
  return `data:${mime};base64,${data.toString('base64')}`;
};

const makeHtmlOutput = async (results, outputPath, runCompletionTime, environment = null, options = {}) => {
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

  const htmlString = generateHtmlReport({
    runnerResults: runnerResults,
    version: `Marrone v${CLI_VERSION}`,
    environment: environment,
    runCompletionTime: runCompletionTime,
    logo: readLogoAsDataUrl(options.logoPath),
    includeSensitive: options.includeSensitive === true
  });
  fs.writeFileSync(outputPath, htmlString);
};

module.exports = makeHtmlOutput;
