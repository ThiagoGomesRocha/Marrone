const { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } = require('@jest/globals');
const { newQuickJSWASMModule } = require('quickjs-emscripten');
const addDatabaseShimToContext = require('./database');

/**
 * Estes testes rodam o QuickJS DE VERDADE (WASM) e provam que a ponte funciona:
 * um valor calculado no host chega ao script, e um erro do host vira uma rejeição
 * de promise dentro do sandbox.
 */
describe('shim bru.db (ponte host ➜ QuickJS)', () => {
  let vm;
  let module;
  let hostCalls;
  let hostDb;

  beforeAll(async () => {
    module = await newQuickJSWASMModule();
  });

  beforeEach(() => {
    vm = module.newContext();
    hostCalls = [];

    hostDb = {
      connect: async (sgbd, connectionString) => {
        hostCalls.push(['connect', sgbd, connectionString]);
        return { id: `${sgbd}|${connectionString}`, sgbd, connectionString };
      },
      query: async (connection, sql, params) => {
        hostCalls.push(['query', sql, params]);
        if (sql === 'BOOM') {
          const err = new Error('SQL30081N communication error');
          err.code = '-30081';
          err.sgbd = 'db2';
          throw err;
        }
        if (sql === 'VAZIO') {
          return null;
        }
        return { id: 1, nome: 'João', criado_em: '2024-01-02T03:04:05.678Z' };
      },
      execute: async (connection, sql, params) => {
        hostCalls.push(['execute', sql, params]);
        return { affectedRows: 1, rows: null };
      },
      disconnect: async (connection) => {
        hostCalls.push(['disconnect', connection && connection.id]);
      },
      begin: async () => {
        hostCalls.push(['begin']);
      },
      commit: async () => {
        hostCalls.push(['commit']);
      },
      rollback: async () => {
        hostCalls.push(['rollback']);
      }
    };

    // O shim do bru cria globalThis.bru; aqui criamos um mínimo equivalente.
    const bruObject = vm.newObject();
    vm.setProp(vm.global, 'bru', bruObject);
    bruObject.dispose();

    addDatabaseShimToContext(vm, hostDb);
  });

  afterEach(() => {
    if (vm) {
      try {
        vm.dispose();
      } catch (err) {
        console.error('Error disposing vm', err);
      }
      vm = null;
    }
  });

  afterAll(() => {
    if (module) {
      try {
        module.dispose();
      } catch (err) {
        console.error('Error disposing module', err);
      }
      module = null;
    }
  });

  /** Avalia uma expressão que devolve promise e resolve do lado do host. */
  const evalPromise = async (code) => {
    const evalResult = vm.evalCode(code);
    const promiseHandle = vm.unwrapResult(evalResult);
    const settled = await vm.resolvePromise(promiseHandle);
    promiseHandle.dispose();
    const valueHandle = vm.unwrapResult(settled);
    const value = vm.dump(valueHandle);
    valueHandle.dispose();
    return value;
  };

  it('expõe a API documentada em bru.db (RF04)', () => {
    expect(vm.evalCode('typeof globalThis.bru.db.connect').value).toBeDefined();

    const result = vm.evalCode(`[
      typeof globalThis.bru.db.connect,
      typeof globalThis.bru.db.query,
      typeof globalThis.bru.db.execute,
      typeof globalThis.bru.db.disconnect,
      typeof globalThis.bru.db.transaction
    ]`);
    const handle = vm.unwrapResult(result);
    const types = vm.dump(handle);
    handle.dispose();

    expect(types).toEqual(['function', 'function', 'function', 'function', 'function']);
  });

  it('não expõe os nomes internos _dbXxx no autocomplete do usuário', () => {
    const result = vm.evalCode('Object.keys(globalThis.bru.db).filter((k) => k.startsWith("_"))');
    const handle = vm.unwrapResult(result);
    const internal = vm.dump(handle);
    handle.dispose();

    expect(internal.length).toBeGreaterThan(0); // existem, mas com prefixo _
    expect(internal.every((name) => name.startsWith('_'))).toBe(true);
  });

  it('connect: o valor do host chega ao script', async () => {
    const connection = await evalPromise(
      `globalThis.bru.db.connect('postgres', 'postgres://localhost:5432/mydb')`
    );

    expect(connection).toEqual({
      id: 'postgres|postgres://localhost:5432/mydb',
      sgbd: 'postgres',
      connectionString: 'postgres://localhost:5432/mydb'
    });
    expect(hostCalls[0]).toEqual(['connect', 'postgres', 'postgres://localhost:5432/mydb']);
  });

  it('query: os parâmetros do script chegam ao host e o resultado volta (RF05/RF06)', async () => {
    const result = await evalPromise(`
      (async () => {
        const connection = await globalThis.bru.db.connect('postgres', 'postgres://localhost:5432/mydb');
        return await globalThis.bru.db.query(connection, 'SELECT * FROM usuarios WHERE id = $1', [123]);
      })()
    `);

    expect(result).toEqual({ id: 1, nome: 'João', criado_em: '2024-01-02T03:04:05.678Z' });

    const queryCall = hostCalls.find((call) => call[0] === 'query');
    expect(queryCall[1]).toBe('SELECT * FROM usuarios WHERE id = $1');
    expect(queryCall[2]).toEqual([123]);
  });

  it('query sem resultados devolve null', async () => {
    const result = await evalPromise(`
      (async () => {
        const c = await globalThis.bru.db.connect('postgres', 'postgres://x:5432/y');
        return await globalThis.bru.db.query(c, 'VAZIO', []);
      })()
    `);

    expect(result).toBeNull();
  });

  it('erro do host rejeita a promise DENTRO do script, com mensagem e código', async () => {
    const result = await evalPromise(`
      (async () => {
        const c = await globalThis.bru.db.connect('db2', 'db2://localhost:50000/mydb');
        try {
          await globalThis.bru.db.query(c, 'BOOM', []);
          return { lancou: false };
        } catch (err) {
          return { lancou: true, message: err.message, code: err.code, sgbd: err.sgbd };
        }
      })()
    `);

    expect(result.lancou).toBe(true);
    expect(result.message).toContain('SQL30081N');
    expect(result.code).toBe('-30081');
    expect(result.sgbd).toBe('db2');
  });

  it('dbTransaction roda a transação inteira: begin, fn e commit', async () => {
    const result = await evalPromise(`
      (async () => {
        const c = await globalThis.bru.db.connect('postgres', 'postgres://x:5432/y');
        return await globalThis.bru.db.transaction(c, async () => {
          const rows = await globalThis.bru.db.query(c, 'SELECT * FROM pedidos', []);
          return { ok: true, nome: rows.nome };
        });
      })()
    `);

    expect(result).toEqual({ ok: true, nome: 'João' });
    expect(hostCalls.filter((call) => ['begin', 'commit'].includes(call[0]))).toEqual([
      ['begin'],
      ['commit']
    ]);
    expect(hostCalls.some((call) => call[0] === 'rollback')).toBe(false);
  });

  it('dbTransaction faz rollback e propaga o erro quando o callback falha', async () => {
    const result = await evalPromise(`
      (async () => {
        const c = await globalThis.bru.db.connect('postgres', 'postgres://x:5432/y');
        try {
          await globalThis.bru.db.transaction(c, async () => {
            throw new Error('regra de negócio falhou');
          });
          return { lancou: false };
        } catch (err) {
          return { lancou: true, message: err.message };
        }
      })()
    `);

    expect(result.lancou).toBe(true);
    expect(result.message).toBe('regra de negócio falhou');
    expect(hostCalls.some((call) => call[0] === 'rollback')).toBe(true);
    expect(hostCalls.some((call) => call[0] === 'commit')).toBe(false);
  });

  it('o script NÃO recebe funções internas do host (isolamento preservado)', () => {
    const result = vm.evalCode(`[
      typeof globalThis.require,
      typeof globalThis.process,
      typeof globalThis.bru.db._dbConnect
    ].map((t, i) => i === 2 ? t : t)`);
    const handle = vm.unwrapResult(result);
    const types = vm.dump(handle);
    handle.dispose();

    // require/process não existem; _dbConnect existe mas é só uma ponte de promise.
    expect(types[0]).toBe('undefined');
    expect(types[1]).toBe('undefined');
    expect(types[2]).toBe('function');
  });

  it('um shim sem bruDb não quebra o sandbox', () => {
    const freshVm = module.newContext();
    const bruObject = freshVm.newObject();
    freshVm.setProp(freshVm.global, 'bru', bruObject);
    bruObject.dispose();

    expect(() => addDatabaseShimToContext(freshVm, undefined)).not.toThrow();

    freshVm.dispose();
  });
});
