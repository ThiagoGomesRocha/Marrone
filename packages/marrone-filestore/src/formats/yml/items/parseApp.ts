import type { Item as MarroneItem } from '@marrone/schema-types/collection/item';
import { uuid } from '../../../utils';

export interface AppFile {
  info: {
    name?: string;
    type: 'app';
    seq?: number;
    tags?: string[];
  };
  code?: string;
}

const parseApp = (ocApp: AppFile): MarroneItem => {
  const info = ocApp.info || ({} as AppFile['info']);

  const marroneItem: MarroneItem = {
    uid: uuid(),
    type: 'app',
    seq: typeof info.seq === 'number' ? info.seq : 1,
    name: info.name || 'App',
    tags: Array.isArray(info.tags) ? info.tags : [],
    request: null,
    settings: null,
    app: { code: ocApp.code || '' },
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  return marroneItem;
};

export default parseApp;
