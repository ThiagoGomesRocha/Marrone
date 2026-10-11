import type { OpenCollection } from '@opencollection/types';
import type { FolderRoot } from '@marrone/schema-types/collection/folder';
import { normalizeOpenApiSyncConfigs } from '@marrone/common';
import { parseYml } from './utils';
import { toMarroneAuth } from './common/auth';
import { toMarroneHttpHeaders } from './common/headers';
import { toMarroneVariables } from './common/variables';
import { toMarronePostResponseVariables } from './common/actions';
import { toMarroneScripts } from './common/scripts';
import { ensureString } from '../../utils';
import type { MarronePresetsExtension } from '../../types';

interface ParsedCollection {
  collectionRoot: FolderRoot;
  brunoConfig: Record<string, any>;
}

const parseCollection = (ymlString: string): ParsedCollection => {
  try {
    const oc: OpenCollection = parseYml(ymlString);

    // marrone config
    const brunoConfig: Record<string, any> = {
      opencollection: oc.opencollection || '1.0.0',
      name: ensureString(oc.info?.name, 'Untitled Collection'),
      type: 'collection',
      ignore: []
    };

    if (oc.info?.version != null && oc.info.version !== '') {
      brunoConfig.version = ensureString(oc.info.version, '');
    }

    const marroneExtension = (oc.extensions as any)?.marrone;
    if (marroneExtension?.ignore && Array.isArray(marroneExtension.ignore)) {
      brunoConfig.ignore = marroneExtension.ignore;
    }

    // presets
    if (marroneExtension?.presets) {
      const presets = marroneExtension.presets as MarronePresetsExtension;
      if (presets.request || presets.defaultEnvironment) {
        brunoConfig.presets = {
          requestType: presets.request?.type || '',
          requestUrl: presets.request?.url || ''
        };
        if (presets.defaultEnvironment) {
          brunoConfig.presets.defaultEnvironment = presets.defaultEnvironment;
        }
      }
    }

    // marrone-specific extensions
    const marroneExtensions = oc.extensions?.marrone as any;
    if (Array.isArray(marroneExtensions?.scripts?.additionalContextRoots)) {
      const sanitizedRoots = marroneExtensions.scripts.additionalContextRoots
        .filter((item: any) => typeof item === 'string');

      if (sanitizedRoots.length > 0) {
        brunoConfig.scripts = {
          ...brunoConfig.scripts,
          additionalContextRoots: sanitizedRoots
        };
      }
    }
    // scripts.flow controls collection/folder/request script execution order
    // ('sandwich' | 'sequential'); unrecognized values fall back to the runtime default.
    if (marroneExtensions?.scripts?.flow === 'sandwich' || marroneExtensions?.scripts?.flow === 'sequential') {
      brunoConfig.scripts = {
        ...brunoConfig.scripts,
        flow: marroneExtensions.scripts.flow
      };
    }

    const openApiEntries = normalizeOpenApiSyncConfigs(marroneExtensions?.openapi);
    if (openApiEntries.length > 0) {
      brunoConfig.openapi = openApiEntries;
    }

    // protobuf
    if (oc.config?.protobuf) {
      brunoConfig.protobuf = {
        protoFiles: oc.config.protobuf.protoFiles?.map((protoFile: any) => ({
          path: protoFile.path
        })) || [],
        importPaths: oc.config.protobuf.importPaths?.map((importPath: any) => ({
          path: importPath.path,
          enabled: importPath.disabled !== true
        })) || []
      };
    }

    // proxy - only support newer format
    // Default: inherit from global preferences
    brunoConfig.proxy = {
      inherit: true,
      config: {
        protocol: 'http',
        hostname: '',
        port: '',
        auth: {
          username: '',
          password: ''
        },
        bypassProxy: ''
      }
    };

    if (oc.config?.proxy && typeof oc.config.proxy === 'object') {
      // Validate newer format: must have 'inherit' and 'config' properties
      const proxyConfig = oc.config.proxy as any;

      if ('inherit' in proxyConfig && typeof proxyConfig.inherit === 'boolean' && proxyConfig.config && typeof proxyConfig.config === 'object') {
        // Valid newer format
        brunoConfig.proxy = {
          inherit: proxyConfig.inherit,
          config: {
            protocol: proxyConfig.config.protocol || 'http',
            hostname: proxyConfig.config.hostname || '',
            port: proxyConfig.config.port || '',
            auth: {
              username: proxyConfig.config.auth?.username || '',
              password: proxyConfig.config.auth?.password || ''
            },
            bypassProxy: proxyConfig.config.bypassProxy || ''
          }
        };

        // Handle optional disabled field
        if (proxyConfig.disabled === true) {
          brunoConfig.proxy.disabled = true;
        }

        // Handle optional auth.disabled field
        if (proxyConfig.config.auth?.disabled === true) {
          brunoConfig.proxy.config.auth.disabled = true;
        }
      }
      // If not in newer format, use default (inherit: true)
    }

    // client certificates
    if (oc.config?.clientCertificates?.length) {
      brunoConfig.clientCertificates = {
        certs: oc.config.clientCertificates.map((cert: any) => {
          if (cert.type === 'pem') {
            return {
              domain: cert.domain,
              type: 'cert',
              certFilePath: cert.certificateFilePath,
              keyFilePath: cert.privateKeyFilePath,
              passphrase: cert.passphrase || '',
              ...(cert.disabled === true && { disabled: true })
            };
          } else if (cert.type === 'pkcs12') {
            return {
              domain: cert.domain,
              type: 'pfx',
              pfxFilePath: cert.pkcs12FilePath,
              passphrase: cert.passphrase || '',
              ...(cert.disabled === true && { disabled: true })
            };
          }
          return null;
        }).filter((cert: any) => cert !== null)
      };
    }

    // collection root
    const collectionRoot: FolderRoot = {
      meta: null,
      request: null,
      docs: null
    };

    // request defaults
    if (oc.request) {
      collectionRoot.request = {
        headers: null,
        auth: null,
        script: {
          req: null,
          res: null
        },
        vars: {
          req: [],
          res: []
        },
        tests: null
      };

      // headers
      const headers = toMarroneHttpHeaders(oc.request.headers);
      collectionRoot.request.headers = headers || [];

      // auth
      const auth = toMarroneAuth(oc.request.auth);
      if (auth) {
        collectionRoot.request.auth = auth;
      }

      // variables
      const variables = toMarroneVariables(oc.request.variables);
      const postResponseVars = toMarronePostResponseVariables((oc.request as any).actions);
      collectionRoot.request.vars = {
        req: variables.req,
        res: postResponseVars
      };

      // scripts
      const scripts = toMarroneScripts(oc.request.scripts);
      if (scripts?.script && collectionRoot.request.script) {
        if (scripts.script.req) {
          collectionRoot.request.script.req = scripts.script.req;
        }
        if (scripts.script.res) {
          collectionRoot.request.script.res = scripts.script.res;
        }
      }
      if (scripts?.tests) {
        collectionRoot.request.tests = scripts.tests;
      }
    }

    // docs
    if (oc.docs) {
      if (typeof oc.docs === 'string') {
        collectionRoot.docs = oc.docs;
      } else if (typeof oc.docs === 'object' && oc.docs.content) {
        collectionRoot.docs = oc.docs.content;
      }
    }

    return {
      collectionRoot,
      brunoConfig
    };
  } catch (error) {
    console.error('Error parsing collection:', error);
    throw error;
  }
};

export default parseCollection;
