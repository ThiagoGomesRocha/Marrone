import type { Item as MarroneItem } from '@marrone/schema-types/collection/item';
import type { GrpcRequest as MarroneGrpcRequest } from '@marrone/schema-types/requests/grpc';
import type { GrpcRequest, GrpcMetadata, GrpcMessageVariant } from '@opencollection/types/requests/grpc';
import type { KeyValue as MarroneKeyValue } from '@marrone/schema-types/common/key-value';
import { toMarroneAuth } from '../common/auth';
import { toMarroneVariables } from '../common/variables';
import { toMarroneScripts } from '../common/scripts';
import { toMarroneAssertions } from '../common/assertions';
import { isNonEmptyString, uuid, ensureString } from '../../../utils';

const toMarroneGrpcMetadata = (metadata: GrpcMetadata[] | null | undefined): MarroneKeyValue[] | undefined => {
  if (!metadata?.length) {
    return undefined;
  }

  const marroneMetadata = metadata.map((meta: GrpcMetadata): MarroneKeyValue => {
    const marroneMeta: MarroneKeyValue = {
      uid: uuid(),
      name: ensureString(meta.name),
      value: ensureString(meta.value),
      enabled: meta.disabled !== true
    };

    if (meta.description) {
      const desc = typeof meta.description === 'string' ? meta.description : (meta.description as any)?.content || '';
      if (desc.trim().length) {
        marroneMeta.description = desc;
      }
    }

    return marroneMeta;
  });

  return marroneMetadata.length ? marroneMetadata : undefined;
};

const parseGrpcRequest = (ocRequest: GrpcRequest): MarroneItem => {
  const info = ocRequest.info;
  const grpc = ocRequest.grpc;
  const runtime = ocRequest.runtime;

  const marroneRequest: MarroneGrpcRequest = {
    url: ensureString(grpc?.url),
    method: ensureString(grpc?.method),
    methodType: grpc?.methodType || '',
    protoPath: grpc?.protoFilePath || null,
    headers: toMarroneGrpcMetadata(grpc?.metadata) || [],
    auth: toMarroneAuth(grpc?.auth),
    body: {
      mode: 'grpc',
      grpc: []
    },
    script: {
      beforeCallStart: null,
      beforeMessageSend: null,
      afterMessageReceive: null,
      afterCallEnd: null
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
  const rawMessage = grpc?.message;
  if (Array.isArray(rawMessage)) {
    marroneRequest.body.grpc = (rawMessage as GrpcMessageVariant[]).map(({ title, message }, index) => ({
      name: title || `message ${index + 1}`,
      content: ensureString(message)
    }));
  } else if (isNonEmptyString(rawMessage)) {
    marroneRequest.body.grpc = [{
      name: '',
      content: rawMessage as string
    }];
  }

  // scripts
  const scripts = toMarroneScripts(runtime?.scripts);
  if (scripts?.script && marroneRequest.script) {
    if (scripts.script.beforeCallStart) {
      marroneRequest.script.beforeCallStart = scripts.script.beforeCallStart;
    }
    if (scripts.script.beforeMessageSend) {
      marroneRequest.script.beforeMessageSend = scripts.script.beforeMessageSend;
    }
    if (scripts.script.afterMessageReceive) {
      marroneRequest.script.afterMessageReceive = scripts.script.afterMessageReceive;
    }
    if (scripts.script.afterCallEnd) {
      marroneRequest.script.afterCallEnd = scripts.script.afterCallEnd;
    }
  }
  if (scripts?.tests) {
    marroneRequest.tests = scripts.tests;
  }

  // variables
  const variables = toMarroneVariables(runtime?.variables);
  marroneRequest.vars = variables;

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
    type: 'grpc-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
    tags: info?.tags || [],
    request: marroneRequest,
    settings: {},
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

export default parseGrpcRequest;
