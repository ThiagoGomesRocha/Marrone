import { uuid } from '../../common/index.js';
import type {
  HttpRequestParam,
  MarroneHttpRequestParam,
  MarroneHttpRequestParamType
} from '../types';

export const fromOpenCollectionParams = (params: HttpRequestParam[] | undefined): MarroneHttpRequestParam[] => {
  if (!params?.length) {
    return [];
  }

  return params.map((param): MarroneHttpRequestParam => {
    const entry: MarroneHttpRequestParam = {
      uid: uuid(),
      name: param.name || '',
      value: param.value || '',
      type: (param.type || 'query') as MarroneHttpRequestParamType,
      enabled: param.disabled !== true
    };
    const desc = typeof param.description === 'string' ? param.description : param.description?.content;
    if (desc && desc.trim().length) entry.description = desc;
    return entry;
  });
};

export const toOpenCollectionParams = (params: MarroneHttpRequestParam[] | null | undefined): HttpRequestParam[] | undefined => {
  if (!params?.length) {
    return undefined;
  }

  const ocParams = params.map((param): HttpRequestParam => {
    const httpParam: HttpRequestParam = {
      name: param.name || '',
      value: param.value || '',
      type: param.type || 'query'
    };

    if (param.description && typeof param.description === 'string' && param.description.trim().length) {
      httpParam.description = param.description;
    }

    if (param.enabled === false) {
      httpParam.disabled = true;
    }

    return httpParam;
  });

  return ocParams.length ? ocParams : undefined;
};
