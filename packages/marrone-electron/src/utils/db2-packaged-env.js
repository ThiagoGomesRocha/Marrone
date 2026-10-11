const fs = require('fs');
const path = require('path');

/**
 * Corrige o caminho do clidriver do DB2 no aplicativo EMPACOTADO.
 *
 * O PROBLEMA (descoberto rodando o app empacotado, não em desenvolvimento):
 *
 *   `ibm_db/lib/odbc.js` monta o caminho do clidriver a partir do próprio `__dirname` e o
 *   coloca no PATH, para o Windows encontrar as DLLs (db2cli64.dll etc.):
 *
 *     var clidriver = path.resolve(__dirname, '../installer/clidriver');
 *     process.env.PATH = path.resolve(clidriver, 'bin') + ';' + process.env.PATH;
 *
 *   No aplicativo empacotado, `__dirname` aponta para DENTRO de `app.asar`. O Windows não
 *   carrega DLL de dentro de um asar, então o require do binding nativo falha com
 *   ERROR_MOD_NOT_FOUND (126). Resultado cruel: o DB2 funciona em desenvolvimento e quebra
 *   só no aplicativo instalado.
 *
 * A CORREÇÃO:
 *
 *   O próprio ibm_db respeita `process.env.IBM_DB_HOME`. Apontamos para a cópia
 *   DESEMPACOTADA (`app.asar.unpacked`), que existe no disco de verdade.
 *
 * Em desenvolvimento esta função não faz NADA: o caminho padrão do ibm_db já está correto, e
 * sobrescrevê-lo criaria uma divergência entre desenvolvimento e produção.
 */

/** Caminho do clidriver dentro de app.asar.unpacked, ou null quando não se aplica. */
const resolveUnpackedClidriver = () => {
  if (typeof process.resourcesPath !== 'string') {
    return null;
  }

  const unpacked = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    'node_modules',
    'ibm_db',
    'installer',
    'clidriver'
  );

  try {
    return fs.existsSync(unpacked) ? unpacked : null;
  } catch (err) {
    return null;
  }
};

/** Define IBM_DB_HOME quando (e só quando) o app está empacotado. Devolve o valor final. */
const configureDb2ForPackagedApp = () => {
  // Respeita uma configuração explícita do usuário/ambiente.
  if (process.env.IBM_DB_HOME) {
    return process.env.IBM_DB_HOME;
  }

  const unpacked = resolveUnpackedClidriver();

  if (unpacked) {
    process.env.IBM_DB_HOME = unpacked;
  }

  return process.env.IBM_DB_HOME || null;
};

// Executado no carregamento do módulo: o ibm_db lê IBM_DB_HOME na PRIMEIRA vez que é requerido,
// então precisa estar definido antes de qualquer connect.
configureDb2ForPackagedApp();

module.exports = {
  configureDb2ForPackagedApp,
  resolveUnpackedClidriver
};
