import { test } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection } from '../../utils/page';

test.describe('Import Marrone Testbench Collection', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Marrone Testbench collection successfully', async ({ page, createTmpDir }) => {
    const marroneFile = path.resolve(__dirname, 'fixtures', 'marrone-testbench.json');

    await importCollection(page, marroneFile, await createTmpDir('marrone-testbench-test'), {
      expectedCollectionName: 'marrone-testbench'
    });
  });
});
