/**
 * Leitura da string de conexão.
 *
 * REGRA DE SEGURANÇA (decisão D4 do plano v2)
 * -------------------------------------------
 * A string de conexão que o usuário escreve no script NÃO contém credenciais. Ela tem
 * apenas host, porta e database. Usuário e senha vêm do cofre do sistema e são
 * injetados pelo host.
 *
 * Esta regra é IMPOSTA POR CÓDIGO: se a string trouxer `user:senha@`, a função lança.
 * Isso é intencional — é o único jeito de garantir que a senha não acabe no arquivo
 * .bru, no git e no relatório HTML.
 */

import { getDatabaseById, type SgbdId } from './constants';

export interface ParsedConnectionString {
  host: string;
  port: number;
  database: string;
}

const expectedFormat = (sgbd: SgbdId): string => `${sgbd}://host:porta/database`;

export const parseConnectionString = (sgbd: SgbdId, raw: string): ParsedConnectionString => {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error(
      `A string de conexão é obrigatória. Use o formato ${expectedFormat(sgbd)} — `
      + 'por exemplo: postgres://localhost:5432/mydb'
    );
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    // O construtor URL rejeita uma porta fora da faixa (ex.: :99999) antes de qualquer
    // verificação nossa. Recuperamos o número para dar uma mensagem específica em vez
    // de um genérico "URL inválida".
    const portMatch = raw.trim().match(/:\/\/(?:[^/@]*@)?[^/:?#]*:(\d+)/);
    const parsedPort = portMatch ? Number(portMatch[1]) : NaN;

    if (Number.isInteger(parsedPort) && (parsedPort <= 0 || parsedPort > 65535)) {
      throw new Error(
        `Porta inválida na string de conexão: "${portMatch?.[1]}". A porta deve estar entre 1 e 65535.`
      );
    }

    throw new Error(
      `String de conexão inválida: "${raw}". Use o formato ${expectedFormat(sgbd)}.`
    );
  }

  const protocol = url.protocol.replace(/:$/, '');
  if (protocol !== sgbd) {
    throw new Error(
      `A string de conexão é do tipo "${protocol}", mas o SGBD informado foi "${sgbd}". `
      + `Use o formato ${expectedFormat(sgbd)}.`
    );
  }

  // Credenciais na URL são recusadas de propósito — ver o bloco acima.
  if (url.username || url.password) {
    throw new Error(
      'A string de conexão não deve conter usuário e senha. '
      + `Remova "${url.username ? url.username + ':***' : '***'}@" e configure as credenciais `
      + 'em Settings > Database (elas ficam no cofre do sistema, não no arquivo da coleção).'
    );
  }

  const host = url.hostname;
  if (!host) {
    throw new Error(`A string de conexão não informa o host. Use o formato ${expectedFormat(sgbd)}.`);
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!database) {
    throw new Error(`A string de conexão não informa o database. Use o formato ${expectedFormat(sgbd)}.`);
  }

  const defaultPort = getDatabaseById(sgbd).defaultPort;
  const port = url.port ? Number(url.port) : defaultPort;

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Porta inválida na string de conexão: "${url.port}".`);
  }

  return { host, port, database };
};
