import type { Item as MarroneItem, HttpItemSettings as MarroneHttpItemSettings } from '@marrone/schema-types/collection/item';
import type { HttpRequest as MarroneHttpRequest } from '@marrone/schema-types/requests/http';
import type { HttpRequest, HttpRequestBody } from '@opencollection/types/requests/http';
import { toMarroneAuth } from '../common/auth';
import { toMarroneHttpHeaders } from '../common/headers';
import { toMarroneParams } from '../common/params';
import { toMarroneBody } from '../common/body';
import { toMarroneVariables } from '../common/variables';
import { toMarronePostResponseVariables } from '../common/actions';
import { toMarroneScripts } from '../common/scripts';
import { toMarroneAssertions } from '../common/assertions';
import { toMarroneApp } from '../common/app';
import { normalizeOmitHeaders } from '../common/omit-headers';
import { uuid, ensureString } from '../../../utils';
import { utils } from '@marrone/common';
const { toBool, toMaxRedirects } = utils;

const parseHttpRequest = (ocRequest: HttpRequest): MarroneItem => {
  const info = ocRequest.info;
  const http = ocRequest.http;
  const runtime = ocRequest.runtime;

  const marroneRequest: MarroneHttpRequest = {
    url: ensureString(http?.url),
    method: ensureString(http?.method, 'GET'),
    headers: toMarroneHttpHeaders(http?.headers) || [],
    params: toMarroneParams(http?.params) || [],
    auth: toMarroneAuth(http?.auth),
    body: toMarroneBody(http?.body as HttpRequestBody) || {
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
    script: {
      req: null,
      res: null
    },
    vars: {
      req: [],
      res: []
    },
    assertions: [],
    tests: null,
    docs: null
  };

  // scripts
  const scripts = toMarroneScripts(runtime?.scripts);
  if (scripts?.script && marroneRequest.script) {
    if (scripts.script.req) {
      marroneRequest.script.req = scripts.script.req;
    }
    if (scripts.script.res) {
      marroneRequest.script.res = scripts.script.res;
    }
  }
  if (scripts?.tests) {
    marroneRequest.tests = scripts.tests;
  }

  // variables (pre-request from variables, post-response from actions)
  const variables = toMarroneVariables(runtime?.variables);
  const postResponseVars = toMarronePostResponseVariables(runtime?.actions);
  marroneRequest.vars = {
    req: variables.req,
    res: postResponseVars
  };

  // assertions
  const assertions = toMarroneAssertions(runtime?.assertions);
  if (assertions) {
    marroneRequest.assertions = assertions;
  }

  // docs
  if (ocRequest.docs) {
    marroneRequest.docs = ocRequest.docs;
  }

  // app
  const app = toMarroneApp((ocRequest as any).app);

  // marrone item
  const marroneItem: MarroneItem = {
    uid: uuid(),
    type: 'http-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
    tags: info?.tags || [],
    request: marroneRequest,
    settings: null,
    app,
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  // description
  if (info?.description) {
    const desc = typeof info.description === 'string' ? info.description : (info.description as any)?.content || '';
    if (desc.trim().length) {
      marroneItem.description = desc;
    }
  }

  // settings
  if (ocRequest.settings) {
    const settings: MarroneHttpItemSettings = {};

    settings.encodeUrl = toBool(ocRequest.settings.encodeUrl, true);

    if (typeof ocRequest.settings.timeout === 'number') {
      settings.timeout = ocRequest.settings.timeout;
    } else if (ocRequest.settings.timeout === 'inherit') {
      settings.timeout = 'inherit';
    } else {
      settings.timeout = 0;
    }

    settings.followRedirects = toBool(ocRequest.settings.followRedirects, true);
    settings.maxRedirects = toMaxRedirects(ocRequest.settings.maxRedirects);
    settings.forwardAuthorizationHeader = toBool(ocRequest.settings.forwardAuthorizationHeader, true);

    const omitHeaders = normalizeOmitHeaders(ocRequest.settings.omitHeaders);
    if (omitHeaders) {
      settings.omitHeaders = omitHeaders;
    }

    marroneItem.settings = settings;
  }

  // examples
  if (ocRequest.examples?.length) {
    marroneItem.examples = ocRequest.examples.map((example) => {
      const marroneExample: any = {
        uid: uuid(),
        itemUid: uuid(),
        name: ensureString(example.name, 'Untitled Example'),
        type: 'http-request',
        request: null,
        response: null
      };

      if (example.description) {
        if (typeof example.description === 'string' && example.description.trim().length) {
          marroneExample.description = example.description;
        } else if (typeof example.description === 'object' && example.description.content?.trim().length) {
          marroneExample.description = example.description.content;
        }
      }

      if (example.request) {
        marroneExample.request = {
          url: ensureString(example.request.url),
          method: ensureString(example.request.method, 'GET'),
          headers: toMarroneHttpHeaders(example.request.headers) || [],
          params: toMarroneParams(example.request.params) || [],
          body: toMarroneBody(example.request.body) || {
            mode: 'none',
            json: null,
            text: null,
            xml: null,
            sparql: null,
            formUrlEncoded: null,
            multipartForm: null,
            graphql: null,
            file: null
          }
        };
      }

      if (example.response) {
        marroneExample.response = {
          status: typeof example.response.status === 'number' ? example.response.status
            : example.response.status !== undefined ? Number(example.response.status) : null,
          statusText: example.response.statusText || null,
          headers: toMarroneHttpHeaders(example.response.headers) || [],
          body: null
        };

        if (example.response.body) {
          marroneExample.response.body = {
            type: example.response.body.type || 'text',
            content: example.response.body.data || ''
          };
        }
      }

      return marroneExample;
    });
  }

  return marroneItem;
};

export default parseHttpRequest;
