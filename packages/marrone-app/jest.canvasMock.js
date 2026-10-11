/**
 * Stub do `canvas` para o jest/jsdom.
 *
 * POR QUE ISSO EXISTE
 * -------------------
 * O jsdom tenta `require('canvas')` para suportar <canvas>. O pacote `canvas` está nas
 * dependências, mas o binário nativo não é fornecido pelo build do fork (o build usa
 * npmRebuild: false e o canvas precisa de compilação). Quando o pacote existe mas o
 * `.node` não, o jsdom não engole o erro em try/catch — o erro sobe e DERRUBA O SUITE
 * INTEIRO, inclusive testes que não têm nada a ver com canvas.
 *
 * Mapeando `canvas` para este stub vazio, o jsdom segue normalmente e o suite volta a
 * rodar. Nenhum teste da app depende de renderização real em canvas.
 */
module.exports = {};
