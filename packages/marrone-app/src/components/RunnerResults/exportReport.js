import { generateHtmlReport, getRunnerSummary } from '@marrone/common/runner';
import { version as appVersion } from '../../../package.json';

// Maps a desktop runner item (+ its stored exchange) to the shape expected by
// generateHtmlReport (T_RunnerRequestExecutionResult), the same shape the CLI
// reporter produces.
const mapItemToRunnerResult = (item, exchange) => {
  const requestSent = exchange?.requestSent ?? item?.requestSent ?? {};
  const responseReceived = exchange?.responseReceived ?? item?.responseReceived ?? {};

  const status
    = item?.status === 'error' ? 'error'
      : item?.status === 'skipped' ? 'skipped'
        : 'pass';

  return {
    iterationIndex: 0,
    name: item?.name || item?.displayName || item?.uid || '',
    path: item?.displayName || item?.pathname || item?.name || '',
    request: {
      method: requestSent?.method || 'GET',
      url: requestSent?.url || '',
      headers: requestSent?.headers || {},
      data: requestSent?.data
    },
    response: {
      status: responseReceived?.status ?? (item?.status === 'skipped' ? 'skipped' : 0),
      statusText: responseReceived?.statusText || '',
      headers: responseReceived?.headers || {},
      data: responseReceived?.data,
      responseTime: responseReceived?.responseTime || responseReceived?.duration || 0
    },
    status,
    skipped: item?.status === 'skipped',
    skipReason: item?.skipReason,
    error: item?.error || null,
    assertionResults: item?.assertionResults || [],
    testResults: item?.testResults || [],
    preRequestTestResults: item?.preRequestTestResults || [],
    postResponseTestResults: item?.postResponseTestResults || [],
    runDuration: responseReceived?.duration || responseReceived?.responseTime || 0
  };
};

/**
 * Builds the HTML and JSON report strings from desktop runner items + exchanges.
 *
 * @param {Object} opts
 * @param {Array}  opts.items             runnerResult.items (with uid, requestUid, status, tests...)
 * @param {Object} opts.exchanges         map of { [requestUid]: { requestSent, responseReceived } }
 * @param {string} opts.version           version label shown in the report
 * @param {string|null} opts.environment  environment name
 * @param {string} opts.logo              data-URL logo
 * @param {boolean} opts.includeSensitive whether CURL commands include credential headers
 * @param {string} opts.runCompletionTime ISO timestamp
 */
export const buildRunnerReport = ({
  items = [],
  exchanges = {},
  version,
  environment = null,
  logo = '',
  includeSensitive = false,
  runCompletionTime = ''
}) => {
  const results = items.map((item) => mapItemToRunnerResult(item, exchanges[item.requestUid]));
  const summary = getRunnerSummary(results);
  const runnerResults = [{ iterationIndex: 0, results, summary }];

  const html = generateHtmlReport({
    runnerResults,
    version: version || `Marrone v${appVersion}`,
    environment,
    runCompletionTime,
    logo,
    includeSensitive
  });

  const json = JSON.stringify({ summary, results }, null, 2);

  return { html, json, summary };
};

export default buildRunnerReport;
