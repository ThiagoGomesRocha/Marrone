export const REQUEST_TYPES = ['http-request', 'graphql-request', 'grpc-request', 'ws-request'];

/**
 * Links oficiais do projeto (main process).
 *
 * Mesmo motivo do equivalente no renderer (`marrone-app/src/utils/common/constants.js`):
 * o rename bruno -> marrone trocou `usebruno/bruno` por `marrone/marrone` com um sed
 * global, e essa organização não existe (404). Aqui a URL aparecia no handler de
 * "Ajuda > Documentation" e na mensagem de falha de carregamento da janela.
 *
 * A documentação é a **wiki do repositório** (`<repo>/wiki`), editada versionada em
 * `docs/wiki/`. Ela tem URL própria, então não depende do branch — ao contrário dos links
 * de arquivo, que precisam de `HEAD` porque o branch padrão aqui é `feature/marrone`.
 */
export const MARRONE_REPO_URL = 'https://github.com/ThiagoGomesRocha/Marrone';
export const MARRONE_DOCS_URL = `${MARRONE_REPO_URL}/wiki`;
export const MARRONE_ISSUES_URL = `${MARRONE_REPO_URL}/issues`;
