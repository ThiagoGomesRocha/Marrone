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

/**
 * Normaliza a forma de autenticação: só 'windows' é diferente do padrão.
 *
 * Ausente (ou qualquer outro valor) = 'sql', que é o comportamento de sempre — assim uma
 * credencial gravada por uma versão anterior (sem esse campo) continua funcionando igual.
 */
const normalizeAuthType = (authType) => (authType === 'windows' ? 'windows' : 'sql');

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
   *
   * SENHA AUSENTE ≠ SENHA VAZIA. Se `credentials.password` vier `undefined`/`null`, a
   * senha JÁ GUARDADA é preservada; se vier string vazia, a senha gravada passa a ser
   * vazia (é como se apaga). A distinção importa: o formulário promete "deixe o campo
   * vazio para manter a senha", e antes QUALQUER salvamento gravava string vazia —
   * apagando a senha guardada em silêncio.
   *
   * @returns {{ sgbdId: string, username: string, authType: string, hasPassword: boolean }} — nunca a senha.
   */
  setCredentials(sgbdId, credentials = {}) {
    const id = normalizeSgbdId(sgbdId);
    const username = credentials.username === undefined || credentials.username === null
      ? ''
      : String(credentials.username);
    const passwordProvided = credentials.password !== undefined && credentials.password !== null;
    const password = passwordProvided ? String(credentials.password) : '';
    const domain = credentials.domain === undefined || credentials.domain === null
      ? ''
      : String(credentials.domain);
    const authType = normalizeAuthType(credentials.authType);

    const all = this._all();
    const previous = all[id];
    const passwordValue = passwordProvided
      ? encryptStringSafe(password).value
      : (previous?.password ?? encryptStringSafe('').value);

    all[id] = {
      username: encryptStringSafe(username).value,
      password: passwordValue,
      // `authType` e `domain` NÃO são segredo (o domínio aparece até no usuário), então
      // não passam pelo cifra — mas ficam no cofre junto da credencial porque são a mesma
      // decisão de conexão. Só fazem sentido juntos: quem tem a senha tem a conta.
      authType,
      domain
    };
    this._save(all);

    return {
      sgbdId: id,
      username,
      authType,
      hasPassword: passwordProvided ? password.length > 0 : Boolean(previous?.password)
    };
  }

  /**
   * Lê as credenciais em claro. Uso EXCLUSIVO do host, no momento de abrir a conexão —
   * este valor nunca deve ser enviado ao renderer nem ao sandbox de scripts.
   * @returns {{ username: string, password: string, authType: string, domain: string } | null}
   */
  getCredentials(sgbdId) {
    const id = normalizeSgbdId(sgbdId);
    const entry = this._all()[id];

    if (!entry) {
      return null;
    }

    return {
      username: entry.username ? decryptStringSafe(entry.username).value : '',
      password: entry.password ? decryptStringSafe(entry.password).value : '',
      // Entrada gravada por versão anterior (sem os campos) cai no padrão 'sql'.
      authType: normalizeAuthType(entry.authType),
      domain: entry.domain || ''
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
      // Devolvidos para a UI poder restaurar o formulário. Nenhum dos dois é segredo.
      authType: normalizeAuthType(all[id].authType),
      domain: all[id].domain || '',
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
