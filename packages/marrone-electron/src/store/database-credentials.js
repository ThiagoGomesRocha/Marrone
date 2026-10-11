const Store = require('electron-store');
const { encryptStringSafe, decryptStringSafe } = require('../utils/encryption');

/**
 * Cofre de credenciais de banco de dados (decisão D4 do plano v2).
 *
 * REGRAS
 * ------
 * 1. A senha NUNCA é gravada em texto plano: usuário e senha passam por
 *    `encryptStringSafe` (electron safeStorage; fallback AES-256 por machine-id),
 *    exatamente como as demais secrets do app (`src/store/env-secrets.js`).
 * 2. `keytar` NÃO é usado em lugar nenhum — ele está arquivado e é um addon nativo
 *    incompatível com este build (npmRebuild: false).
 * 3. A senha NUNCA é escrita no arquivo da coleção (.bru), no git ou no relatório:
 *    a string de conexão no script traz apenas host/porta/database.
 * 4. Este módulo roda no MAIN process. O renderer só acessa via IPC (src/ipc/database.js),
 *    porque `safeStorage` não existe no renderer.
 *
 * Escopo do MVP: UMA conta por SGBD. Múltiplas contas ficam para a Fase 2 — a chave do
 * cofre é o id do SGBD, e suportar N contas exigiria escolher a conta no script
 * (`dbConnect('postgres', url, { account: 'x' })`), o que é uma mudança de API e de UX
 * que não está no RF01–RF08.
 */

const STORE_NAME = 'database-credentials';
const CREDENTIALS_KEY = 'credentials';

const ALGO_PREFIX = /^\$0[01]:/;

/** Um valor está cifrado se começa com o marcador de algoritmo do encryption.js. */
const isEncrypted = (value) => typeof value === 'string' && ALGO_PREFIX.test(value);

const normalizeSgbdId = (sgbdId) => {
  if (typeof sgbdId !== 'string' || sgbdId.trim() === '') {
    throw new Error('sgbdId é obrigatório e deve ser uma string não vazia.');
  }

  return sgbdId.trim().toLowerCase();
};

class DatabaseCredentialsStore {
  constructor() {
    this.store = new Store({
      name: STORE_NAME,
      clearInvalidConfig: true
    });
  }

  _all() {
    return this.store.get(CREDENTIALS_KEY) || {};
  }

  _save(all) {
    this.store.set(CREDENTIALS_KEY, all);
  }

  /**
   * Grava (ou substitui) as credenciais de um SGBD.
   * @returns {{ sgbdId: string, username: string, hasPassword: boolean }} — nunca a senha.
   */
  setCredentials(sgbdId, credentials = {}) {
    const id = normalizeSgbdId(sgbdId);
    const username = credentials.username === undefined || credentials.username === null
      ? ''
      : String(credentials.username);
    const password = credentials.password === undefined || credentials.password === null
      ? ''
      : String(credentials.password);

    const all = this._all();
    all[id] = {
      username: encryptStringSafe(username).value,
      password: encryptStringSafe(password).value
    };
    this._save(all);

    return { sgbdId: id, username, hasPassword: password.length > 0 };
  }

  /**
   * Lê as credenciais em claro. Uso EXCLUSIVO do host, no momento de abrir a conexão —
   * este valor nunca deve ser enviado ao renderer nem ao sandbox de scripts.
   * @returns {{ username: string, password: string } | null}
   */
  getCredentials(sgbdId) {
    const id = normalizeSgbdId(sgbdId);
    const entry = this._all()[id];

    if (!entry) {
      return null;
    }

    return {
      username: entry.username ? decryptStringSafe(entry.username).value : '',
      password: entry.password ? decryptStringSafe(entry.password).value : ''
    };
  }

  deleteCredentials(sgbdId) {
    const id = normalizeSgbdId(sgbdId);
    const all = this._all();

    if (!(id in all)) {
      return false;
    }

    delete all[id];
    this._save(all);

    return true;
  }

  /**
   * Versão para a INTERFACE: nunca devolve senha, só se ela existe.
   * Usada pela aba Settings > Database.
   */
  listCredentials() {
    const all = this._all();

    return Object.keys(all).map((id) => ({
      sgbdId: id,
      username: all[id].username ? decryptStringSafe(all[id].username).value : '',
      hasPassword: Boolean(all[id].password)
    }));
  }

  hasCredentials(sgbdId) {
    const id = normalizeSgbdId(sgbdId);
    const entry = this._all()[id];

    return Boolean(entry && (entry.username || entry.password));
  }

  /**
   * Migração: credenciais gravadas em texto plano por uma versão anterior são
   * recifradas. Roda uma vez, no bootstrap do main process.
   * @returns {number} quantos SGBDs foram migrados
   */
  migratePlaintextCredentials() {
    const all = this._all();
    let migrated = 0;

    for (const id of Object.keys(all)) {
      const entry = all[id];
      const usernamePlain = entry?.username && !isEncrypted(entry.username);
      const passwordPlain = entry?.password && !isEncrypted(entry.password);

      if (!usernamePlain && !passwordPlain) {
        continue;
      }

      all[id] = {
        username: usernamePlain ? encryptStringSafe(entry.username).value : entry.username,
        password: passwordPlain ? encryptStringSafe(entry.password).value : entry.password
      };
      migrated += 1;
    }

    if (migrated > 0) {
      this._save(all);
    }

    return migrated;
  }
}

module.exports = DatabaseCredentialsStore;
