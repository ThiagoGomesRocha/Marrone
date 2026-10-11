import type { Item as MarroneItem } from '@marrone/schema-types/collection/item';
import type { KeyValue as MarroneKeyValue } from '@marrone/schema-types/common/key-value';
import type { GrpcRequest as MarroneGrpcRequest } from '@marrone/schema-types/requests/grpc';
import type { GrpcRequest, GrpcMetadata, GrpcMessageVariant, GrpcMessage, GrpcRequestInfo, GrpcRequestDetails, GrpcRequestRuntime } from '@opencollection/types/requests/grpc';
import type { Auth } from '@opencollection/types/common/auth';
import type { Scripts } from '@opencollection/types/common/scripts';
import type { Variable } from '@opencollection/types/common/variables';
import type { Assertion } from '@opencollection/types/common/assertions';
import { stringifyYml } from '../utils';
import { isNonEmptyString } from '../../../utils';
import { toOpenCollectionAuth } from '../common/auth';
import { toOpenCollectionVariables } from '../common/variables';
import { toOpenCollectionScripts } from '../common/scripts';
import { toOpenCollectionAssertions } from '../common/assertions';
import { GRPC_SCRIPT_KEYS } from '@marrone/common';

const stringifyGrpcRequest = (item: MarroneItem): string => {
  try {
    const ocRequest: GrpcRequest = {};
    const marroneRequest = item.request as MarroneGrpcRequest;

    // info block
    const info: GrpcRequestInfo = {
      name: isNonEmptyString(item.name) ? item.name : 'Untitled Request',
      type: 'grpc'
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

    // grpc block
    const grpc: GrpcRequestDetails = {
      url: isNonEmptyString(marroneRequest.url) ? marroneRequest.url : '',
      method: isNonEmptyString(marroneRequest.method) ? marroneRequest.method : ''
    };

    // method type
    if (marroneRequest.methodType) {
      grpc.methodType = marroneRequest.methodType;
    }

    // proto file path
    if (isNonEmptyString(marroneRequest.protoPath)) {
      grpc.protoFilePath = marroneRequest.protoPath;
    }

    // metadata
    if (marroneRequest.headers?.length) {
      const metadata: GrpcMetadata[] = marroneRequest.headers.map((header: MarroneKeyValue) => {
        const metadataItem: GrpcMetadata = {
          name: header.name || '',
          value: header.value || ''
        };

        if (header?.description?.trim().length) {
          metadataItem.description = header.description;
        }

        if (header.enabled === false) {
          metadataItem.disabled = true;
        }

        return metadataItem;
      });

      if (metadata.length) {
        grpc.metadata = metadata;
      }
    }

    // message
    if (marroneRequest.body?.mode === 'grpc' && marroneRequest.body.grpc?.length) {
      const messages: GrpcMessageVariant[] = marroneRequest.body.grpc.map(({ name, content }, index) => ({
        title: name || `message ${index + 1}`,
        message: content || ''
      }));
      grpc.message = messages;
    }

    // auth
    const auth: Auth | undefined = toOpenCollectionAuth(marroneRequest.auth);
    if (auth) {
      grpc.auth = auth;
    }

    ocRequest.grpc = grpc;

    // runtime block
    const runtime: GrpcRequestRuntime = {};
    let hasRuntime = false;

    // variables
    const variables: Variable[] | undefined = toOpenCollectionVariables(marroneRequest.vars);
    if (variables) {
      runtime.variables = variables;
      hasRuntime = true;
    }

    // scripts
    const scripts: Scripts | undefined = toOpenCollectionScripts(marroneRequest, GRPC_SCRIPT_KEYS);
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

    if (hasRuntime) {
      ocRequest.runtime = runtime;
    }

    // docs
    if (isNonEmptyString(marroneRequest.docs)) {
      ocRequest.docs = marroneRequest.docs;
    }

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying gRPC request:', error);
    throw error;
  }
};

export default stringifyGrpcRequest;
