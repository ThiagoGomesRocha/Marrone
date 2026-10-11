import { OpenCollection } from "@opencollection/types";
import { normalizeOpenApiSyncConfigs } from "@marrone/common";
import { MarroneCollection, MarroneCollectionRoot, BrunoConfig, MarronePresets, PemCertificate, Pkcs12Certificate } from "./types";
import { fromOpenCollectionActions, fromOpenCollectionAuth, fromOpenCollectionHeaders, fromOpenCollectionScripts, fromOpenCollectionVariables } from "./common";
import { uuid } from "../common";
import { fromOpenCollectionItems } from "./items";
import { fromOpenCollectionFolder } from "./folder";
import { fromOpenCollectionEnvironments } from "./environment";
import { HTTP_SCRIPT_KEYS } from '@marrone/common';

const fromOpenCollectionConfig = (oc: OpenCollection): BrunoConfig => {
  const marroneExtension = oc.extensions?.marrone as {
    ignore?: string[];
    presets?: MarronePresets;
    scripts?: { flow?: unknown };
    openapi?: BrunoConfig['openapi'];
  } | undefined;

  const ignoreList = marroneExtension && Array.isArray(marroneExtension.ignore)
    ? marroneExtension.ignore
    : ['node_modules', '.git'];

  const brunoConfig: BrunoConfig = {
    name: oc.info?.name || 'Untitled Collection',
    type: 'collection',
    ignore: ignoreList
  };

  if (oc.info?.version != null && oc.info.version !== '') {
    brunoConfig.version = String(oc.info.version);
  }

  if (marroneExtension?.presets?.requestType || marroneExtension?.presets?.requestUrl || marroneExtension?.presets?.defaultEnvironment) {
    brunoConfig.presets = {};
    if (marroneExtension.presets.requestType) {
      brunoConfig.presets.requestType = marroneExtension.presets.requestType;
    }
    if (marroneExtension.presets.requestUrl) {
      brunoConfig.presets.requestUrl = marroneExtension.presets.requestUrl;
    }
    if (marroneExtension.presets.defaultEnvironment) {
      brunoConfig.presets.defaultEnvironment = marroneExtension.presets.defaultEnvironment;
    }
  }

  const scriptFlow = marroneExtension?.scripts?.flow;
  if (scriptFlow === 'sandwich' || scriptFlow === 'sequential') {
    brunoConfig.scripts = { flow: scriptFlow };
  }

  const openApiEntries = normalizeOpenApiSyncConfigs(marroneExtension?.openapi);
  if (openApiEntries.length > 0) {
    brunoConfig.openapi = openApiEntries;
  }

  const config = oc.config;
  if (!config) {
    return brunoConfig;
  }

  if (config.protobuf) {
    brunoConfig.protobuf = {
      protoFiles: config.protobuf.protoFiles?.map((f) => ({
        path: f.path
      })),
      importPaths: config.protobuf.importPaths?.map((p) => ({
        path: p.path,
        enabled: p.disabled !== true
      }))
    };
  }

  if (config.proxy) {
    brunoConfig.proxy = {
      disabled: config.proxy.disabled,
      inherit: config.proxy.inherit,
      config: config.proxy.config
    };
  }

  if (config.clientCertificates?.length) {
    brunoConfig.clientCertificates = {
      certs: config.clientCertificates.map((cert) => {
        const disabled = cert.disabled === true;
        if (cert.type === 'pem') {
          const pemCert = cert as PemCertificate;
          return {
            domain: pemCert.domain || '',
            type: 'cert' as const,
            certFilePath: pemCert.certificateFilePath || '',
            keyFilePath: pemCert.privateKeyFilePath || '',
            passphrase: pemCert.passphrase || '',
            ...(disabled && { disabled: true })
          };
        } else if (cert.type === 'pkcs12') {
          const pkcs12Cert = cert as Pkcs12Certificate;
          return {
            domain: pkcs12Cert.domain || '',
            type: 'pfx' as const,
            pfxFilePath: pkcs12Cert.pkcs12FilePath || '',
            passphrase: pkcs12Cert.passphrase || '',
            ...(disabled && { disabled: true })
          };
        }
        return null;
      }).filter((cert): cert is NonNullable<typeof cert> => cert !== null)
    };
  }

  return brunoConfig;
};

const fromOpenCollectionRoot = (oc: OpenCollection): MarroneCollectionRoot => {
  const root: MarroneCollectionRoot = {};

  if (oc.request) {
    // TODO: Widen scope to include GRPC scripts once Collection/Folder level inheritance is added to GRPC.
    const scripts = fromOpenCollectionScripts(oc.request.scripts, HTTP_SCRIPT_KEYS);
    root.request = {
      headers: fromOpenCollectionHeaders(oc.request.headers),
      auth: fromOpenCollectionAuth(oc.request.auth),
      script: scripts?.script,
      vars: {
        ...fromOpenCollectionVariables(oc.request.variables),
        res: fromOpenCollectionActions(oc.request.actions)
      },
      tests: scripts?.tests
    };
  }

  if (oc.docs) {
    root.docs = typeof oc.docs === 'string'
      ? oc.docs
      : oc.docs.content || '';
  }

  root.meta = {
    name: oc.info?.name || 'Untitled Collection'
  };

  return root;
};

export const openCollectionToMarrone = (openCollection: OpenCollection): MarroneCollection => {
  const marroneCollection: MarroneCollection = {
    uid: uuid(),
    name: openCollection.info?.name || 'Untitled Collection',
    version: '1',
    items: fromOpenCollectionItems(openCollection.items, (folder: unknown) => fromOpenCollectionFolder(folder as Parameters<typeof fromOpenCollectionFolder>[0])),
    environments: fromOpenCollectionEnvironments(openCollection.config?.environments),
    brunoConfig: fromOpenCollectionConfig(openCollection) as Record<string, unknown>,
    root: fromOpenCollectionRoot(openCollection)
  };

  return marroneCollection;
};