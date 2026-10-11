import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Import Corrupted Marrone Collection - Should Fail', () => {
  test('Import Marrone collection with invalid JSON structure should fail', async ({ page }) => {
    const marroneFile = path.resolve(__dirname, 'fixtures', 'marrone-malformed.json');

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.marrone-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', marroneFile);

    const errorLocator = page.getByText(/Failed to parse the file|Unsupported collection format|Invalid|Error/).first();
    await expect(errorLocator).toBeVisible({ timeout: 10000 });

    // Cleanup: close any open modals
    await page.getByTestId('modal-close-button').click();
  });
});
