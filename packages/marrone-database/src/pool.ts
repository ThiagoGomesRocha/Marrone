/**
 * Cache de conexões.
 *
 * O plano original pedia "Map<connectionString, Connection> com reuso e fechamento
 * automático após timeout". É exatamente isto — e repare que este pool é o NOSSO cache,
 * não o pool do driver: cada DriverConnection é uma conexão física dedicada, o que é
 * pré-requisito para dbTransaction() funcionar corretamente (ver drivers/types.ts).
 */

import type { SgbdId } from './constants';
import { getDriver } from './drivers/registry';
import type { DriverConnectOptions, DriverConnection } from './drivers/types';

export const DEFAULT_CONNECT_TIMEOUT_MS = 15000;
export const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export interface Credentials {
  username?: string;
  password?: string;
}

export interface ConnectionPoolOptions {
  connectTimeoutMs?: number;
  idleTimeoutMs?: number;
}

interface PoolEntry {
  connection: DriverConnection;
  timer: ReturnType<typeof setTimeout> | null;
}

export class ConnectionPool {
  private readonly entries = new Map<string, PoolEntry>();
  private readonly connectTimeoutMs: number;
  private readonly idleTimeoutMs: number;

  constructor(options: ConnectionPoolOptions = {}) {
    this.connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
    this.idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  }

  /**
   * Chave do cache. A SENHA NUNCA entra na chave — a chave pode aparecer em log de
   * diagnóstico, e um segredo não deve poder vazar por ali.
   */
  static buildKey(sgbd: SgbdId, connectionString: string, credentials: Credentials = {}): string {
    return `${sgbd}|${connectionString}|${credentials.username ?? ''}`;
  }

  get size(): number {
    return this.entries.size;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  async acquire(
    sgbd: SgbdId,
    connectionString: string,
    credentials: Credentials = {}
  ): Promise<DriverConnection> {
    const key = ConnectionPool.buildKey(sgbd, connectionString, credentials);
    const existing = this.entries.get(key);

    if (existing) {
      this.touch(key, existing);
      return existing.connection;
    }

    const driver = getDriver(sgbd);
    const options: DriverConnectOptions = {
      connectionString,
      username: credentials.username,
      password: credentials.password,
      connectTimeoutMs: this.connectTimeoutMs
    };

    const connection = await driver.connect(options);

    const entry: PoolEntry = { connection, timer: null };
    this.entries.set(key, entry);
    this.touch(key, entry);

    return connection;
  }

  /** Fecha uma conexão e a remove do cache. */
  async release(key: string): Promise<void> {
    const entry = this.entries.get(key);
    if (!entry) {
      return;
    }

    this.entries.delete(key);
    if (entry.timer) {
      clearTimeout(entry.timer);
    }

    try {
      await entry.connection.close();
    } catch {
      // Fechar é melhor esforço: não propagamos erro de encerramento.
    }
  }

  /**
   * Fecha TODAS as conexões.
   * O host deve chamar isto antes de encerrar o processo — ver a lição do G0 sobre
   * encerrar com conexão nativa pendente.
   */
  async closeAll(): Promise<void> {
    const keys = Array.from(this.entries.keys());
    await Promise.all(keys.map((key) => this.release(key)));
  }

  private touch(key: string, entry: PoolEntry): void {
    if (entry.timer) {
      clearTimeout(entry.timer);
    }

    const timer = setTimeout(() => {
      void this.release(key);
    }, this.idleTimeoutMs);

    // Não deixa o timer do pool segurar o event loop do processo vivo.
    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    entry.timer = timer;
  }
}
