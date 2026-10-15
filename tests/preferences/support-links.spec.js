import { test, expect } from '../../playwright';

/**
 * Links da tela Preferences > Support.
 *
 * Histórico: esta spec afirmava `https://github.com/marrone/marrone` e
 * `https://docs.marrone.com` — a organização que o rename bruno -> marrone inventou e o
 * domínio de documentação que nunca existiu. O teste passava, porque comparava o link com
 * o mesmo texto errado que o componente usava; os dois estavam de acordo e ambos errados.
 * Por isso as URLs aqui são literais completos (não importadas do componente): o teste
 * tem que quebrar se alguém trocar a URL por engano.
 */
test('Should verify all support links with correct URL in preference > Support tab', async ({ page }) => {
  // Open Preferences
  await page.getByLabel('Open Preferences').click();

  // Go to Support tab
  await page.getByRole('tab', { name: 'Support' }).click();

  // Documentation -> a wiki do Marrone (que aponta para a doc do Bruno)
  const locator_documentation = page.getByRole('link', { name: 'Documentation', exact: true });
  expect(await locator_documentation.getAttribute('href')).toEqual(
    'https://github.com/ThiagoGomesRocha/Marrone/wiki'
  );

  // Report Issues -> rastreador de issues do repositório
  const locator_reportissues = page.getByRole('link', { name: 'Report Issues', exact: true });
  expect(await locator_reportissues.getAttribute('href')).toEqual(
    'https://github.com/ThiagoGomesRocha/Marrone/issues'
  );

  // O grupo "Community" foi removido: GitHub, Discord, Twitter e LinkedIn eram os canais
  // do Bruno. Se algum voltar, é para o teste falhar.
  await expect(page.getByRole('heading', { name: 'Community' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Twitter', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Discord', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'LinkedIn', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'GitHub', exact: true })).toHaveCount(0);
});
