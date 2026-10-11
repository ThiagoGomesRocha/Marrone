import { MarroneError } from 'utils/common/error';
import { openApiToMarrone } from '@marrone/converters';

export const convertOpenapiToMarrone = (data, options = {}) => {
  try {
    return openApiToMarrone(data, options);
  } catch (err) {
    console.error('Error converting OpenAPI to Marrone:', err);
    throw new MarroneError('Import collection failed: ' + err.message);
  }
};

export const isOpenApiSpec = (data) => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  if (typeof data.info !== 'object' || data.info === null) {
    return false;
  }

  if (typeof data.openapi === 'string' && data.openapi.trim().length) {
    return true;
  }

  if (typeof data.swagger === 'string' && data.swagger.trim().length) {
    return true;
  }

  return false;
};
