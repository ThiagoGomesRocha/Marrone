import { T_RunnerResults } from '../../types';
import { isHtmlContentType, getContentType, redactImageData, encodeBase64 } from '../../utils';
import { buildCurl } from './curl';
import htmlTemplateString from './template';

const generateHtmlReport = ({
  runnerResults,
  version = '', // Default to empty string if not provided
  environment = null, // Default environment if not provided
  runCompletionTime = '', // Default run completion time if not provided
  logo = '', // Optional data-URL (data:image/png;base64,...) shown in the report header
  includeSensitive = false // Whether to include credential headers/query params in generated CURL commands
}: {
  runnerResults: T_RunnerResults[];
  version?: string;
  environment?: string | null;
  runCompletionTime?: string;
  logo?: string;
  includeSensitive?: boolean;
}): string => {
  const resultsWithSummaryAndCleanData = runnerResults.map(({ iterationIndex, results, summary }) => {
    return {
      iterationIndex,
      results: results.map((result) => {
        const { request, response } = result || {};
        const requestContentType = request?.headers ? getContentType(request?.headers) : '';
        const responseContentType = response?.headers ? getContentType(response?.headers) : '';
        return {
          ...result,
          request: {
            ...result.request,
            data: request?.data ? redactImageData(request?.data, requestContentType) : request?.data,
            isHtml: isHtmlContentType(requestContentType)
          },
          response: {
            ...result.response,
            data: response?.data ? redactImageData(response?.data, responseContentType) : response?.data,
            isHtml: isHtmlContentType(responseContentType)
          },
          curl: buildCurl(request, { includeSensitive })
        };
      }),
      summary
    };
  });
  const htmlString = htmlTemplateString(encodeBase64(JSON.stringify({
    results: resultsWithSummaryAndCleanData,
    version,
    environment,
    runCompletionTime,
    logo
  })));
  return htmlString;
};

export { generateHtmlReport };
