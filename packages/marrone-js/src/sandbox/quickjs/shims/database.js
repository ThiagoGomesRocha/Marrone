const { cleanJson, cleanCircularJson } = require('../../../utils');
const { marshallToVm } = require('../utils');

/**
 * Expõe `bru.db.*` no sandbox QuickJS.
 *
 * PADRÃO: este arquivo segue o mesmo padrão de `bru._sendRequest` (ver shims/bru.js):
 *   vm.newFunction → vm.newPromise → promise.resolve/reject → promise.settled.then(executePendingJobs).
 *
 * POR QUE NÃO USAR O property-list-bridge GENÉRICO
 * ------------------------------------------------
 * `createAsyncBridge` (utils/property-list-bridge.js) resolve a promise com `undefined`:
 * ele é write-only, para métodos como cookies.add(). Ele documenta explicitamente
 * "Do NOT reuse this for read methods that need to return values". Toda operação de banco
 * aqui PRECISA retornar dados, então usamos o padrão manual.
 *
 * REGRA DE OURO
 * -------------
 * O QuickJS nunca fala com o driver: quem fala é o HOST. As funções aqui recebem
 * `bruDb`, um objeto de funções assíncronas fornecido pelo host, que já resolve as
 * credenciais no cofre e já normaliza Date/Buffer/BigInt antes de devolver.
 * O script NUNCA vê a senha.
 *
 * TRANSAÇÃO
 * ---------
 * `dbTransaction(connection, fn)` é o único método com callback — e um callback não
 * atravessa a ponte (vm.dump não serializa funções). Solução: a transação é montada
 * DENTRO do VM, combinando os três métodos que atravessam (begin/commit/rollback).
 * Assim a API do RF04 fica exatamente como pedida, sem trafegar função.
 */

/** Métodos que atravessam a ponte como promessas do host. */
const BRIDGED_METHODS = [
  { name: 'connect', bridge: '_dbConnect' },
  { name: 'query', bridge: '_dbQuery' },
  { name: 'execute', bridge: '_dbExecute' },
  { name: 'disconnect', bridge: '_dbDisconnect' },
  { name: 'begin', bridge: '_dbBegin' },
  { name: 'commit', bridge: '_dbCommit' },
  { name: 'rollback', bridge: '_dbRollback' }
];

/** Reduz um erro do host a um objeto JSON-safe antes de cruzar a ponte. */
const toVmError = (err) => ({
  message: (err && err.message) || String(err),
  code: err && err.code !== undefined ? err.code : null,
  sgbd: (err && err.sgbd) || null,
  state: (err && err.state !== undefined ? err.state : null)
});

/**
 * @param {Object} vm       contexto QuickJS
 * @param {Object} bruDb    funções do host: { connect, query, execute, disconnect, begin, commit, rollback }
 */
const addDatabaseShimToContext = (vm, bruDb) => {
  if (!bruDb) {
    return;
  }

  const dbObject = vm.newObject();
  const available = [];

  for (const { name, bridge } of BRIDGED_METHODS) {
    const hostFunction = bruDb[name];
    if (typeof hostFunction !== 'function') {
      continue;
    }

    available.push({ name, bridge });

    const fn = vm.newFunction(bridge, (...vmArgs) => {
      const promise = vm.newPromise();
      const args = vmArgs.map((arg) => vm.dump(arg));

      Promise.resolve()
        .then(() => hostFunction(...args))
        .then((result) => {
          // O VM pode ter sido descartado enquanto a operação do host estava pendente.
          if (!vm.alive) return;
          promise.resolve(marshallToVm(cleanCircularJson(result), vm));
        })
        .catch((err) => {
          if (!vm.alive) return;
          promise.reject(marshallToVm(cleanJson(toVmError(err)), vm));
        });

      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });

    fn.consume((handle) => vm.setProp(dbObject, bridge, handle));
  }

  // Pendura o objeto em globalThis.bru.db (o shim do bru já rodou antes deste).
  const bruHandle = vm.getProp(vm.global, 'bru');
  vm.setProp(bruHandle, 'db', dbObject);
  bruHandle.dispose();
  dbObject.dispose();

  // API amigável, montada dentro do VM. As referências _dbXxx são capturadas ANTES de
  // sobrescrever os nomes públicos, para não criar recursão.
  const captures = available.map(({ name, bridge }) => `const _${name} = db.${bridge};`).join('\n    ');
  const wrappers = available
    .map(({ name }) => {
      const signatures = {
        connect: '(sgbd, connectionString) => _connect(sgbd, connectionString)',
        query: '(connection, sql, params) => _query(connection, sql, params)',
        execute: '(connection, sql, params) => _execute(connection, sql, params)',
        disconnect: '(connection) => _disconnect(connection)',
        begin: '(connection) => _begin(connection)',
        commit: '(connection) => _commit(connection)',
        rollback: '(connection) => _rollback(connection)'
      };

      const signature = signatures[name];
      const guarded = signature === undefined ? '' : `if (_${name}) db.${name} = ${signature};`;

      return guarded;
    })
    .filter(Boolean)
    .join('\n    ');

  const hasTransactionParts = ['begin', 'commit', 'rollback'].every((name) =>
    available.some((available_) => available_.name === name)
  );

  const transactionCode = hasTransactionParts
    ? `
    db.transaction = async (connection, fn) => {
      await db.begin(connection);
      try {
        const result = await fn(connection);
        await db.commit(connection);
        return result;
      } catch (err) {
        try {
          await db.rollback(connection);
        } catch (rollbackError) {
          // O erro original é o que importa para quem chamou.
        }
        throw err;
      }
    };`
    : `
    db.transaction = async () => {
      throw new Error(
        'dbTransaction não está disponível: o host não forneceu begin/commit/rollback.'
      );
    };`;

  vm.evalCode(`
  (() => {
    const db = globalThis.bru.db;
    ${captures}
    ${wrappers}
    ${transactionCode}
  })();
  `);
};

module.exports = addDatabaseShimToContext;
