const { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } = require('@jest/globals');
const { newQuickJSWASMModule } = require('quickjs-emscripten');
const addTestShimToContext = require('./test');
const { addRequireShimToContext } = require('./require');

/**
 * Regressão: o teste tem de registrar QUANTO TEMPO levou.
 *
 * Por que este arquivo existe: o sandbox QuickJS tem a sua PRÓPRIA implementação de
 * `test()`, separada do `src/test.js` usado pelo sandbox node-vm. Uma mudança feita só num
 * lado passa nos testes do outro e some em produção — foi o que aconteceu com `duration`:
 * aparecia no node-vm e NÃO no QuickJS, que é o runtime PADRÃO.
 *
 * A medição é feita com o relógio do sandbox, então o valor observado aqui é o real.
 */
describe('shim test (QuickJS) — tempo por teste', () => {
  let quickjs;
  let vm;
  let recorded;

  beforeAll(async () => {
    quickjs = await newQuickJSWASMModule();
  });

  beforeEach(() => {
    vm = quickjs.newContext();
    recorded = [];

    // `chai` MÍNIMO, injetado à mão.
    //
    // O caminho de produção usa `addLibraryShimsToContext`, que injeta o bundle completo
    // das bibliotecas do sandbox (chai, ajv, moment...). Neste ambiente esse bundle leva
    // minutos e estoura o heap do jest. O shim de test só precisa que `require('chai')`
    // exista — e o que está sob teste (a medição de tempo) é o código REAL do shim.
    vm.evalCode(`
      globalThis.requireObject = {
        chai: {
          expect: function () { return { to: { equal: function () {} } }; },
          assert: { equal: function () {} }
        }
      };
    `);

    addRequireShimToContext(vm, undefined);
    addTestShimToContext(vm, {
      addResult: (result) => recorded.push(result),
      getResults: () => recorded
    });
  });

  afterEach(() => {
    if (vm) {
      // O dispose do QuickJS pode abortar por handles retidos pelo shim (o próprio motor
      // imprime um aviso sobre isso). Como o database.spec.js já faz, tratamos como
      // melhor-esforço: o que interessa é a asserção do teste, não o encerramento do VM.
      try {
        vm.dispose();
      } catch (err) {
        // silencioso de propósito
      }
      vm = null;
    }
  });

  afterAll(() => {
    if (quickjs && typeof quickjs.dispose === 'function') {
      quickjs.dispose();
    }
    quickjs = null;
  });

  /** Roda um trecho e drena as microtasks — o test() do shim é async. */
  const runInSandbox = (code) => {
    const evalResult = vm.evalCode(code);

    if (evalResult.error) {
      const dumped = vm.dump(evalResult.error);
      evalResult.error.dispose();
      throw new Error(`erro no sandbox: ${dumped && dumped.message ? dumped.message : dumped}`);
    }

    evalResult.value.dispose();
    vm.runtime.executePendingJobs();
  };

  it('registra `duration` quando o teste passa', () => {
    runInSandbox(`
      globalThis.test('passa', function () {
        expect(1).to.equal(1);
      });
    `);

    expect(recorded).toHaveLength(1);
    expect(recorded[0].status).toBe('pass');
    expect(recorded[0].description).toBe('passa');
    // O campo que faltava: sem ele o relatório mostra '-' na coluna Duration.
    expect(typeof recorded[0].duration).toBe('number');
    expect(recorded[0].duration).toBeGreaterThanOrEqual(0);
  });

  it('registra `duration` também quando o teste falha', () => {
    runInSandbox(`
      globalThis.test('falha', function () {
        throw new globalThis.DummyChaiAssertionError('quebrou de proposito');
      });
    `);

    expect(recorded).toHaveLength(1);
    expect(recorded[0].status).toBe('fail');
    expect(recorded[0].error).toBe('quebrou de proposito');
    expect(typeof recorded[0].duration).toBe('number');
  });

  it('registra `duration` quando o erro NÃO é de asserção (caminho do addResult direto)', () => {
    runInSandbox(`
      globalThis.test('erro generico', function () {
        throw new Error('falha qualquer');
      });
    `);

    expect(recorded).toHaveLength(1);
    expect(recorded[0].status).toBe('fail');
    expect(typeof recorded[0].duration).toBe('number');
  });
});
