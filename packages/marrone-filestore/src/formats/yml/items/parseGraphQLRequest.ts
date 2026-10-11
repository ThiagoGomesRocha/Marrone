import type { Item as MarroneItem, HttpItemSettings as MarroneHttpItemSettings } from '@marrone/schema-types/collection/item';
import type { HttpRequest as MarroneHttpRequest } from '@marrone/schema-types/requests/http';
import type { GraphQLRequest, GraphQLRequestSettings, GraphQLBody } from '@opencollection/types/requests/graphql';
import { toMarroneAuth } from '../common/auth';
import { toMarroneHttpHeaders } from '../common/headers';
import { toMarroneParams } from '../common/params';
import { toMarroneVariables } from '../common/variables';
import { toMarronePostResponseVariables } from '../common/actions';
import { toMarroneScripts } from '../common/scripts';
import { toMarroneAssertions } from '../common/assertions';
import { uuid, ensureString } from '../../../utils';
import { utils } from '@marrone/common';
const { toBool, toMaxRedirects } = utils;

const parseGraphQLRequest = (ocRequest: GraphQLRequest): MarroneItem => {
  const info = ocRequest.info;
  const graphql = ocRequest.graphql;
  const runtime = ocRequest.runtime;

  const marroneRequest: MarroneHttpRequest = {
    url: ensureString(graphql?.url),
    method: ensureString(graphql?.method, 'POST'),
    headers: toMarroneHttpHeaders(graphql?.headers) || [],
    params: toMarroneParams(graphql?.params) || [],
    auth: toMarroneAuth(graphql?.auth),
    body: {
      mode: 'graphql',
      json: null,
      text: null,
      xml: null,
      sparql: null,
      formUrlEncoded: [],
      multipartForm: [],
      graphql: {
        query: (graphql?.body as GraphQLBody)?.query || '',
        variables: (graphql?.body as GraphQLBody)?.variables || ''
      },
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

  // marrone item
  const marroneItem: MarroneItem = {
    uid: uuid(),
    type: 'graphql-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
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

    marroneItem.settings = settings;
  }

  return marroneItem;
};

export default parseGraphQLRequest;
