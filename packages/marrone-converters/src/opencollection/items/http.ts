import { uuid } from '../../common/index.js';
import {
  fromOpenCollectionHeaders,
  toOpenCollectionHeaders,
  fromOpenCollectionParams,
  toOpenCollectionParams,
  fromOpenCollectionBody,
  toOpenCollectionBody,
  fromOpenCollectionAuth,
  toOpenCollectionAuth,
  fromOpenCollectionScripts,
  toOpenCollectionScripts,
  fromOpenCollectionVariables,
  toOpenCollectionVariables,
  fromOpenCollectionActions,
  toOpenCollectionActions,
  fromOpenCollectionAssertions,
  toOpenCollectionAssertions,
  resolveTimeoutSetting
} from '../common';
import { utils, HTTP_SCRIPT_KEYS } from '@marrone/common';
import type {
  HttpRequest,
  HttpRequestSettings,
  HttpRequestExample,
  HttpRequestInfo,
  HttpRequestDetails,
  HttpRequestRuntime,
  HttpRequestHeader,
  HttpRequestBody,
  Auth,
  MarroneItem,
  MarroneKeyValue,
  MarroneHttpRequestParam,
  MarroneExample,
  MarroneHttpRequest
} from '../types';
import type { HttpItemSettings as MarroneHttpItemSettings } from '@marrone/schema-types/collection/item';


const { toBool, toMaxRedirects } = utils;

const getHttpBody = (body: HttpRequestBody | Array<{ title: string; selected?: boolean; body: HttpRequestBody }> | undefined): HttpRequestBody | undefined => {
  if (!body) return undefined;
  if (Array.isArray(body)) {
    const selected = body.find((v) => v.selected);
    return selected?.body || body[0]?.body;
  }
  return body;
};

export const fromOpenCollectionHttpItem = (ocRequest: HttpRequest): MarroneItem => {
  const info = ocRequest.info;
  const http = ocRequest.http;
  const runtime = ocRequest.runtime;

  const scripts = fromOpenCollectionScripts(runtime?.scripts, HTTP_SCRIPT_KEYS);
  const httpBody = getHttpBody(http?.body as HttpRequestBody);

  // variables (pre-request from variables, post-response from actions)
  const variables = fromOpenCollectionVariables(runtime?.variables);
  const postResponseVars = fromOpenCollectionActions(runtime?.actions);

  const marroneRequest: MarroneHttpRequest = {
    url: http?.url || '',
    method: http?.method || 'GET',
    headers: fromOpenCollectionHeaders(http?.headers) || [],
    params: fromOpenCollectionParams(http?.params) || [],
    body: fromOpenCollectionBody(httpBody) || {
      mode: 'none',
      json: null,
      text: null,
      xml: null,
      sparql: null,
      formUrlEncoded: [],
      multipartForm: [],
      graphql: null,
      file: []
    },
    auth: fromOpenCollectionAuth(http?.auth as Auth),
    script: {
      req: scripts?.script?.req || null,
      res: scripts?.script?.res || null
    },
    vars: {
      req: variables.req,
      res: postResponseVars
    },
    assertions: fromOpenCollectionAssertions(runtime?.assertions) || [],
    tests: scripts?.tests || null,
    docs: ocRequest.docs || null
  };

  const marroneItem: MarroneItem = {
    uid: uuid(),
    type: 'http-request',
    seq: info?.seq || 1,
    name: info?.name || 'Untitled Request',
    tags: info?.tags || [],
    request: marroneRequest,
    settings: null,
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  if (ocRequest.settings) {
    const settings: MarroneHttpItemSettings = {
      encodeUrl: toBool(ocRequest.settings.encodeUrl, true),
      timeout: resolveTimeoutSetting(ocRequest.settings.timeout),
      followRedirects: toBool(ocRequest.settings.followRedirects, true),
      maxRedirects: toMaxRedirects(ocRequest.settings.maxRedirects),
      forwardAuthorizationHeader: toBool(ocRequest.settings.forwardAuthorizationHeader, true)
    };
    if (Array.isArray(ocRequest.settings.omitHeaders) && ocRequest.settings.omitHeaders.length) {
      settings.omitHeaders = ocRequest.settings.omitHeaders;
    }
    marroneItem.settings = settings;
  }

  if (ocRequest.examples?.length) {
    marroneItem.examples = ocRequest.examples.map((example): MarroneExample => ({
      uid: uuid(),
      itemUid: marroneItem.uid,
      name: example.name || 'Untitled Example',
      description: typeof example.description === 'string' ? example.description : (example.description as { content?: string })?.content || null,
      type: 'http-request',
      request: {
        url: example.request?.url || '',
        method: example.request?.method || 'GET',
        headers: fromOpenCollectionHeaders(example.request?.headers) || [],
        params: fromOpenCollectionParams(example.request?.params) || [],
        body: fromOpenCollectionBody(example.request?.body) || null
      },
      response: example.response ? {
        status: example.response.status || 200,
        statusText: example.response.statusText || 'OK',
        headers: fromOpenCollectionHeaders(example.response.headers as HttpRequestHeader[]) || [],
        body: example.response.body ? {
          type: example.response.body.type || 'text',
          content: example.response.body.data || ''
        } : null
      } : null
    }));
  }

  return marroneItem;
};

export const toOpenCollectionHttpItem = (item: MarroneItem): HttpRequest => {
  const ocRequest: HttpRequest = {};
  const marroneRequest = item.request as MarroneHttpRequest;
  const marroneSettings = item.settings as MarroneHttpItemSettings | undefined;

  const info: HttpRequestInfo = {
    name: item.name || 'Untitled Request',
    type: 'http'
  };
  if (item.seq) {
    info.seq = item.seq;
  }
  if (item.tags?.length) {
    info.tags = item.tags;
  }
  ocRequest.info = info;

  const http: HttpRequestDetails = {
    method: marroneRequest?.method || 'GET',
    url: marroneRequest?.url || ''
  };

  const headers = toOpenCollectionHeaders(marroneRequest?.headers as MarroneKeyValue[]);
  if (headers) {
    http.headers = headers;
  }

  const params = toOpenCollectionParams(marroneRequest?.params as MarroneHttpRequestParam[]);
  if (params) {
    http.params = params;
  }

  const body = toOpenCollectionBody(marroneRequest?.body);
  if (body) {
    http.body = body;
  }

  // auth
  const auth = toOpenCollectionAuth(marroneRequest?.auth);
  if (auth) {
    http.auth = auth;
  }

  ocRequest.http = http;

  const runtime: HttpRequestRuntime = {};
  let hasRuntime = false;

  const variables = toOpenCollectionVariables(marroneRequest?.vars);
  if (variables) {
    runtime.variables = variables;
    hasRuntime = true;
  }

  const scripts = toOpenCollectionScripts(marroneRequest, HTTP_SCRIPT_KEYS);
  if (scripts) {
    runtime.scripts = scripts;
    hasRuntime = true;
  }

  const assertions = toOpenCollectionAssertions(marroneRequest?.assertions as MarroneKeyValue[]);
  if (assertions) {
    runtime.assertions = assertions;
    hasRuntime = true;
  }

  // actions (from post-response variables)
  const resVars = marroneRequest?.vars?.res;
  const actions = toOpenCollectionActions(resVars);
  if (actions) {
    runtime.actions = actions;
    hasRuntime = true;
  }

  if (hasRuntime) {
    ocRequest.runtime = runtime;
  }

  const settings: HttpRequestSettings = {
    encodeUrl: toBool(marroneSettings?.encodeUrl, true),
    timeout: resolveTimeoutSetting(marroneSettings?.timeout),
    followRedirects: toBool(marroneSettings?.followRedirects, true),
    maxRedirects: toMaxRedirects(marroneSettings?.maxRedirects),
    forwardAuthorizationHeader: toBool(marroneSettings?.forwardAuthorizationHeader, true)
  };
  if (Array.isArray(marroneSettings?.omitHeaders) && marroneSettings.omitHeaders.length) {
    settings.omitHeaders = marroneSettings.omitHeaders;
  }
  ocRequest.settings = settings;

  if (marroneRequest?.docs) {
    ocRequest.docs = marroneRequest.docs;
  }

  if (item.examples?.length) {
    ocRequest.examples = item.examples.map((example): HttpRequestExample => {
      const ocExample: HttpRequestExample = {
        name: example.name || 'Untitled Example'
      };

      if (example.description) {
        ocExample.description = example.description;
      }

      if (example.request) {
        ocExample.request = {
          url: example.request.url || '',
          method: example.request.method || 'GET'
        };

        const exampleHeaders = toOpenCollectionHeaders(example.request.headers as MarroneKeyValue[]);
        if (exampleHeaders) {
          ocExample.request.headers = exampleHeaders;
        }

        const exampleParams = toOpenCollectionParams(example.request.params as MarroneHttpRequestParam[]);
        if (exampleParams) {
          ocExample.request.params = exampleParams;
        }

        const exampleBody = toOpenCollectionBody(example.request.body);
        if (exampleBody) {
          ocExample.request.body = exampleBody;
        }
      }

      if (example.response) {
        ocExample.response = {};

        if (example.response.status !== undefined) {
          ocExample.response.status = Number(example.response.status);
        }

        if (example.response.statusText) {
          ocExample.response.statusText = example.response.statusText;
        }

        const responseHeaders = toOpenCollectionHeaders(example.response.headers as MarroneKeyValue[]);
        if (responseHeaders) {
          ocExample.response.headers = responseHeaders;
        }

        if (example.response.body) {
          ocExample.response.body = {
            type: (example.response.body.type as 'json' | 'text' | 'xml' | 'html' | 'binary') || 'text',
            data: String(example.response.body.content || '')
          };
        }
      }

      return ocExample;
    });
  }

  return ocRequest;
};
