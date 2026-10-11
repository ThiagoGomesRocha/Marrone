import { uuid } from '../common/index.js';
import {
  fromOpenCollectionHeaders,
  toOpenCollectionHeaders,
  fromOpenCollectionAuth,
  toOpenCollectionAuth,
  fromOpenCollectionScripts,
  toOpenCollectionScripts,
  fromOpenCollectionVariables,
  fromOpenCollectionActions,
  toOpenCollectionVariables,
  toOpenCollectionActions
} from './common';
import { fromOpenCollectionItems, toOpenCollectionItems } from './items';
import type {
  Folder,
  FolderInfo,
  RequestDefaults,
  Auth,
  MarroneItem,
  MarroneFolderRoot,
  MarroneKeyValue
} from './types';
import { HTTP_SCRIPT_KEYS, normalizeTags } from '@marrone/common';

export const fromOpenCollectionFolder = (folder: Folder): MarroneItem => {
  const info = folder.info || {};
  const tags = normalizeTags(info.tags);

  const marroneFolder: MarroneItem = {
    uid: uuid(),
    type: 'folder',
    name: info.name || 'Untitled Folder',
    seq: info.seq || 1
  };

  if (folder.request || folder.docs || tags.length) {
    const root: MarroneFolderRoot = {};

    if (folder.request) {
      // TODO: Widen scope to include GRPC scripts once Collection/Folder level inheritance is added to GRPC.
      const scripts = fromOpenCollectionScripts(folder.request.scripts, HTTP_SCRIPT_KEYS);
      root.request = {
        headers: fromOpenCollectionHeaders(folder.request.headers),
        auth: fromOpenCollectionAuth(folder.request.auth as Auth),
        script: scripts?.script,
        vars: {
          ...fromOpenCollectionVariables(folder.request.variables),
          res: fromOpenCollectionActions(folder.request.actions)
        },
        tests: scripts?.tests
      };
    }

    if (folder.docs) {
      if (typeof folder.docs === 'string') {
        root.docs = folder.docs;
      } else if (folder.docs && typeof folder.docs === 'object' && 'content' in folder.docs) {
        root.docs = folder.docs.content || '';
      }
    }

    root.meta = {
      name: info.name || 'Untitled Folder',
      seq: info.seq || 1,
      ...(tags.length ? { tags } : {})
    };

    marroneFolder.root = root;
  }

  if (folder.items?.length) {
    marroneFolder.items = fromOpenCollectionItems(folder.items, fromOpenCollectionFolder as (f: unknown) => MarroneItem);
  }

  return marroneFolder;
};

export const toOpenCollectionFolder = (folder: MarroneItem): Folder => {
  const info: FolderInfo = {
    name: folder.name || 'Untitled Folder',
    type: 'folder'
  };

  if (folder.seq) {
    info.seq = folder.seq;
  }

  const tags = normalizeTags(folder.root?.meta?.tags);
  if (tags.length) {
    info.tags = tags;
  }

  const ocFolder: Folder = {
    info
  };

  if (folder.root) {
    const folderRequest = folder.root.request || {};

    const headers = toOpenCollectionHeaders(folderRequest.headers as MarroneKeyValue[]);
    const auth = toOpenCollectionAuth(folderRequest.auth);
    // TODO: Widen scope to include GRPC scripts once Collection/Folder level inheritance is added to GRPC.
    const scripts = toOpenCollectionScripts(folderRequest as { script?: { req: string | null; res: string | null } | null; tests?: string | null }, HTTP_SCRIPT_KEYS);
    const variables = toOpenCollectionVariables(folderRequest.vars);
    const actions = toOpenCollectionActions(folderRequest.vars?.res);

    if (headers || auth || scripts || variables || actions) {
      const request: RequestDefaults = {};

      if (headers) {
        request.headers = headers;
      }

      if (auth) {
        request.auth = auth;
      }

      if (scripts) {
        request.scripts = scripts;
      }

      if (variables) {
        request.variables = variables;
      }

      if (actions) {
        request.actions = actions;
      }

      ocFolder.request = request;
    }

    if (folder.root.docs) {
      ocFolder.docs = {
        content: folder.root.docs,
        type: 'text/markdown'
      };
    }
  }

  if (folder.items?.length) {
    ocFolder.items = toOpenCollectionItems(folder.items, toOpenCollectionFolder as (f: MarroneItem) => unknown) as Folder['items'];
  }

  return ocFolder;
};
