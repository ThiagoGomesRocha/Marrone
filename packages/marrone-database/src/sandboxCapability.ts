/**
 * Capacidade de banco do HOST, pronta para ser exposta ao sandbox de scripts.
 *
 * POR QUE ISTO VIVE AQUI (e não em cada host)
 * -------------------------------------------
 * O app (Electron) e o CLI precisam da MESMA capacidade `bru.db` e diferem em UM ponto:
 * de onde vêm as credenciais. O app lê do cofre do sistema (safeStorage); o CLI lê de
 * variáveis de ambiente. Duplicar a lógica significaria duplicar também a redação de
 * segredos — e aí uma das cópias ficaria para trás. Então a parte comum vive aqui e a
 * fonte de credencial é injetada (`CredentialProvider`).
 *
 * O que este módulo NÃO faz: falar com `safeStorage` (é API do Electron) ou com
 * `electron-store`. Isso é responsabilidade do host.
 */

import type { SgbdId } from './constants';

/**
 * Recortes ESTRUTURAIS dos tipos públicos do pacote.
 *
 * Existem para evitar um ciclo de import: `index.ts` exporta a fábrica daqui, e aqui
 * precisaríamos importar os tipos de lá. Como TypeScript é estrutural, declarar os
 * recortes localmente é suficiente — o `DatabaseConnection` de verdade satisfaz estes
 * contratos sem nenhuma conversão.
 */
export interface ConnectionRef {
  readonly id: string;
  readonly sgbd: SgbdId;
}

export interface ConnectOptionsLike {
  username?: string;
  password?: string;
  connectTimeoutMs?: number;
  idleTimeoutMs?: number;
}

export interface ExecuteSummaryLike {
  affectedRows: number | null;
  rows: unknown;
}

/** Identificador de conexão que ATRAVESSA a ponte para o QuickJS. Nunca contém senha. */
export interface ConnectionHandle {
  id: string;
  sgbd: SgbdId;
  connectionString: string;
}

export interface ResolvedCredentials {
  username: string;
  password: string;
}

/** De onde o host tira as credenciais. */
export interface CredentialProvider {
  /** Credenciais do SGBD, ou null quando não há nenhuma configurada. */
  getCredentials(sgbdId: string): ResolvedCredentials | null;
  /**
   * Mensagem exibida ao usuário quando faltam credenciais.
   * Fica no provider porque só ele sabe ONDE a credencial deveria estar.
   */
  credentialsHint?(sgbdId: string): string;
}

/**
 * O mínimo da API do pacote de que a capacidade precisa. Injetado para evitar ciclo de import.
 *
 * Declarado com sintaxe de MÉTODO (e não como propriedade de tipo função) de propósito:
 * métodos são bivariantes em TypeScript, então o `ConnectionHandle` real (que estruturalmente
 * tem MAIS membros que `ConnectionRef`) é aceito aqui. Com `strictFunctionTypes` ligado,
 * a forma de propriedade seria rejeitada — foi o que o build apontou.
 */
export interface DatabaseApi {
  dbConnect(sgbd: string, connectionString: string, options?: ConnectOptionsLike): Promise<ConnectionRef>;
  dbQuery(connection: ConnectionRef, sql: string, params?: unknown[]): Promise<unknown>;
  dbExecute(connection: ConnectionRef, sql: string, params?: unknown[]): Promise<ExecuteSummaryLike>;
  dbDisconnect(connection: ConnectionRef): Promise<void>;
  closeAllConnections(): Promise<void>;
}

export interface SandboxCapabilityOptions {
  database: DatabaseApi;
  credentialsProvider: CredentialProvider;
  /** Recebe cada operação para o relatório. Os parâmetros já chegam redigidos. */
  record?: (entry: Record<string, unknown>) => void;
  /** Quando true, os parâmetros NÃO são redigidos. Use só em diagnóstico local. */
  includeSensitive?: boolean;
}

export interface SandboxDatabaseCapability {
  connect(sgbdId: string, connectionString: string, scope?: unknown): Promise<ConnectionHandle>;
  query(handle: ConnectionHandle, sql: string, params?: unknown[], scope?: unknown): Promise<unknown>;
  execute(handle: ConnectionHandle, sql: string, params?: unknown[], scope?: unknown): Promise<ExecuteSummaryLike>;
  disconnect(handle: ConnectionHandle, scope?: unknown): Promise<void>;
  begin(handle: ConnectionHandle, scope?: unknown): Promise<void>;
  commit(handle: ConnectionHandle, scope?: unknown): Promise<void>;
  rollback(handle: ConnectionHandle, scope?: unknown): Promise<void>;
  /** Fecha tudo que ESTA capacidade abriu. Chamar antes de encerrar o processo. */
  closeAll(): Promise<void>;
  openConnectionCount(): number;
}

export const REDACTED = '***';

/**
 * Redação dos parâmetros da query.
 *
 * O relatório HTML circula por e-mail e por chat. Um parâmetro de query pode conter dado
 * sensível (documento, token, senha trocada por UPDATE), então por padrão os valores são
 * omitidos e fica só a quantidade. Mesmo espírito do `--reporter-skip-request-body` da CLI
 * e da flag `includeSensitive` do generate-report.
 */
export const redactParameters = (params: unknown, { includeSensitive = false } = {}): unknown[] => {
  if (!Array.isArray(params)) {
    return [];
  }

  if (includeSensitive) {
    return params;
  }

  return params.map(() => REDACTED);
};

/** Resumo compacto do resultado — nunca o conjunto de linhas (isso seria vazamento). */
export const summarizeResult = (result: unknown): string => {
  if (result === null || result === undefined) {
    return 'sem registros';
  }

  if (Array.isArray(result)) {
    // Lista vazia é "sem registros", igual a null — mais legível no relatório do que
    // "0 registro(s)", e coerente com o formato de retorno (RF05 devolve null, não []).
    return result.length === 0 ? 'sem registros' : `${result.length} registro(s)`;
  }

  if (typeof result === 'object') {
    const summary = result as { affectedRows?: unknown; rows?: unknown };

    // Discrimina o retorno de dbExecute ({ affectedRows, rows }) de uma linha única
    // (formatResult devolve OBJETO exatamente quando há 1 registro — ver RF05).
    if ('rows' in summary && typeof summary.affectedRows === 'number') {
      return `${summary.affectedRows} linha(s) afetada(s)`;
    }

    return '1 registro';
  }

  return String(result);
};

/** SGBDs com transação implícita não têm BEGIN. */
export const beginStatementFor = (sgbd: string): string => {
  switch (sgbd) {
    case 'mysql':
      return 'START TRANSACTION';
    case 'mssql':
      return 'BEGIN TRANSACTION';
    case 'postgres':
      return 'BEGIN';
    default:
      // oracle e db2 usam transação implícita: só COMMIT/ROLLBACK existem.
      return 'SELECT 1';
  }
};

/**
 * Provider de credenciais por VARIÁVEL DE AMBIENTE — usado pelo CLI.
 *
 * Nomes: `<PREFIXO>_<SGBD>_USER` e `<PREFIXO>_<SGBD>_PASSWORD`.
 * Exemplo: MARRONE_DB_POSTGRES_USER / MARRONE_DB_POSTGRES_PASSWORD
 *
 * Não há variável genérica de propósito: uma credencial global seria aplicada a qualquer
 * SGBD, inclusive a um que você não pretendia conectar.
 */
export const createEnvironmentCredentialProvider = (
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
  prefix = 'MARRONE_DB'
): CredentialProvider => {
  const varNames = (sgbdId: string) => {
    const key = sgbdId.toUpperCase();
    return { user: `${prefix}_${key}_USER`, password: `${prefix}_${key}_PASSWORD` };
  };

  return {
    getCredentials(sgbdId: string): ResolvedCredentials | null {
      const { user, password } = varNames(sgbdId);
      const username = env[user];
      const pass = env[password];

      if (username === undefined && pass === undefined) {
        return null;
      }

      return { username: username ?? '', password: pass ?? '' };
    },

    credentialsHint(sgbdId: string): string {
      const { user, password } = varNames(sgbdId);

      return (
        `Defina as variáveis de ambiente ${user} e ${password} `
        + `(elas não são lidas de nenhum arquivo da coleção).`
      );
    }
  };
};

const defaultHint = (sgbdId: string): string =>
  `Nenhuma credencial configurada para o SGBD "${sgbdId}".`;

/** Cria o objeto que o runtime do sandbox expõe como `bru.db`. */
export const createSandboxCapability = ({
  database,
  credentialsProvider,
  record,
  includeSensitive = false
}: SandboxCapabilityOptions): SandboxDatabaseCapability => {
  // Conexões abertas por esta capacidade (Map id → conexão).
  const openConnections = new Map<string, ConnectionRef>();

  const requireConnection = (handle: ConnectionHandle | undefined, operation: string): ConnectionRef => {
    const connection = openConnections.get(handle?.id ?? '');

    if (!connection) {
      throw new Error(
        `bru.db.${operation}: conexão inválida ou já encerrada. Chame bru.db.connect() novamente.`
      );
    }

    return connection;
  };

  const withRecording = async <T>({
    sgbd,
    sql,
    params,
    scope,
    run
  }: {
    sgbd: SgbdId;
    sql: string;
    params: unknown[] | undefined;
    scope: unknown;
    run: () => Promise<T>;
  }): Promise<T> => {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const result = await run();
      record?.({
        timestamp,
        sgbd,
        sql,
        parameters: redactParameters(params, { includeSensitive }),
        durationMs: Date.now() - startedAt,
        status: 'success',
        resultSummary: summarizeResult(result),
        scope
      });
      return result;
    } catch (err) {
      const error = err as { code?: unknown; message?: string };
      record?.({
        timestamp,
        sgbd,
        sql,
        parameters: redactParameters(params, { includeSensitive }),
        durationMs: Date.now() - startedAt,
        status: 'error',
        error: { code: error?.code ?? null, message: error?.message ?? String(err) },
        scope
      });
      throw err;
    }
  };

  const recordTransactionStep = async (
    connection: ConnectionRef,
    step: 'begin' | 'commit' | 'rollback',
    scope: unknown
  ): Promise<void> => {
    const startedAt = Date.now();
    const statement = step === 'begin'
      ? beginStatementFor(connection.sgbd)
      : step === 'commit'
        ? 'COMMIT'
        : 'ROLLBACK';

    await database.dbExecute(connection, statement);

    record?.({
      timestamp: new Date().toISOString(),
      sgbd: connection.sgbd,
      sql: statement,
      operation: step,
      durationMs: Date.now() - startedAt,
      status: 'success',
      scope
    });
  };

  return {
    async connect(sgbdId, connectionString, scope) {
      if (typeof sgbdId !== 'string' || sgbdId.trim() === '') {
        throw new Error('bru.db.connect: o primeiro argumento deve ser o id do SGBD (ex.: "postgres").');
      }

      const sgbd = sgbdId.trim().toLowerCase();
      const credentials = credentialsProvider.getCredentials(sgbd);

      if (!credentials || (!credentials.username && !credentials.password)) {
        const hint = credentialsProvider.credentialsHint?.(sgbd) ?? defaultHint(sgbd);
        throw new Error(`Não há credenciais configuradas para o SGBD "${sgbd}". ${hint}`);
      }

      const startedAt = Date.now();

      const connection = await database.dbConnect(sgbd, connectionString, {
        username: credentials.username,
        password: credentials.password
      });

      // Guardamos só um identificador serializável: o objeto de conexão não atravessa a ponte.
      const handle: ConnectionHandle = {
        id: connection.id,
        sgbd: connection.sgbd,
        connectionString
      };
      openConnections.set(handle.id, connection);

      record?.({
        timestamp: new Date().toISOString(),
        sgbd: connection.sgbd,
        sql: null,
        operation: 'connect',
        // A string de conexão já não tem credenciais por construção.
        connectionString,
        durationMs: Date.now() - startedAt,
        status: 'success',
        scope
      });

      return handle;
    },

    async query(handle, sql, params, scope) {
      const connection = requireConnection(handle, 'query');

      return withRecording({
        sgbd: connection.sgbd,
        sql,
        params,
        scope,
        run: () => database.dbQuery(connection, sql, Array.isArray(params) ? params : [])
      });
    },

    async execute(handle, sql, params, scope) {
      const connection = requireConnection(handle, 'execute');

      return withRecording({
        sgbd: connection.sgbd,
        sql,
        params,
        scope,
        run: () => database.dbExecute(connection, sql, Array.isArray(params) ? params : [])
      });
    },

    async disconnect(handle) {
      const connection = openConnections.get(handle?.id ?? '');

      // Idempotente: desconectar o que já foi desconectado não é erro.
      if (!connection) {
        return;
      }

      openConnections.delete(handle.id);
      const startedAt = Date.now();

      await database.dbDisconnect(connection);

      record?.({
        timestamp: new Date().toISOString(),
        sgbd: connection.sgbd,
        sql: null,
        operation: 'disconnect',
        durationMs: Date.now() - startedAt,
        status: 'success'
      });
    },

    // begin/commit/rollback atravessam a ponte porque a transação inteira é montada DENTRO
    // do VM: um callback não pode cruzar a fronteira (vm.dump não serializa função).
    async begin(handle, scope) {
      await recordTransactionStep(requireConnection(handle, 'begin'), 'begin', scope);
    },

    async commit(handle, scope) {
      await recordTransactionStep(requireConnection(handle, 'commit'), 'commit', scope);
    },

    async rollback(handle, scope) {
      await recordTransactionStep(requireConnection(handle, 'rollback'), 'rollback', scope);
    },

    async closeAll() {
      const connections = Array.from(openConnections.values());
      openConnections.clear();

      for (const connection of connections) {
        try {
          await database.dbDisconnect(connection);
        } catch {
          // Fechar é melhor esforço: não propagamos erro de encerramento.
        }
      }
    },

    openConnectionCount() {
      return openConnections.size;
    }
  };
};
