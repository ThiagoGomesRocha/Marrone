// OpenCollection types - main module
export type { OpenCollection, Extensions } from '@opencollection/types';

// OpenCollection collection/item types
export type { Item, Folder, FolderInfo } from '@opencollection/types/collection/item';

// OpenCollection HTTP request types
export type {
  HttpRequest,
  HttpRequestHeader,
  HttpResponseHeader,
  HttpRequestParam,
  HttpRequestBody,
  HttpRequestSettings,
  HttpRequestExample,
  HttpRequestExampleRequest,
  HttpRequestExampleResponse,
  HttpRequestExampleResponseBody,
  HttpRequestBodyVariant,
  HttpRequestInfo,
  HttpRequestDetails,
  HttpRequestRuntime,
  RawBody,
  FormUrlEncodedBody,
  FormUrlEncodedEntry,
  MultipartFormBody,
  MultipartFormEntry,
  FileBody,
  FileBodyVariant
} from '@opencollection/types/requests/http';

// OpenCollection GraphQL request types
export type {
  GraphQLRequest,
  GraphQLRequestSettings,
  GraphQLRequestInfo,
  GraphQLRequestDetails,
  GraphQLRequestRuntime,
  GraphQLBody,
  GraphQLBodyVariant
} from '@opencollection/types/requests/graphql';

// OpenCollection gRPC request types
export type {
  GrpcRequest,
  GrpcRequestInfo,
  GrpcRequestDetails,
  GrpcRequestRuntime,
  GrpcMetadata,
  GrpcMessage,
  GrpcMessageVariant,
  GrpcMessagePayload,
  GrpcMethodType
} from '@opencollection/types/requests/grpc';

// OpenCollection WebSocket request types
export type {
  WebSocketRequest,
  WebSocketRequestInfo,
  WebSocketRequestDetails,
  WebSocketRequestRuntime,
  WebSocketMessage,
  WebSocketMessageVariant,
  WebSocketPayload,
  WebSocketMessageType
} from '@opencollection/types/requests/websocket';

// OpenCollection config types
export type { Environment } from '@opencollection/types/config/environments';
export type { CollectionConfig } from '@opencollection/types/config/collection';
export type { Protobuf, ProtoFileItem, ProtoFileImportPath } from '@opencollection/types/config/protobuf';
export type { Proxy, ProxyConnectionConfig, ProxyConnectionAuth } from '@opencollection/types/config/proxy';
export type { ClientCertificate, PemCertificate, Pkcs12Certificate } from '@opencollection/types/config/certificates';

// OpenCollection common types
export type { RequestDefaults, RequestSettings } from '@opencollection/types/common/request-defaults';
export type { Documentation } from '@opencollection/types/common/documentation';
export type { Description } from '@opencollection/types/common/description';
export type { Info, Author } from '@opencollection/types/common/info';
export type {
  Variable,
  VariableValueVariant
} from '@opencollection/types/common/variables';
export type { Scripts } from '@opencollection/types/common/scripts';
export type { Assertion } from '@opencollection/types/common/assertions';
export type { Tag } from '@opencollection/types/common/tags';
export type {
  Action,
  ActionSetVariable,
  ActionPhase,
  ActionVariableScope,
  SetVariableActionSelector,
  SetVariableActionTarget
} from '@opencollection/types/common/actions';

// OpenCollection auth types
export type {
  Auth,
  AuthBasic,
  AuthBearer,
  AuthDigest,
  AuthNTLM,
  AuthAwsV4,
  AuthApiKey,
  AuthWsse,
  AuthOAuth1
} from '@opencollection/types/common/auth';

export type { AuthOAuth2 } from '@opencollection/types/common/auth-oauth2';

// Marrone types - collection
export type { Item as MarroneItem } from '@marrone/schema-types/collection/item';
export type {
  FolderRoot as MarroneFolderRoot,
  FolderRequest as MarroneFolderRequest,
  FolderMeta as MarroneFolderMeta
} from '@marrone/schema-types/collection/folder';
export type { Collection as MarroneCollection } from '@marrone/schema-types/collection/collection';
export type {
  Environment as MarroneEnvironment,
  EnvironmentVariable as MarroneEnvironmentVariable
} from '@marrone/schema-types/collection/environment';
export type {
  Example as MarroneExample,
  ExampleRequest as MarroneExampleRequest,
  ExampleResponse as MarroneExampleResponse,
  ExampleResponseBody as MarroneExampleResponseBody
} from '@marrone/schema-types/collection/examples';

// Marrone types - common
export type { KeyValue as MarroneKeyValue } from '@marrone/schema-types/common/key-value';
export type { Variable as MarroneVariable, Variables as MarroneVariables } from '@marrone/schema-types/common/variables';
export type { Script as MarroneScript } from '@marrone/schema-types/common/scripts';
export type {
  Auth as MarroneAuth,
  AuthMode as MarroneAuthMode,
  AuthAwsV4 as MarroneAuthAwsV4,
  AuthBasic as MarroneAuthBasic,
  AuthBearer as MarroneAuthBearer,
  AuthDigest as MarroneAuthDigest,
  AuthNTLM as MarroneAuthNTLM,
  AuthWsse as MarroneAuthWsse,
  AuthApiKey as MarroneAuthApiKey,
  AuthOauth1 as MarroneAuthOauth1,
  OAuth2 as MarroneOAuth2
} from '@marrone/schema-types/common/auth';
export type { MultipartFormEntry as MarroneMultipartFormEntry, MultipartForm as MarroneMultipartForm } from '@marrone/schema-types/common/multipart-form';
export type { FileEntry as MarroneFileEntry, FileList as MarroneFileList } from '@marrone/schema-types/common/file';
export type { GraphqlBody as MarroneGraphqlBody } from '@marrone/schema-types/common/graphql';

// Marrone types - requests
export type {
  HttpRequest as MarroneHttpRequest,
  HttpRequestBody as MarroneHttpRequestBody,
  HttpRequestBodyMode as MarroneHttpRequestBodyMode,
  HttpRequestParam as MarroneHttpRequestParam,
  HttpRequestParamType as MarroneHttpRequestParamType
} from '@marrone/schema-types/requests/http';
export type {
  GrpcRequest as MarroneGrpcRequest,
  GrpcRequestBody as MarroneGrpcRequestBody,
  GrpcMessage as MarroneGrpcMessage,
  GrpcMethodType as MarroneGrpcMethodType
} from '@marrone/schema-types/requests/grpc';
export type {
  WebSocketRequest as MarroneWebSocketRequest,
  WebSocketRequestBody as MarroneWebSocketRequestBody,
  WebSocketMessage as MarroneWsMessage
} from '@marrone/schema-types/requests/websocket';

export interface MarronePresets {
  requestType?: string;
  requestUrl?: string;
  defaultEnvironment?: string;
}

export interface BrunoConfig {
  version?: string;
  // present only for OpenCollection (yml) collections; its presence marks the format.
  opencollection?: string;
  name?: string;
  type?: string;
  ignore?: string[];
  presets?: MarronePresets;
  protobuf?: {
    protoFiles?: { path: string }[];
    importPaths?: { path: string; enabled?: boolean }[];
  };
  proxy?: {
    disabled?: boolean;
    inherit?: boolean;
    config?: {
      protocol?: string;
      hostname?: string;
      port?: number;
      auth?: {
        disabled?: boolean;
        username?: string;
        password?: string;
      };
      bypassProxy?: string;
    };
  };
  clientCertificates?: {
    certs?: Array<{
      domain?: string;
      type?: 'cert' | 'pfx';
      certFilePath?: string;
      keyFilePath?: string;
      pfxFilePath?: string;
      passphrase?: string;
      disabled?: boolean;
    }>;
  };
  scripts?: {
    additionalContextRoots?: string[];
    flow?: 'sandwich' | 'sequential';
  };
  openapi?: Array<{
    sourceUrl: string;
    groupBy?: 'tags' | 'path';
    lastSyncDate?: string;
    specHash?: string;
    autoCheck?: boolean;
    autoCheckInterval?: number;
  }>;
}

export interface MarroneCollectionRoot {
  request?: any;
  docs?: string;
  meta?: {
    name?: string;
    seq?: number;
  };
}