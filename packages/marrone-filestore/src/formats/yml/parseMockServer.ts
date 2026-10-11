import { parseYml } from './utils';
import { ensureString, isNonEmptyString } from '../../utils';
import { toMarroneHttpHeaders } from './common/headers';
import { toMarroneParams } from './common/params';
import { toMarroneBody } from './common/body';
import type {
  MockServerFile,
  MockRouteEntry,
  MarroneMockServer,
  MarroneMockRoute,
  MockRuleCondition
} from './mockServerTypes';

const emptyRequestBody = () => ({
  mode: 'none',
  json: null,
  text: null,
  xml: null,
  sparql: null,
  formUrlEncoded: null,
  multipartForm: null,
  graphql: null,
  file: null
});

const toMarroneRuleConditions = (conditions: MockRuleCondition[] | null | undefined) => {
  if (!Array.isArray(conditions)) {
    return [];
  }

  return conditions.map((condition) => ({
    target: ensureString(condition?.target),
    key: ensureString(condition?.key),
    operator: ensureString(condition?.operator, 'equals'),
    value: ensureString(condition?.value)
  }));
};

const toMarroneMockRoute = (route: MockRouteEntry): MarroneMockRoute => {
  const responseStatus = Number(route?.response?.status) || 200;
  const responseStatusText = ensureString(route?.response?.statusText);

  const marroneRoute: MarroneMockRoute = {
    name: ensureString(route?.name, 'Untitled Mock Response'),
    description: ensureString(route?.description),
    request: {
      url: ensureString(route?.request?.url, '/'),
      method: ensureString(route?.request?.method, 'GET'),
      headers: toMarroneHttpHeaders(route?.request?.headers) || [],
      params: toMarroneParams(route?.request?.params) || [],
      body: toMarroneBody(route?.request?.body) || emptyRequestBody()
    },
    response: {
      status: responseStatus,
      statusText: responseStatusText === 'OK' && responseStatus !== 200 ? '' : responseStatusText,
      headers: toMarroneHttpHeaders(route?.response?.headers) || [],
      body: {
        type: ensureString(route?.response?.body?.type, 'json'),
        content: ensureString(route?.response?.body?.data)
      }
    },
    rules: {
      operator: route?.rules?.operator === 'OR' ? 'OR' : 'AND',
      conditions: toMarroneRuleConditions(route?.rules?.conditions)
    }
  };

  const rawExample = route?.copiedFrom?.example;
  const rawRequestPath = route?.copiedFrom?.requestPath;
  const copiedFromExample = isNonEmptyString(rawExample) ? rawExample : null;
  const copiedFromRequestPath = isNonEmptyString(rawRequestPath) ? rawRequestPath : null;

  if (copiedFromExample || copiedFromRequestPath) {
    marroneRoute.copiedFrom = {
      exampleName: copiedFromExample,
      requestPathname: copiedFromRequestPath
    };
  }

  return marroneRoute;
};

const parseMockServer = (content: string): MarroneMockServer => {
  const parsed: MockServerFile = parseYml(content);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid mock server file');
  }

  const info = parsed.info || ({} as NonNullable<MockServerFile['info']>);
  const mock = parsed.mock || ({} as NonNullable<MockServerFile['mock']>);

  const marroneMockServer: MarroneMockServer = {
    name: ensureString(info.name, 'Mock Server'),
    port: Number(mock.port) || null,
    delay: Number(mock.delay) || 0,
    source: null,
    routes: Array.isArray(parsed.routes) ? parsed.routes.map(toMarroneMockRoute) : []
  };

  const sourceType = mock.source?.type;
  const sourcePath = mock.source?.path;
  if ((sourceType === 'collection' || sourceType === 'spec') && isNonEmptyString(sourcePath)) {
    marroneMockServer.source = {
      type: sourceType,
      path: sourcePath
    };
  }

  return marroneMockServer;
};

export default parseMockServer;
