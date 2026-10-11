/**
 * Normalização de valores para tipos JSON-safe.
 *
 * POR QUE ISTO EXISTE
 * -------------------
 * Dois motivos independentes:
 *
 * 1. A ponte host → QuickJS não preserva Date, Buffer nem BigInt. Valores precisam ser
 *    convertidos NO HOST, antes de cruzar a ponte.
 * 2. O relatório HTML serializa o resultado em JSON. `JSON.stringify(Date)` produz uma
 *    string no fuso LOCAL, `JSON.stringify(BigInt)` lança TypeError, e Buffer vira
 *    `{"type":"Buffer","data":[...]}` — três comportamentos ruins para o usuário.
 *
 * DECISÃO DE DESIGN (resolve uma ambiguidade do plano original)
 * ------------------------------------------------------------
 * O plano pedia, ao mesmo tempo, "Number (Oracle pode devolver string) → number" e
 * "DECIMAL/BigDecimal → string preservando a precisão". As duas regras se contradizem
 * quando não há informação de tipo da coluna.
 *
 * Resolução adotada — converter SOMENTE quando não há risco de perda:
 *   - string de inteiro com até 15 dígitos e dentro de Number.MAX_SAFE_INTEGER → number
 *     (conveniente: ids, contadores, colunas NUMBER inteiras do Oracle)
 *   - string com ponto decimal ou expoente → permanece string
 *     (obrigatório: dinheiro e DECIMAL; "1.50" convertido para 1.5 perderia a formatação)
 *   - string de inteiro com mais de 15 dígitos → permanece string
 *     (obrigatório: acima de 2^53 o number arredonda em silêncio e corrompe o dado)
 *
 * A regra que tem consequência de correção manda: perda silenciosa de precisão é
 * corrupção de dados; conveniência de tipo não é.
 */

/** Acima disso não arriscamos converter para number (limite de segurança, < 2^53). */
export const MAX_SAFE_INTEGER_DIGITS = 15;

const INTEGER_PATTERN = /^-?\d+$/;

const isSafeIntegerString = (value: string): boolean => {
  if (!INTEGER_PATTERN.test(value)) {
    return false;
  }

  const digits = value.startsWith('-') ? value.slice(1) : value;
  if (digits.length > MAX_SAFE_INTEGER_DIGITS) {
    return false;
  }

  return Number.isSafeInteger(Number(value));
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Normaliza um valor isolado, recursivamente.
 * Nunca lança.
 */
export const normalizeValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  // Date → ISO 8601 em UTC (sempre UTC, independente do fuso da máquina)
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  // BigInt → string (JSON.stringify lançaria TypeError)
  if (typeof value === 'bigint') {
    return value.toString();
  }

  // Buffer / Uint8Array → base64
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    return value.toString('base64');
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString('base64');
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (typeof value === 'string') {
    return isSafeIntegerString(value) ? Number(value) : value;
  }

  if (isPlainObject(value)) {
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      normalized[key] = normalizeValue(value[key]);
    }
    return normalized;
  }

  return value;
};

/**
 * Normaliza uma lista de linhas devolvidas por um driver.
 * Preserva a ordem das chaves — a normalização não reordena nada.
 */
export const normalizeRows = (rows: unknown[] | null | undefined): Record<string, unknown>[] => {
  if (!rows || !Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => (normalizeValue(row) as Record<string, unknown>));
};
