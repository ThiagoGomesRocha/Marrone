import type { Item as MarroneItem } from '@marrone/schema-types/collection/item';
import type { ScriptFile } from '@opencollection/types/collection/item';
import { uuid } from '../../../utils';

const parseScript = (ocScript: ScriptFile): MarroneItem => {
  const marroneItem: MarroneItem = {
    uid: uuid(),
    type: 'js',
    seq: 1,
    name: 'Script',
    tags: [],
    request: null,
    settings: null,
    fileContent: ocScript.script || '',
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  return marroneItem;
};

export default parseScript;
