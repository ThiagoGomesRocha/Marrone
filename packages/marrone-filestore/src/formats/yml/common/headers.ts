import type { FolderRequest as MarroneFolderRequest } from '@marrone/schema-types/collection/folder';
import type { KeyValue as MarroneKeyValue } from '@marrone/schema-types/common/key-value';
import type { HttpRequestHeader, HttpResponseHeader } from '@opencollection/types/requests/http';
import { uuid, ensureString } from '../../../utils';

export const toOpenCollectionHttpHeaders = (headers: MarroneFolderRequest['headers']): HttpRequestHeader[] | undefined => {
  if (!headers?.length) {
    return undefined;
  }

  const ocHeaders = headers.map((header: MarroneKeyValue): HttpRequestHeader => {
    const httpHeader: HttpRequestHeader = {
      name: header.name || '',
      value: header.value || ''
    };
    if (header?.description?.trim().length) {
      httpHeader.description = header.description;
    }
    if (header.enabled === false) {
      httpHeader.disabled = true;
    }
    return httpHeader;
  });

  return ocHeaders.length ? ocHeaders : undefined;
};

export const toOpenCollectionResponseHeaders = (headers: MarroneFolderRequest['headers']): HttpResponseHeader[] | undefined => {
  if (!headers?.length) {
    return undefined;
  }

  const ocHeaders = headers.map((header: MarroneKeyValue): HttpResponseHeader => ({
    name: header.name || '',
    value: header.value || ''
  }));

  return ocHeaders.length ? ocHeaders : undefined;
};

export const toMarroneHttpHeaders = (headers: HttpRequestHeader[] | HttpResponseHeader[] | null | undefined): MarroneKeyValue[] | undefined => {
  if (!headers?.length) {
    return undefined;
  }

  const marroneHeaders = headers.map((header): MarroneKeyValue => {
    const marroneHeader: MarroneKeyValue = {
      uid: uuid(),
      name: ensureString(header.name),
      value: ensureString(header.value),
      enabled: ('disabled' in header) ? header.disabled !== true : true
    };

    if ('description' in header && header.description) {
      marroneHeader.description = typeof header.description === 'string' ? header.description : (header.description as any)?.content || '';
    }

    return marroneHeader;
  });

  return marroneHeaders.length ? marroneHeaders : undefined;
};
