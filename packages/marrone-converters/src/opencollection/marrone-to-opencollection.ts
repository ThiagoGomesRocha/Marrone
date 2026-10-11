import { normalizeOpenApiSyncConfigs } from "@marrone/common";
import { toOpenCollectionActions, toOpenCollectionAuth, toOpenCollectionHeaders, toOpenCollectionScripts, toOpenCollectionVariables } from "./common";
import { toOpenCollectionEnvironments } from "./environment";
import { toOpenCollectionFolder } from "./folder";
import { toOpenCollectionItems } from "./items";
import { MarroneCollection, MarroneCollectionRoot, BrunoConfig, MarronePresets, ClientCertificate, CollectionConfig, OpenCollection, PemCertificate, Pkcs12Certificate, Protobuf } from "./types";
import { HTTP_SCRIPT_KEYS } from '@marrone/common';

const toOpenCollectionConfig = (brunoConfig: BrunoConfig | undefined): CollectionConfig | undefined => {
  if (!brunoConfig) {
    return undefined;
  }

  const config: CollectionConfig = {};

  if (brunoConfig.protobuf?.protoFiles?.length || brunoConfig.protobuf?.importPaths?.length) {
    config.protobuf = {} as Protobuf;

    if (brunoConfig.protobuf.protoFiles?.length) {
      config.protobuf.protoFiles = brunoConfig.protobuf.protoFiles.map((f) => ({
        type: 'file' as const,
        path: f.path
      }));
    }

    if (brunoConfig.protobuf.importPaths?.length) {
      config.protobuf.importPaths = brunoConfig.protobuf.importPaths.map((p) => {
        const importPath: { path: string; disabled?: boolean } = { path: p.path };
        if (p.enabled === false) {
          importPath.disabled = true;
        }
        return importPath;
      });
    }
  }

  if (brunoConfig.proxy) {
    config.proxy = {
      disabled: brunoConfig.proxy.disabled,
      inherit: brunoConfig.proxy.inherit,
      config: brunoConfig.proxy.config
    };
  }

  if (brunoConfig.clientCertificates?.certs?.length) {
    config.clientCertificates = brunoConfig.clientCertificates.certs
      .map((cert): ClientCertificate | null => {
        if (cert.type === 'cert') {
          const pemCert: PemCertificate = {
            domain: cert.domain || '',
            type: 'pem',
            certificateFilePath: cert.certFilePath || '',
            privateKeyFilePath: cert.keyFilePath || ''
          };
          if (cert.passphrase) {
            pemCert.passphrase = cert.passphrase;
          }
          if (cert.disabled === true) {
            pemCert.disabled = true;
          }
          return pemCert;
        } else if (cert.type === 'pfx') {
          const pkcs12Cert: Pkcs12Certificate = {
            domain: cert.domain || '',
            type: 'pkcs12',
            pkcs12FilePath: cert.pfxFilePath || ''
          };
          if (cert.passphrase) {
            pkcs12Cert.passphrase = cert.passphrase;
          }
          if (cert.disabled === true) {
            pkcs12Cert.disabled = true;
          }
          return pkcs12Cert;
        }
        return null;
      })
      .filter((cert): cert is ClientCertificate => cert !== null);
  }

  return Object.keys(config).length > 0 ? config : undefined;
};

const hasRequestDefaults = (root: MarroneCollectionRoot | undefined): boolean => {
  const request = root?.request;
  return Boolean(
    request?.headers?.length ||
    request?.vars?.req?.length ||
    request?.vars?.res?.length ||
    request?.script?.req ||
    request?.script?.res ||
    request?.tests ||
    (request?.auth && request.auth.mode !== 'none')
  );
};

export const marroneToOpenCollection = (collection: MarroneCollection): OpenCollection => {
  const brunoConfig = collection.brunoConfig as BrunoConfig | undefined;

  const collectionVersion = brunoConfig?.version;
  const hasCollectionVersion = collectionVersion != null && collectionVersion !== '';

  const openCollection: OpenCollection = {
    opencollection: '1.0.0',
    info: {
      name: collection.name || 'Untitled Collection',
      ...(hasCollectionVersion ? { version: String(collectionVersion) } : {})
    }
  };

  const config = toOpenCollectionConfig(brunoConfig);
  if (config) {
    openCollection.config = config;
  }

  const environments = toOpenCollectionEnvironments(collection.environments ?? undefined);
  if (environments?.length) {
    if (!openCollection.config) {
      openCollection.config = {};
    }
    openCollection.config.environments = environments;
  }

  const items = toOpenCollectionItems(collection.items, toOpenCollectionFolder);
  if (items.length) {
    openCollection.items = items as OpenCollection['items'];
  }

  if (hasRequestDefaults(collection.root as MarroneCollectionRoot)) {
    const request = (collection.root as MarroneCollectionRoot)?.request;
    openCollection.request = {};

    const headers = toOpenCollectionHeaders(request?.headers);
    if (headers) {
      openCollection.request.headers = headers;
    }

    const auth = toOpenCollectionAuth(request?.auth);
    if (auth) {
      openCollection.request.auth = auth;
    }

    const variables = toOpenCollectionVariables(request?.vars);
    if (variables) {
      openCollection.request.variables = variables;
    }

    const actions = toOpenCollectionActions(request?.vars?.res);
    if (actions) {
      openCollection.request.actions = actions;
    }
    // TODO: Widen scope to include GRPC scripts once Collection/Folder level inheritance is added to GRPC.
    const scripts = toOpenCollectionScripts(request as any, HTTP_SCRIPT_KEYS);
    if (scripts) {
      openCollection.request.scripts = scripts;
    }
  }

  if ((collection.root as MarroneCollectionRoot)?.docs) {
    openCollection.docs = {
      content: (collection.root as MarroneCollectionRoot).docs!,
      type: 'text/markdown'
    };
  }

  openCollection.bundled = true;

  const marroneExtension: {
    ignore?: string[];
    presets?: MarronePresets;
    scripts?: { flow?: 'sandwich' | 'sequential' };
    openapi?: BrunoConfig['openapi'];
  } = {};

  if (brunoConfig?.ignore?.length) {
    marroneExtension.ignore = brunoConfig.ignore;
  }

  const presets = brunoConfig?.presets;
  if (presets?.requestType || presets?.requestUrl || presets?.defaultEnvironment) {
    marroneExtension.presets = {};
    if (presets.requestType) {
      marroneExtension.presets.requestType = presets.requestType;
    }
    if (presets.requestUrl) {
      marroneExtension.presets.requestUrl = presets.requestUrl;
    }
    if (presets.defaultEnvironment) {
      marroneExtension.presets.defaultEnvironment = presets.defaultEnvironment;
    }
  }

  const scriptFlow = brunoConfig?.scripts?.flow;
  if (scriptFlow === 'sandwich' || scriptFlow === 'sequential') {
    marroneExtension.scripts = { flow: scriptFlow };
  }

  const openApiEntries = normalizeOpenApiSyncConfigs(brunoConfig?.openapi);
  if (openApiEntries.length > 0) {
    marroneExtension.openapi = openApiEntries;
  }

  if (Object.keys(marroneExtension).length > 0) {
    openCollection.extensions = {
      marrone: marroneExtension
    };
  }

  return openCollection;
};