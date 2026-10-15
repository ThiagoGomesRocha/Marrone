const Test = (__marroneTestResults, chai) => async (description, callback) => {
  // Tempo de CADA teste.
  //
  // Medido AQUI porque é o único lugar que sabe quando o teste começou e quando terminou.
  // O campo segue no resultado do teste (Node → app/CLI → relatório), então o relatório
  // mostra quanto cada teste levou sem que nenhuma outra camada precise medir nada.
  //
  // `Date.now()` em resolução de ms: a alternativa seria `performance.now()` com
  // resolução de sub-ms, mas o relatório exibe ms inteiros e o custo do próprio medição
  // é de ms — mais resolução aqui seria precisão falsa.
  const startedAt = Date.now();

  try {
    await callback();
    __marroneTestResults.addResult({ description, status: 'pass', duration: Date.now() - startedAt });
  } catch (error) {
    if (error instanceof chai.AssertionError) {
      const { message, actual, expected } = error;
      __marroneTestResults.addResult({
        description,
        status: 'fail',
        error: message,
        actual,
        expected,
        stack: error.stack || null,
        errorName: error.name || 'AssertionError',
        duration: Date.now() - startedAt
      });
    } else {
      __marroneTestResults.addResult({
        description,
        status: 'fail',
        error: error.message || 'An unexpected error occurred.',
        stack: error.stack || null,
        errorName: error.name || 'Error',
        duration: Date.now() - startedAt
      });
    }
  }
};

module.exports = Test;
