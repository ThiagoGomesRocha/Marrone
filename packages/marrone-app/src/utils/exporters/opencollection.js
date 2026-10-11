import * as FileSaver from 'file-saver';
import jsyaml from 'js-yaml';
import { marroneToOpenCollection } from '@marrone/converters';
import { sanitizeName } from 'utils/common/regex';
import { filterTransientItems } from 'utils/collections';

export const exportCollection = (collection, version) => {
  // Filter out transient items before export
  collection.items = filterTransientItems(collection.items);

  const openCollection = marroneToOpenCollection(collection);

  if (!openCollection.extensions) {
    openCollection.extensions = {};
  }
  if (!openCollection.extensions.marrone) {
    openCollection.extensions.marrone = {};
  }
  openCollection.extensions.marrone.exportedAt = new Date().toISOString();
  openCollection.extensions.marrone.exportedUsing = version ? `Marrone/${version}` : 'Marrone';

  const yamlContent = jsyaml.dump(openCollection, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
  });

  const sanitizedName = sanitizeName(collection.name);
  const fileName = `${sanitizedName}.yml`;
  const fileBlob = new Blob([yamlContent], { type: 'application/x-yaml' });

  FileSaver.saveAs(fileBlob, fileName);
};

export default exportCollection;
