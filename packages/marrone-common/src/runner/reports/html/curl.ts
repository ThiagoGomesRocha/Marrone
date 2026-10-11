import type { T_Request, T_EmptyRequest } from '../../types';

// Headers that carry credentials or secrets. Masked by default (includeSensitive = false).
const SENSITIVE_HEADERS = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-api-token',
  'x-auth-token',
  'x-access-token',
  'x-api-secret',
  'api-key',
  'apikey',
  'x-secret'
];

// Query string parameters that typically carry credentials. Masked by default.
const SENSITIVE_QUERY_PARAMS = [
  'api_key',
  'apikey',
  'api-key',
  'access_token',
  'token',
  'key',
  'secret',
  'password',
  'auth'
];

const REDACTED = '[REDACTED]';

const isSensitiveHeader = (name: string): boolean => SENSITIVE_HEADERS.includes(name.toLowerCase());

const isSensitiveQueryParam = (name: string): boolean => SENSITIVE_QUERY_PARAMS.includes(name.toLowerCase());

// POSIX-safe single-quote wrapping: turns a'b into 'a'\''b'
const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

// Masks the value of sensitive query parameters in a URL, leaving everything else untouched.
// Falls back to the original URL when it can't be parsed (e.g. template variables like {{host}}).
const maskQueryParamsInUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    let changed = false;
    for (const key of parsed.searchParams.keys()) {
      if (isSensitiveQueryParam(key)) {
        parsed.searchParams.set(key, REDACTED);
        changed = true;
      }
    }
    return changed ? parsed.toString() : url;
  } catch {
    return url;
  }
};

export type TBuildCurlOptions = {
  includeSensitive?: boolean;
};

export const buildCurl = (
  request: T_Request | T_EmptyRequest | null | undefined,
  options: TBuildCurlOptions = {}
): string => {
  const includeSensitive = options.includeSensitive === true;

  if (!request || !request.method || !request.url) {
    return '';
  }

  const method = String(request.method).toUpperCase();
  const url = includeSensitive ? request.url : maskQueryParamsInUrl(request.url);
  const headers = request.headers || {};
  const data = request.data;

  const parts: string[] = [`curl -X ${method}`, shellQuote(url)];

  if (headers && typeof headers === 'object') {
    for (const [name, rawValue] of Object.entries(headers)) {
      if (rawValue === undefined || rawValue === null) {
        continue;
      }
      let value = String(rawValue);
      if (!includeSensitive && isSensitiveHeader(name)) {
        value = REDACTED;
      }
      parts.push(`-H ${shellQuote(`${name}: ${value}`)}`);
    }
  }

  if (data !== null && data !== undefined && data !== '') {
    const body = typeof data === 'object' ? JSON.stringify(data) : String(data);
    if (body !== '') {
      parts.push(`--data-raw ${shellQuote(body)}`);
    }
  }

  return parts.join(' \\\n  ');
};

export { isSensitiveHeader, isSensitiveQueryParam, SENSITIVE_HEADERS, SENSITIVE_QUERY_PARAMS };
