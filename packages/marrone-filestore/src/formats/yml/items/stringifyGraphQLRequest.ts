import type { Item as MarroneItem, HttpItemSettings as MarroneHttpItemSettings } from '@marrone/schema-types/collection/item';
import type { HttpRequest as MarroneHttpRequest } from '@marrone/schema-types/requests/http';
import type { GraphQLRequest, GraphQLRequestSettings, GraphQLBody, GraphQLRequestInfo, GraphQLRequestDetails, GraphQLRequestRuntime } from '@opencollection/types/requests/graphql';
import type { Auth } from '@opencollection/types/common/auth';
import type { Scripts } from '@opencollection/types/common/scripts';
import type { Variable } from '@opencollection/types/common/variables';
import type { Assertion } from '@opencollection/types/common/assertions';
import type { Action } from '@opencollection/types/common/actions';
import type { HttpRequestParam, HttpRequestHeader } from '@opencollection/types/requests/http';
import { stringifyYml } from '../utils';
import { isNonEmptyString } from '../../../utils';
import { toOpenCollectionAuth } from '../common/auth';
import { toOpenCollectionHttpHeaders } from '../common/headers';
import { toOpenCollectionParams } from '../common/params';
import { toOpenCollectionVariables } from '../common/variables';
import { toOpenCollectionActions } from '../common/actions';
import { toOpenCollectionScripts } from '../common/scripts';
import { toOpenCollectionAssertions } from '../common/assertions';
import { resolveTimeoutSetting, toMaxRedirects } from '@marrone/common/utils';
import { HTTP_SCRIPT_KEYS } from '@marrone/common';

const stringifyGraphQLRequest = (item: MarroneItem): string => {
  try {
    const ocRequest: GraphQLRequest = {};
    const marroneRequest = item.request as MarroneHttpRequest;

    // info block
    const info: GraphQLRequestInfo = {
      name: isNonEmptyString(item.name) ? item.name : 'Untitled Request',
      type: 'graphql'
    };
    if (item.seq) {
      info.seq = item.seq;
    }
    if (item.tags?.length) {
      info.tags = item.tags;
    }
    if (isNonEmptyString(item.description)) {
      info.description = item.description;
    }
    ocRequest.info = info;

    // graphql block
    const graphql: GraphQLRequestDetails = {
      method: isNonEmptyString(marroneRequest.method) ? marroneRequest.method : 'POST',
      url: isNonEmptyString(marroneRequest.url) ? marroneRequest.url : ''
    };

    // headers
    const headers: HttpRequestHeader[] | undefined = toOpenCollectionHttpHeaders(marroneRequest.headers);
    if (headers) {
      graphql.headers = headers;
    }

    // params
    const params: HttpRequestParam[] | undefined = toOpenCollectionParams(marroneRequest.params);
    if (params) {
      graphql.params = params;
    }

    // body
    if (marroneRequest.body?.mode === 'graphql' && marroneRequest.body.graphql) {
      const graphqlBody: GraphQLBody = {};
      let hasBody = false;

      if (isNonEmptyString(marroneRequest.body.graphql.query)) {
        graphqlBody.query = marroneRequest.body.graphql.query;
        hasBody = true;
      }

      if (isNonEmptyString(marroneRequest.body.graphql.variables)) {
        graphqlBody.variables = marroneRequest.body.graphql.variables;
        hasBody = true;
      }

      if (hasBody) {
        graphql.body = graphqlBody;
      }
    }

    // auth (in graphql block, not runtime)
    const auth: Auth | undefined = toOpenCollectionAuth(marroneRequest.auth);
    if (auth) {
      graphql.auth = auth;
    }

    ocRequest.graphql = graphql;

    // runtime block
    const runtime: GraphQLRequestRuntime = {};
    let hasRuntime = false;

    // variables
    const variables: Variable[] | undefined = toOpenCollectionVariables(marroneRequest.vars);
    if (variables) {
      runtime.variables = variables;
      hasRuntime = true;
    }

    // scripts
    const scripts: Scripts | undefined = toOpenCollectionScripts(marroneRequest, HTTP_SCRIPT_KEYS);
    if (scripts) {
      runtime.scripts = scripts;
      hasRuntime = true;
    }

    // assertions
    const assertions: Assertion[] | undefined = toOpenCollectionAssertions(marroneRequest.assertions);
    if (assertions) {
      runtime.assertions = assertions;
      hasRuntime = true;
    }

    // actions (from post-response variables)
    const resVars = marroneRequest.vars?.res;
    const actions: Action[] | undefined = toOpenCollectionActions(resVars);
    if (actions) {
      runtime.actions = actions;
      hasRuntime = true;
    }

    if (hasRuntime) {
      ocRequest.runtime = runtime;
    }

    // settings
    const httpSettings = item.settings as MarroneHttpItemSettings | undefined;
    const settings: GraphQLRequestSettings = {};
    if (httpSettings?.encodeUrl === true) {
      settings.encodeUrl = true;
    } else if (httpSettings?.encodeUrl === false) {
      settings.encodeUrl = false;
    } else {
      settings.encodeUrl = true;
    }

    settings.timeout = resolveTimeoutSetting(httpSettings?.timeout);

    if (httpSettings?.followRedirects === true) {
      settings.followRedirects = true;
    } else if (httpSettings?.followRedirects === false) {
      settings.followRedirects = false;
    } else {
      settings.followRedirects = true;
    }

    settings.maxRedirects = toMaxRedirects(httpSettings?.maxRedirects);

    settings.forwardAuthorizationHeader = httpSettings?.forwardAuthorizationHeader ?? true;

    ocRequest.settings = settings;

    // docs
    if (isNonEmptyString(marroneRequest.docs)) {
      ocRequest.docs = marroneRequest.docs;
    }

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying GraphQL request:', error);
    throw error;
  }
};

export default stringifyGraphQLRequest;
