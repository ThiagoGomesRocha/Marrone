# Testes automatizados

Como testar o Marrone em cada camada, e como escrever os `test()` que rodam **dentro de uma
coleção**. Para a referência completa de script (todas as funções de `bru.*`, `req.*`,
`res.*`) use a [documentação do Bruno](https://docs.usebruno.com) — a API é a mesma.

---

## Onde cada teste roda

| Camada | O que cobre | Onde fica | Como rodar |
|---|---|---|---|
| Componente / unidade | funções e componentes React isolados | `packages/*/src/**/*.spec.js(x)` | `npm test --workspace=packages/marrone-app` |
| Runner e sandbox | scripting, `bru.*`, `req.*`, `res.*`, QuickJS | `packages/marrone-js`, `packages/marrone-*` | `npm test --workspace=packages/marrone-js` |
| Integração com banco | os cinco drivers contra servidor real | `packages/marrone-database/tests/integration.spec.ts` | opt-in, ver abaixo |
| Fim a fim (E2E) | a aplicação Electron real, pela interface | `tests/**` | `npm run test:e2e` |
| Desempenho | tempo do runner | `tests/benchmarks` | `npm run test:benchmark` |

Não existe um `npm test` na raiz: os testes unitários são por pacote (`--workspace`).

---

## 1. Teste de componente (Jest + jsdom)

Testar um componente é a camada mais barata. O exemplo abaixo é o padrão usado nos specs da
aplicação (`packages/marrone-app/src/components/CodeEditor/StatusBar/index.spec.js`).

```js
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import StatusBar from './index';

// O StyledWrapper lê o tema. Sem ThemeProvider o render quebra — não é o teste
// que está errado, é o styled-component que não tem tema nenhum para ler.
const theme = {
  colors: { text: { muted: '#888' } },
  background: { crust: '#f8f8f8' },
  border: { radius: { sm: '4px' }, border0: '#ddd' },
  textLink: '#546de5'
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('StatusBar', () => {
  it('mostra o tamanho e o modo selecionado', async () => {
    renderWithTheme(<StatusBar />);

    expect(screen.getByText('1.2 KB')).toBeInTheDocument();
  });
});
```

Rodar só o seu arquivo:

```bash
npm test --workspace=packages/marrone-app -- StatusBar
```

**Duas armadilhas que já custaram tempo aqui:**

- **`useTranslation` sem provider inicializado.** O `jest.setup.js` da app não inicializa o
  i18next, então `t('COMMON.DOCUMENTATION')` devolve a própria chave. Se você consultar o
  elemento pelo **nome acessível**, o nome será `COMMON.DOCUMENTATION`, não `Documentation`.
  Nesses casos prefira o `data-testid` que o componente já expõe.
- **Imports absolutos.** O `jest.config.js` da app declara
  `moduleDirectories: ['node_modules', 'src']` e mapeia aliases (`components/`, `utils/`,
  `providers/`…). Use o mesmo estilo de import do código de produção; caminhos relativos
  longos (`../../../../utils/...`) não são o padrão daqui.

---

## 2. Teste puro no `@marrone/database` (sem banco)

O que é função pura se testa sem banco nenhum. É assim que o formato de retorno é travado
(`packages/marrone-database/tests/formatResult.spec.ts`):

```ts
import { formatResult } from '../src/formatResult';

describe('formatResult', () => {
  test('devolve um objeto (não um array) quando há um único registro', () => {
    const result = formatResult([{ id: 1, nome: 'João' }]);

    expect(Array.isArray(result)).toBe(false);
    expect(result).toEqual({ id: 1, nome: 'João' });
  });

  test('devolve null para lista vazia, null e undefined', () => {
    expect(formatResult([])).toBeNull();
    expect(formatResult(null)).toBeNull();
  });
});
```

```bash
npm test --workspace=packages/marrone-database
```

O `npm test` desse pacote **não abre conexão nenhuma** — ele roda em qualquer máquina, sem
Docker. Isso é deliberado: o teste que depende de servidor é outro, abaixo.

---

## 3. Integração com banco real (opt-in)

Só roda quando `DB_INTEGRATION=true` **e** as variáveis de conexão existem. Sem elas, os
casos ficam `skipped` e o `npm test` continua verde.

```bash
cd packages/marrone-database

POSTGRES_URL=postgres://localhost:5432/mydb \
POSTGRES_USER=usuario \
POSTGRES_PASSWORD=senha \
DB_INTEGRATION=true npm run test:integration
```

Variáveis aceitas, uma por SGBD: `POSTGRES_URL`, `MYSQL_URL`, `MSSQL_URL`, `ORACLE_URL`,
`DB2_URL` — cada uma com `_USER` e `_PASSWORD`.

---

## 4. E2E com Playwright (a aplicação de verdade)

Os testes de `tests/` sobem o Electron real e clicam na interface. Eles usam os *fixtures*
de `playwright/index.ts`:

| Fixture | Para que serve |
|---|---|
| `page` | a janela da aplicação, já pronta |
| `createTmpDir(tag?)` | cria um diretório temporário para a coleção do teste |
| `launchElectronApp(options?)` | sobe o app com um `userDataPath` isolado (e `.env` opcional) |
| `collectionFixturePath` / `workspaceFixturePath` | copia uma coleção/workspace de fixture para um diretório temporário |

Exemplo — verificando os links da tela de suporte (`tests/preferences/support-links.spec.js`):

```js
import { test, expect } from '../../playwright';

test('Should verify all support links with correct URL in preference > Support tab', async ({ page }) => {
  await page.getByLabel('Open Preferences').click();
  await page.getByRole('tab', { name: 'Support' }).click();

  const documentation = page.getByRole('link', { name: 'Documentation', exact: true });
  expect(await documentation.getAttribute('href')).toEqual(
    'https://github.com/ThiagoGomesRocha/Marrone/wiki'
  );
});
```

E um teste que cria coleção em diretório temporário:

```js
test('cria coleção em um diretório temporário', async ({ page, createTmpDir }) => {
  const testDir = await createTmpDir('test-collection');

  await page.getByLabel('Create Collection').click();
  await page.getByLabel('Name').fill('minha-colecao');
  await page.getByLabel('Location').fill(testDir);

  await expect(page.getByText('minha-colecao')).toBeVisible();
});
```

```bash
npm run test:e2e            # projetos default + system-pac
npm run test:e2e:sanity     # só o subconjunto marcado com @sanity (rápido, para o dia a dia)
npm run test:e2e:auth       # projeto auth
npm run test:e2e:ssl        # projeto ssl
npm run test:e2e:mock-server
npm run test:codegen minha-nova-spec   # grava seus cliques e gera o teste
```

Dois detalhes que economizam tempo:

- **Rode `@sanity` durante o desenvolvimento.** A suíte E2E inteira é lenta (sobe Electron
  a cada teste) e não é o laço de feedback certo para editar um componente.
- **Teste que depende da rede é frágil.** `tests/import/url-import/*` baixa uma fixture de
  uma URL real; se ela mudar de lugar, o teste passa a falhar por motivo alheio ao código.
  Existe caso que estende o `test.setTimeout` justamente porque o fetch pode demorar.

---

## 5. `test()` dentro da coleção (o que você escreve)

Toda requisição tem um bloco **Tests**, executado depois da resposta. A asserção é no estilo
chai (`.to.equal`, `.to.contain`, `.to.eql`) e o callback pode ser `async`:

```js
test('deve retornar 200 e ecoar o parâmetro', function () {
  expect(res.getStatus()).to.equal(200);
  expect(res.getBody().args.param).to.equal('valor');
});
```

```js
test('grava o valor na variável de ambiente', async function () {
  await bru.setEnvVar('token', res.getBody().token);
  expect(bru.getEnvVar('token')).to.not.be.undefined;
});
```

O `await` só existe dentro de função `async` — por isso os exemplos de banco e de HTTP usam
`async function ()`. Além disso: um `test()` que lança não derruba a requisição seguinte; o
resultado de cada asserção aparece na aba **Tests** e no relatório de execução.

Para a lista completa de `test`, `expect`, `bru`, `req` e `res` (incluindo `bru.sendRequest`,
`bru.runRequest`, `bru.runner.setNextRequest`, cookies e `bru.utils`), use a
**[documentação do Bruno](https://docs.usebruno.com)** — a superfície de script é a mesma.

Para validar dados **no banco** dentro de um `test()`, veja
[Scripts de banco de dados](./banco-de-dados.md).

---

## Boas práticas

1. **Teste o comportamento, não a implementação.** Nomeie o teste pelo que o usuário
   observa ("mostra o tamanho selecionado") e não pelo método que você chamou.
2. **Um motivo de falha por teste.** Um `expect` por comportamento deixa claro o que
   quebrou sem precisar ler o stack.
3. **E2E sempre em diretório temporário.** Use `createTmpDir` — nunca aponte um teste para
   uma coleção que existe na sua máquina.
4. **Nunca coloque credencial em coleção, fixture ou `.bru`.** Veja o princípio em
   [Scripts de banco de dados](./banco-de-dados.md#a-senha-nunca-sai-do-cofre).
5. **Travou um defeito? Deixe o teste que reproduz.** Um teste que falha antes do conserto e
   passa depois vale mais que a descrição do bug na issue.
6. **Cuidado com teste que compara com o próprio componente.** Se o teste importa a URL do
   componente e compara com o componente, ele passa mesmo quando a URL está errada — foi o
   que aconteceu com os links de suporte. Nesses casos, escreva o valor esperado literal no
   teste.
