/**
 * Formatação do resultado de uma query, conforme os requisitos RF05, RF06 e RF07.
 *
 * Regras (RF05/RF07):
 *   - 0 registros            → null
 *   - 1 registro             → jsonObject (objeto único, NÃO um array de 1)
 *   - N registros            → list<jsonObject>
 *   - valor null/undefined   → a chave é OMITIDA do objeto
 *
 * RF06 (chave = apelido da coluna, ou o nome original se não houver apelido) é resolvido
 * pelo próprio SGBD: se a query usa `SELECT nome AS nome_completo`, o driver já devolve a
 * chave `nome_completo`. Portanto este módulo NUNCA renomeia chaves — só remove as nulas.
 * A ordem das chaves é a que veio do banco.
 */

export type ResultRow = Record<string, unknown>;

/** Remove as chaves cujo valor seja null ou undefined, preservando a ordem das demais. */
const omitNullishValues = (row: ResultRow): ResultRow => {
  const result: ResultRow = {};

  for (const key of Object.keys(row)) {
    const value = row[key];
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }

  return result;
};

/**
 * @param rows linhas cruas devolvidas pelo driver
 * @returns objeto único | lista de objetos | null
 */
export const formatResult = (rows: ResultRow[] | null | undefined): ResultRow | ResultRow[] | null => {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const cleaned = rows.map(omitNullishValues);

  return cleaned.length === 1 ? cleaned[0] : cleaned;
};
