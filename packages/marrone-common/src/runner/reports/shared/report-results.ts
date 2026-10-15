/**
 * Enriquecimento de UMA requisição para o relatório — usado pelo HTML e pelo JSON.
 *
 * Antes esta transformação vivia dentro do gerador de HTML. Como o gerador de JSON
 * precisava do MESMO resultado (senão os dois relatórios divergiriam), ela foi extraída:
 * os dois geradores chamam esta função, então "o JSON espelha o HTML" é garantido pela
 * estrutura do código, e não por duas cópias que alguém precisa lembrar de manter iguais.
 *
 * O QUE É FEITO AQUI
 * - `request.isHtml` / `response.isHtml`: o template mostra HTML em <iframe>; sem a flag
 *   ele imprimiria a marcação como texto.
 * - `redactImageData`: imagens em base64 viram um marcador — um PNG embutido deixaria o
 *   relatório com megabytes.
 * - HEADERS SENSÍVEIS: o VALOR de headers de credencial (Authorization, Cookie, X-Api-Key,
 *   ...) vira `[REDACTED]`. Antes o relatório mostrava o header cru nas tabelas enquanto o
 *   CURL do MESMO relatório já redigia o mesmo header — ou seja, o CURL dava uma falsa
 *   sensação de segurança enquanto o token seguia no arquivo. A lista de headers é a MESMA
 *   do curl.ts, de propósito: um header novo passa a ser tratado nos dois lugares de uma
 *   vez. Bypass: `includeSensitive: true` (ou `--reporter-include-sensitive` no CLI),
 *   coerente com o que já vale para o CURL e para os parâmetros de banco.
 *   Quem quiser REMOVER headers por completo continua tendo os flags do CLI
 *   (`--reporter-skip-all-headers` / `--reporter-skip-headers`), aplicados antes do gerador.
 * - `curl`: comando pronto, já respeitando `includeSensitive`.
 * - `databaseOperations`: as operações DESTA requisição, REDIGIDAS (a lista crua é
 *   descartada pelo destructuring e substituída pela versão de `enrichResultOperations`).
 */

import type { T_RunnerRequestExecutionResult } from '../../types';
import { isHtmlContentType, getContentType, redactImageData } from '../../utils';
import { buildCurl, isSensitiveHeader } from '../html/curl';
import { enrichResultOperations, type T_ReportDatabaseOperation } from './database-operations';

/** Marcador usado no relatório todo (CURL, headers e parâmetros de banco). */
export const REDACTED_HEADER = '[REDACTED]';

export const maskSensitiveHeaders = (
  headers: unknown,
  includeSensitive: boolean
): Record<string, unknown> | unknown => {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers) || includeSensitive) {
    return headers;
  }

  const masked: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(headers as Record<string, unknown>)) {
    masked[name] = isSensitiveHeader(name) ? REDACTED_HEADER : value;
  }

  return masked;
};

export type T_EnrichedResult = Record<string, unknown> & {
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  curl: string;
  databaseOperations: T_ReportDatabaseOperation[];
};

export const enrichResult = (
  result: T_RunnerRequestExecutionResult | undefined,
  includeSensitive: boolean,
  includeDbRows: boolean
): T_EnrichedResult => {
  // A lista CRUA sai por aqui e nunca entra no retorno: o que chega ao relatório é a
  // versão redigida logo abaixo. Há teste travando esse invariante.
  const { request, response, databaseOperations: rawOperations, ...resultRest } = result || {};
  void rawOperations;

  const requestContentType = request?.headers ? getContentType(request?.headers) : '';
  const responseContentType = response?.headers ? getContentType(response?.headers) : '';

  return {
    ...resultRest,
    request: {
      ...request,
      headers: maskSensitiveHeaders(request?.headers, includeSensitive),
      data: request?.data ? redactImageData(request?.data, requestContentType) : request?.data,
      isHtml: isHtmlContentType(requestContentType)
    },
    response: {
      ...response,
      headers: maskSensitiveHeaders(response?.headers, includeSensitive),
      data: response?.data ? redactImageData(response?.data, responseContentType) : response?.data,
      isHtml: isHtmlContentType(responseContentType)
    },
    curl: buildCurl(request, { includeSensitive }),
    databaseOperations: enrichResultOperations(result, includeSensitive, includeDbRows)
  } as T_EnrichedResult;
};
