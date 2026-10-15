/**
 * Merge dos resultados de teste — fonte única para o HTML e o JSON.
 *
 * O runner separa os testes em TRÊS listas por requisição: os de pré-requisição, os de
 * pós-resposta e os da aba Tests. O relatório os apresenta juntos, e os totais do resumo
 * precisam somar as três origens — senão "Tests 2/2" no card não bate com a tabela do
 * topo.
 *
 * POR QUE AQUI E NÃO DENTRO DO TEMPLATE: o template HTML já inlinava essa lógica via
 * `.toString()` (mesmo padrão de `getFilteredRequestResults`). Enquanto a regra vivia só
 * lá, o gerador de JSON não tinha como garantir que mostrava a mesma coisa — e os dois
 * relatórios podiam divergir sem ninguém notar. Agora é a MESMA função: o template a
 * inlina, o gerador de JSON a importa.
 *
 * ATENÇÃO: esta função é inlinada no HTML via `.toString()`, então precisa ser
 * AUTOSSUFICIENTE — nada de helper de módulo aqui dentro (um `asCount` externo viraria
 * "asCount is not defined" no browser). Por isso a normalização de contagem é local.
 *
 * Aceita qualquer payload (genérico) porque o objeto chega heterogêneo: o payload do
 * template e o resultado enriquecido do JSON não são o mesmo tipo.
 *
 * Mutável de propósito: o template já muta o payload que ele mesmo desserializou, e o
 * gerador de JSON aplica sobre a sua própria cópia enriquecida.
 */
export const mergeTestResults = <T>(runnerResults: T): T => {
  // Autossuficiência: precisa existir dentro do escopo da função (ver o cabeçalho).
  const asCount = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

  if (!Array.isArray(runnerResults)) {
    return runnerResults;
  }

  runnerResults.forEach((iteration: any) => {
    const summary = iteration?.summary;

    if (summary) {
      // Somar as três origens. Sem isto o resumo conta só os testes da aba Tests.
      summary.totalTests = asCount(summary.totalTests) + asCount(summary.totalPreRequestTests) + asCount(summary.totalPostResponseTests);
      summary.passedTests = asCount(summary.passedTests) + asCount(summary.passedPreRequestTests) + asCount(summary.passedPostResponseTests);
      summary.failedTests = asCount(summary.failedTests) + asCount(summary.failedPreRequestTests) + asCount(summary.failedPostResponseTests);
    }

    (iteration?.results ?? []).forEach((result: any) => {
      result.testResults = [
        ...(result.preRequestTestResults || []),
        ...(result.postResponseTestResults || []),
        ...(result.testResults || [])
      ];
    });
  });

  return runnerResults;
};
