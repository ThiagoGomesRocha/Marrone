import type { Script as OpenCollectionScript, Scripts } from '@opencollection/types/common/scripts';
import type { FolderRequest as MarroneFolderRequest } from '@marrone/schema-types/collection/folder';
import type { HttpRequest as MarroneHttpRequest } from '@marrone/schema-types/requests/http';
import type { WebSocketRequest as MarroneWebSocketRequest } from '@marrone/schema-types/requests/websocket';
import type { GrpcRequest as MarroneGrpcRequest } from '@marrone/schema-types/requests/grpc';
import type { Script as MarroneScript } from '@marrone/schema-types/common/scripts';

export const toOpenCollectionScripts = (request: MarroneFolderRequest | MarroneHttpRequest | MarroneWebSocketRequest | MarroneGrpcRequest | null | undefined, allowedKeys: string[]): Scripts | undefined => {
  const ocScripts: Scripts = [];
  const script = request?.script as MarroneScript | null | undefined;

  const pushScript = (key: keyof MarroneScript, type: OpenCollectionScript['type'], code: string | null | undefined) => {
    if (!allowedKeys.includes(key)) {
      return;
    }
    if (!code?.trim().length) {
      return;
    }
    ocScripts.push({ type, code: code.trim() });
  };

  pushScript('req', 'before-request', script?.req);
  pushScript('res', 'after-response', script?.res);
  pushScript('beforeCallStart', 'grpc:before-call-start', script?.beforeCallStart);
  pushScript('beforeMessageSend', 'grpc:before-message-send', script?.beforeMessageSend);
  pushScript('afterMessageReceive', 'grpc:after-message-receive', script?.afterMessageReceive);
  pushScript('afterCallEnd', 'grpc:after-call-end', script?.afterCallEnd);

  if (request?.tests?.trim().length) {
    ocScripts.push({
      type: 'tests',
      code: request.tests.trim()
    });
  }

  return ocScripts.length > 0 ? ocScripts : undefined;
};

export const toMarroneScripts = (scripts: Scripts | null | undefined): {
  script?: MarroneScript;
  tests?: string;
} | undefined => {
  if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
    return undefined;
  }

  const marroneScripts: {
    script?: MarroneScript;
    tests?: string;
  } = {};

  const setScript = (key: keyof MarroneScript, code: string) => {
    if (!marroneScripts.script) {
      marroneScripts.script = {};
    }
    marroneScripts.script[key] = code;
  };

  for (const script of scripts) {
    if (!script.code) {
      continue;
    }

    switch (script.type) {
      case 'before-request':
        setScript('req', script.code);
        break;
      case 'after-response':
        setScript('res', script.code);
        break;
      case 'grpc:before-call-start':
        setScript('beforeCallStart', script.code);
        break;
      case 'grpc:before-message-send':
        setScript('beforeMessageSend', script.code);
        break;
      case 'grpc:after-message-receive':
        setScript('afterMessageReceive', script.code);
        break;
      case 'grpc:after-call-end':
        setScript('afterCallEnd', script.code);
        break;
      case 'tests':
        marroneScripts.tests = script.code;
        break;
    }
  }

  return Object.keys(marroneScripts).length > 0 ? marroneScripts : undefined;
};
