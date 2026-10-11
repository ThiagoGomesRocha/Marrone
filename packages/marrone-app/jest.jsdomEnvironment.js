/**
 * Ambiente jest customizado: jsdom com o `canvas` neutralizado.
 *
 * POR QUE ISSO É NECESSÁRIO
 * -------------------------
 * O `jest-environment-jsdom` carrega o jsdom, que faz `require('canvas')` de forma opcional
 * para suportar <canvas>. Neste fork o pacote `canvas` está nas dependências mas o binário
 * nativo não é construído (o build usa npmRebuild: false e o canvas exigiria compilação
 * contra o ABI do Electron). Quando o pacote existe e o `.node` não, o jsdom NÃO engole o
 * erro: ele sobe como "Cannot find module '../build/Release/canvas.node'" e derruba o
 * SUITE INTEIRO da app — inclusive testes que não têm nada a ver com canvas.
 *
 * `moduleNameMapper` NÃO resolve este caso, porque o ambiente é carregado pelo jest-util
 * fora do registry de módulos do teste. A saída é interceptar a resolução de 'canvas'
 * antes de carregar o jsdom — que é o que este arquivo faz.
 *
 * Blast radius: apenas o specifier 'canvas' é redirecionado. Nenhum teste da app depende
 * de renderização real em canvas.
 */
const path = require('path');
const Module = require('module');

const CANVAS_STUB = path.join(__dirname, 'jest.canvasMock.js');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(request, ...rest) {
  if (request === 'canvas') {
    return CANVAS_STUB;
  }

  return originalResolveFilename.call(this, request, ...rest);
};

const jsdomEnvironment = require('jest-environment-jsdom');

module.exports = jsdomEnvironment.default || jsdomEnvironment;
