/**
 * Normalização de erros entre SGBDs.
 *
 * Cada driver lança erros com formatos completamente diferentes:
 *   - pg         → { code: '28P01', message: '...' }
 *   - mysql2     → { code: 'ER_ACCESS_DENIED_ERROR', errno: 1045, sqlState: '28000' }
 *   - tedious    → { number: 4060, code: 'ESOCKET', message: '...' }
 *   - oracledb   → { errorNum: 12541, code: 'NJS-503', message: '...' }
 *   - ibm_db     → { sqlcode: -30081, state: '08001', message: '...' }
 *
 * Este módulo reduz todos eles a uma forma única, para que o script do usuário
 * possa tratar erro de banco sem saber qual SGBD está por baixo.
 */

import type { SgbdId } from './constants';

export interface NormalizedError {
  /** Código específico do SGBD (string ou número), quando disponível. */
  code: string | number | null;
  /** SQLSTATE / estado, quando o SGBD expõe. */
  state: string | null;
  /** Mensagem legível. */
  message: string;
  /** SGBD de origem. */
  sgbd: SgbdId;
}

export interface DatabaseErrorOptions {
  code?: string | number | null;
  state?: string | null;
  message: string;
  sgbd: SgbdId;
  cause?: unknown;
}

/** Erro único da feature, independente do SGBD. */
export class DatabaseError extends Error {
  public readonly code: string | number | null;
  public readonly state: string | null;
  public readonly sgbd: SgbdId;

  constructor({ code = null, state = null, message, sgbd, cause }: DatabaseErrorOptions) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code ?? null;
    this.state = state ?? null;
    this.sgbd = sgbd;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }

  /** Forma serializável (usada no relatório HTML e nos resultados de teste). */
  toJSON(): NormalizedError {
    return {
      code: this.code,
      state: this.state,
      message: this.message,
      sgbd: this.sgbd
    };
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const firstDefined = (...values: unknown[]): unknown => {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
};

const asCode = (value: unknown): string | number | null => {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return null;
};

const asState = (value: unknown): string | null => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return null;
};

const messageOf = (err: unknown, fallback: string): string => {
  if (typeof err === 'string' && err.length > 0) {
    return err;
  }
  if (isRecord(err) && typeof err.message === 'string' && err.message.length > 0) {
    return err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
};

/**
 * Reduz um erro bruto de qualquer driver a um DatabaseError.
 * Nunca lança: se não reconhecer o formato, devolve um erro genérico mas útil.
 */
export const normalizeError = (sgbd: SgbdId, err: unknown): DatabaseError => {
  if (err instanceof DatabaseError) {
    return err;
  }

  const record = isRecord(err) ? err : {};

  return new DatabaseError({
    code: asCode(firstDefined(record.code, record.sqlcode, record.number, record.errorNum, record.errno)),
    state: asState(firstDefined(record.state, record.sqlState, record.sqlstate)),
    message: messageOf(err, `Erro desconhecido no SGBD ${sgbd}.`),
    sgbd,
    cause: err
  });
};

/**
 * Erro usado quando o pacote do driver não está instalado.
 * Mensagem acionável: diz exatamente o que instalar.
 */
export const driverNotInstalledError = (sgbd: SgbdId, driverPackage: string): DatabaseError =>
  new DatabaseError({
    code: 'DRIVER_NOT_INSTALLED',
    message:
      `O driver "${driverPackage}" (necessário para o SGBD "${sgbd}") não está instalado. `
      + `Instale-o com: npm install ${driverPackage}`,
    sgbd
  });
