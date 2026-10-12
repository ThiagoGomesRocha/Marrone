// assertion results types
type T_AssertionPassResult = {
  lhsExpr: string;
  rhsExpr: string;
  rhsOperand: string;
  operator: string;
  status: string;
};

type T_AssertionFailResult = {
  lhsExpr: string;
  rhsExpr: string;
  rhsOperand: string;
  operator: string;
  status: string;
  error: string;
};

type T_AssertionResult = T_AssertionPassResult | T_AssertionFailResult;

// test results types
type T_TestPassResult = {
  status: string;
  description: string;
  uid?: string;
  isScriptError?: boolean;
};

type T_TestFailResult = {
  status: string;
  description: string;
  error: string;
  uid?: string;
  isScriptError?: boolean;
};

type T_TestResult = T_TestPassResult | T_TestFailResult;

export type T_EmptyRequest = {
  method?: null | undefined;
  url?: null | undefined;
  headers?: null | undefined;
  data?: null | undefined;
  isHtml?: boolean | undefined;
};

// request types
export type T_Request = {
  method: string;
  url: string;
  headers: Record<string, string | number | undefined>;
  data: string | object | null | boolean | number;
  isHtml?: boolean;
};

type T_EmptyResponse = {
  status?: null | undefined;
  statusText?: null | undefined;
  headers?: null | undefined;
  data?: null | undefined;
  responseTime?: number | undefined;
  isHtml?: boolean | undefined;
};

type T_SkippedResponse = {
  status?: string | null | undefined;
  statusText?: string | null | undefined;
  headers?: null | undefined;
  data?: null | undefined;
  responseTime?: number | undefined;
  isHtml?: boolean | undefined;
};

// response types
type T_Response = {
  status: number | string;
  statusText: string;
  headers: Record<string, string | number | undefined>;
  data: string | object | null | boolean | number;
  isHtml?: boolean;
};

/**
 * Operação de banco executada por um script de pré/pós-requisição (RF08).
 *
 * Os parâmetros já chegam REDIGIDOS do host (`***`). A redação é repetida no gerador do
 * relatório de propósito: o relatório é um artefato compartilhável, e a garantia não pode
 * depender de quem montou o payload.
 */
export type T_DatabaseOperation = {
  timestamp: string;
  sgbd: string;
  /** null nas operações de ciclo de vida (connect/disconnect). */
  sql: string | null;
  /** Presente nas operações de ciclo de vida: connect, disconnect, begin, commit, rollback. */
  operation?: string;
  parameters?: unknown[];
  /** Sem credenciais, por construção. Presente só no registro de `connect`. */
  connectionString?: string;
  durationMs: number;
  status: 'success' | 'error';
  resultSummary?: string;
  /** Linhas devolvidas pela consulta. Limitadas a 20 por operação (MAX_RECORDED_ROWS, no @marrone/database). */
  resultRows?: unknown[];
  /** Total real de linhas antes do corte, para o relatório poder avisar quanto ficou de fora. */
  resultRowsTotal?: number;
  /** true quando a consulta devolveu mais linhas do que o teto gravado. */
  resultRowsTruncated?: boolean;
  error?: { code?: string | number | null; message?: string };
  scope?: unknown;
};

// result type
export type T_RunnerRequestExecutionResult = {
  iterationIndex: number;
  name: string;
  path: string;
  request: T_EmptyRequest | T_Request;
  response: T_EmptyResponse | T_Response | T_SkippedResponse;
  status: null | undefined | string;
  skipped?: boolean;
  skipReason?: string;
  error: null | undefined | string;
  assertionResults?: T_AssertionResult[];
  testResults?: T_TestResult[];
  preRequestTestResults?: T_TestResult[];
  postResponseTestResults?: T_TestResult[];
  /** Operações de banco que os scripts desta requisição executaram (RF08). */
  databaseOperations?: T_DatabaseOperation[];
  runDuration: number;
};

export type T_RunnerResults = {
  iterationIndex: number;
  iterationData?: any; // todo - csv/json row data
  results: T_RunnerRequestExecutionResult[];
  summary: T_RunSummary;
};

// run summary type
export type T_RunSummary = {
  totalRequests: number;
  passedRequests: number;
  failedRequests: number;
  errorRequests: number;
  skippedRequests: number;
  skippedByBail: number;
  totalAssertions: number;
  passedAssertions: number;
  failedAssertions: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalPreRequestTests: number;
  passedPreRequestTests: number;
  failedPreRequestTests: number;
  totalPostResponseTests: number;
  passedPostResponseTests: number;
  failedPostResponseTests: number;
};
