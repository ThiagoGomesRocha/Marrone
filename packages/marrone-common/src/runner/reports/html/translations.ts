// Dicionário de traduções do relatório HTML.
//
// O template (template.ts) é um único template literal que embute um app Vue 3 +
// Naive UI. As strings de UI são substituídas em tempo de BUILD via `${translations...}`,
// então NÃO há runtime i18n no Vue — o idioma é decidido quando o relatório é gerado.
//
// O relatório historicamente misturava inglês (base) e português (seção "Database
// Operations"), ambos hardcoded. Este dicionário consolida TUDO em um único lugar,
// com `en` como fallback.

export type HtmlReportTranslations = (typeof htmlReportTranslations)[keyof typeof htmlReportTranslations];

export const htmlReportTranslations = {
  'en': {
    htmlLang: 'en',
    title: 'Marrone',
    pageTitle: 'Marrone run dashboard',
    theme: {
      dark: 'Dark',
      light: 'Light'
    },
    tabs: {
      summary: 'Summary',
      requests: 'Requests',
      database: 'Database Operations'
    },
    metadata: {
      runInformation: 'Run Information',
      dateTime: 'Date & Time',
      version: 'Version',
      environment: 'Environment',
      totalRunDuration: 'Total run duration',
      totalDataReceived: 'Total data received',
      averageResponseTime: 'Average response time'
    },
    summary: {
      totalRequests: 'Total requests',
      totalErrors: 'Total errors',
      totalControls: 'Total Controls',
      totalFailedControls: 'Total Failed Controls',
      skippedRequests: 'Skipped requests',
      colSummaryItem: 'SUMMARY ITEM',
      colTotal: 'TOTAL',
      colPassed: 'PASSED',
      colFailed: 'FAILED',
      colSkipped: 'SKIPPED',
      colError: 'ERROR',
      rowRequests: 'Requests',
      rowAssertions: 'Assertions',
      rowTests: 'Tests',
      iteration: 'Iteration'
    },
    requests: {
      onlyFailed: 'Only Failed',
      showAll: 'Show All'
    },
    result: {
      requestFailed: ' - (request failed)',
      requestInformation: 'REQUEST INFORMATION',
      file: 'File',
      requestMethod: 'Request Method',
      requestUrl: 'Request URL',
      responseInformation: 'RESPONSE INFORMATION',
      responseCode: 'Response Code',
      responseTime: 'Response time',
      testDuration: 'Test duration',
      curlCommand: 'CURL COMMAND',
      copy: 'Copy',
      error: 'Error',
      requestHeaders: 'REQUEST HEADERS',
      requestBody: 'REQUEST BODY',
      responseHeaders: 'RESPONSE HEADERS',
      responseBody: 'RESPONSE BODY',
      assertionsInformation: 'ASSERTIONS INFORMATION',
      testsInformation: 'TESTS INFORMATION',
      headerName: 'Header Name',
      headerValue: 'Header Value',
      expression: 'Expression',
      operator: 'Operator',
      operand: 'Operand',
      status: 'Status',
      description: 'Description',
      duration: 'Duration',
      requestSkippedDueToBail: 'Request skipped due to bail',
      requestSkipped: 'Request Skipped',
      passed: 'Passed'
    },
    database: {
      title: 'Database Operations',
      note: 'Database operations executed by pre and post request scripts. Parameters are redacted by default — the report is a shareable artifact.',
      sgbd: 'SGBD',
      all: 'All',
      status: 'Status',
      // Contém interpolações Vue ({{ ... }}) preservadas verbatim.
      countLabel: '{{ filtered.length }} of {{ operations.length }} operation(s)',
      noMatch: 'No database operation matches the filter.',
      copied: 'Copied!',
      copySql: 'Copy SQL',
      parameters: 'Parameters:',
      result: 'Result:',
      rows: 'Rows',
      showingRows: 'showing {{ operation.resultRows.length }} of {{ operation.resultRowsTotal }} — the rest were omitted',
      operationCardTitle: '🗄️ Database Operation',
      operationNote: 'Operations executed by this request scripts. Parameters are redacted by default — the report is a shareable artifact.',
      success: '✅ Success',
      failure: '❌ Failure',
      script: 'Script',
      connection: 'Connection',
      operation: 'Operation',
      time: 'Time',
      destination: 'Destination',
      sql: 'SQL',
      returnedRows: 'Returned rows'
    }
  },
  'pt-BR': {
    htmlLang: 'pt-BR',
    title: 'Marrone',
    pageTitle: 'Painel de execução do Marrone',
    theme: {
      dark: 'Escuro',
      light: 'Claro'
    },
    tabs: {
      summary: 'Resumo',
      requests: 'Requisições',
      database: 'Operações de Banco de Dados'
    },
    metadata: {
      runInformation: 'Informações da Execução',
      dateTime: 'Data e Hora',
      version: 'Versão',
      environment: 'Ambiente',
      totalRunDuration: 'Duração Total da Execução',
      totalDataReceived: 'Total de Dados Recebidos',
      averageResponseTime: 'Tempo Médio de Resposta'
    },
    summary: {
      totalRequests: 'Total de requisições',
      totalErrors: 'Total de erros',
      totalControls: 'Total de Controles',
      totalFailedControls: 'Total de Controles com Falha',
      skippedRequests: 'Requisições ignoradas',
      colSummaryItem: 'ITEM DO RESUMO',
      colTotal: 'TOTAL',
      colPassed: 'APROVADOS',
      colFailed: 'REPROVADOS',
      colSkipped: 'IGNORADOS',
      colError: 'ERRO',
      rowRequests: 'Requisições',
      rowAssertions: 'Asserções',
      rowTests: 'Testes',
      iteration: 'Iteração'
    },
    requests: {
      onlyFailed: 'Apenas com Falha',
      showAll: 'Mostrar Todos'
    },
    result: {
      requestFailed: ' - (falha na requisição)',
      requestInformation: 'INFORMAÇÕES DA REQUISIÇÃO',
      file: 'Arquivo',
      requestMethod: 'Método',
      requestUrl: 'URL',
      responseInformation: 'INFORMAÇÕES DA RESPOSTA',
      responseCode: 'Código',
      responseTime: 'Tempo de Resposta',
      testDuration: 'Duração do Teste',
      curlCommand: 'COMANDO CURL',
      copy: 'Copiar',
      error: 'Erro',
      requestHeaders: 'CABEÇALHOS DA REQUISIÇÃO',
      requestBody: 'CORPO DA REQUISIÇÃO',
      responseHeaders: 'CABEÇALHOS DA RESPOSTA',
      responseBody: 'CORPO DA RESPOSTA',
      assertionsInformation: 'INFORMAÇÕES DAS ASSERÇÕES',
      testsInformation: 'INFORMAÇÕES DOS TESTES',
      headerName: 'Nome do Cabeçalho',
      headerValue: 'Valor do Cabeçalho',
      expression: 'Expressão',
      operator: 'Operador',
      operand: 'Operando',
      status: 'Status',
      description: 'Descrição',
      duration: 'Duração',
      requestSkippedDueToBail: 'Requisição ignorada devido a bail',
      requestSkipped: 'Requisição Ignorada',
      passed: 'Aprovados'
    },
    database: {
      title: 'Operações de Banco de Dados',
      note: 'Operações de banco executadas pelos scripts de pré e pós-requisição. Os parâmetros aparecem redigidos por padrão — o relatório é um artefato compartilhável.',
      sgbd: 'SGBD',
      all: 'Todos',
      status: 'Status',
      countLabel: '{{ filtered.length }} de {{ operations.length }} operação(ões)',
      noMatch: 'Nenhuma operação de banco corresponde ao filtro.',
      copied: 'Copiado!',
      copySql: 'Copiar SQL',
      parameters: 'Parâmetros:',
      result: 'Resultado:',
      rows: 'Linhas',
      showingRows: 'mostrando {{ operation.resultRows.length }} de {{ operation.resultRowsTotal }} — as demais foram omitidas',
      operationCardTitle: '🗄️ Operação de Banco de Dados',
      operationNote: 'Operações executadas pelos scripts desta requisição. Os parâmetros aparecem redigidos por padrão — o relatório é um artefato compartilhável.',
      success: '✅ Sucesso',
      failure: '❌ Falha',
      script: 'Script',
      connection: 'Conexão',
      operation: 'Operação',
      time: 'Tempo',
      destination: 'Destino',
      sql: 'SQL',
      returnedRows: 'Linhas retornadas'
    }
  }
} as const;

const isSupportedLang = (lang?: string): lang is keyof typeof htmlReportTranslations =>
  !!lang && lang in htmlReportTranslations;

export const getHtmlReportTranslations = (lang?: string): HtmlReportTranslations =>
  isSupportedLang(lang) ? htmlReportTranslations[lang] : htmlReportTranslations.en;
