import type { HttpRequestParam as MarroneHttpRequestParam } from '@marrone/schema-types/requests/http';
import type { HttpRequestParam } from '@opencollection/types/requests/http';
import { uuid, ensureString } from '../../../utils';

export const toOpenCollectionParams = (params: MarroneHttpRequestParam[] | null | undefined): HttpRequestParam[] | undefined => {
  if (!params?.length) {
    return undefined;
  }

  const ocParams = params.map((param: MarroneHttpRequestParam): HttpRequestParam => {
    const ocParam: HttpRequestParam = {
      name: param.name || '',
      value: param.value || '',
      type: param.type
    };

    if (param?.description?.trim().length) {
      ocParam.description = param.description;
    }

    if (param.enabled === false) {
      ocParam.disabled = true;
    }

    return ocParam;
  });

  return ocParams.length ? ocParams : undefined;
};

export const toMarroneParams = (params: HttpRequestParam[] | null | undefined): MarroneHttpRequestParam[] | undefined => {
  if (!params?.length) {
    return undefined;
  }

  const marroneParams = params.map((param: HttpRequestParam): MarroneHttpRequestParam => {
    const marroneParam: MarroneHttpRequestParam = {
      uid: uuid(),
      name: ensureString(param.name),
      value: ensureString(param.value),
      type: param.type,
      enabled: param.disabled !== true
    };

    if (param.description) {
      if (typeof param.description === 'string' && param.description.trim().length) {
        marroneParam.description = param.description;
      } else if (typeof param.description === 'object' && param.description.content?.trim().length) {
        marroneParam.description = param.description.content;
      }
    }

    return marroneParam;
  });

  return marroneParams.length ? marroneParams : undefined;
};
