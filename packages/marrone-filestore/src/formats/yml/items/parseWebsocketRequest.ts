import type { Item as MarroneItem } from '@marrone/schema-types/collection/item';
import type { WebSocketRequest as MarroneWebSocketRequest } from '@marrone/schema-types/requests/websocket';
import type { WebSocketRequest, WebSocketMessage, WebSocketMessageVariant } from '@opencollection/types/requests/websocket';
import { toMarroneAuth } from '../common/auth';
import { toMarroneHttpHeaders } from '../common/headers';
import { toMarroneVariables } from '../common/variables';
import { toMarroneScripts } from '../common/scripts';
import { uuid, ensureString } from '../../../utils';

const parseWebsocketRequest = (ocRequest: WebSocketRequest): MarroneItem => {
  const info = ocRequest.info;
  const websocket = ocRequest.websocket;
  const runtime = ocRequest.runtime;

  const marroneRequest: MarroneWebSocketRequest = {
    url: ensureString(websocket?.url),
    headers: toMarroneHttpHeaders(websocket?.headers) || [],
    auth: toMarroneAuth(websocket?.auth),
    body: {
      mode: 'ws',
      ws: []
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

  // message
  if (websocket?.message) {
    if (Array.isArray(websocket.message)) {
      // multiple messages: WebSocketMessageVariant[]
      const variants = websocket.message as WebSocketMessageVariant[];
      marroneRequest.body.ws = variants.map((variant, index) => ({
        name: variant.title || `message ${index + 1}`,
        type: variant.message?.type || 'text',
        content: ensureString(variant.message?.data),
        selected: variant.selected || false
      }));
    } else {
      // single message uses flat WebSocketMessage
      const message = websocket.message as WebSocketMessage;
      const messageData = ensureString(message.data);
      if (messageData.trim().length) {
        marroneRequest.body.ws = [{
          name: '',
          type: message.type || 'text',
          content: messageData
        }];
      }
    }
  }

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

  // variables
  const variables = toMarroneVariables(runtime?.variables);
  marroneRequest.vars = variables;

  // docs
  if (ocRequest.docs) {
    marroneRequest.docs = ocRequest.docs;
  }

  // settings
  const wsSettings: Record<string, number> = {
    timeout: 0,
    keepAliveInterval: 0
  };

  if (ocRequest.settings) {
    if (typeof ocRequest.settings.timeout === 'number') {
      wsSettings.timeout = ocRequest.settings.timeout;
    }
    if (typeof ocRequest.settings.keepAliveInterval === 'number') {
      wsSettings.keepAliveInterval = ocRequest.settings.keepAliveInterval;
    }
  }

  // marrone item
  const marroneItem: MarroneItem = {
    uid: uuid(),
    type: 'ws-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
    tags: info?.tags || [],
    request: marroneRequest,
    settings: wsSettings as any,
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

  return marroneItem;
};

export default parseWebsocketRequest;
