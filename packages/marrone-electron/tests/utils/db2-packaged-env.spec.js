const { describe, test, expect, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  configureDb2ForPackagedApp,
  resolveUnpackedClidriver
} = require('../../src/utils/db2-packaged-env');

/**
 * Este módulo existe por causa de um bug que só aparecia no APP EMPACOTADO: o ibm_db monta o
 * caminho do clidriver a partir do __dirname, que dentro do asar aponta para um lugar de onde o
 * Windows não carrega DLL. O DB2 funcionava em desenvolvimento e quebrava no aplicativo
 * instalado. Teste com o suite normal não pegaria isso — daí os testes abaixo.
 */
describe('db2-packaged-env', () => {
  const recursosOriginais = process.resourcesPath;
  const ibmDbHomeOriginal = process.env.IBM_DB_HOME;
  let tmpDir;

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      tmpDir = null;
    }

    if (recursosOriginais === undefined) {
      delete process.resourcesPath;
    } else {
      process.resourcesPath = recursosOriginais;
    }

    if (ibmDbHomeOriginal === undefined) {
      delete process.env.IBM_DB_HOME;
    } else {
      process.env.IBM_DB_HOME = ibmDbHomeOriginal;
    }
  });

  /** Cria a estrutura de app empacotado: resources/app.asar.unpacked/.../clidriver */
  const criarEstruturaEmpacotada = ({ comClidriver = true } = {}) => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marrone-packed-'));

    const clidriver = path.join(
      tmpDir,
      'app.asar.unpacked',
      'node_modules',
      'ibm_db',
      'installer',
      'clidriver'
    );

    if (comClidriver) {
      fs.mkdirSync(clidriver, { recursive: true });
    }

    process.resourcesPath = tmpDir;

    return clidriver;
  };

  test('em desenvolvimento (sem resourcesPath) não define nada', () => {
    delete process.resourcesPath;
    delete process.env.IBM_DB_HOME;

    expect(resolveUnpackedClidriver()).toBeNull();
    expect(configureDb2ForPackagedApp()).toBeNull();
    expect(process.env.IBM_DB_HOME).toBeUndefined();
  });

  test('no app empacotado aponta IBM_DB_HOME para o clidriver DESEMPACOTADO', () => {
    const clidriver = criarEstruturaEmpacotada();
    delete process.env.IBM_DB_HOME;

    expect(configureDb2ForPackagedApp()).toBe(clidriver);
    expect(process.env.IBM_DB_HOME).toBe(clidriver);
    // O caminho não pode conter 'app.asar/' — tem que ser o .unpacked, que existe no disco.
    expect(process.env.IBM_DB_HOME).toContain('app.asar.unpacked');
  });

  test('não sobrescreve um IBM_DB_HOME definido explicitamente pelo usuário', () => {
    criarEstruturaEmpacotada();
    process.env.IBM_DB_HOME = 'C:\\clidriver\\customizado';

    expect(configureDb2ForPackagedApp()).toBe('C:\\clidriver\\customizado');
    expect(process.env.IBM_DB_HOME).toBe('C:\\clidriver\\customizado');
  });

  test('quando o clidriver desempacotado não existe, não inventa caminho', () => {
    criarEstruturaEmpacotada({ comClidriver: false });
    delete process.env.IBM_DB_HOME;

    expect(resolveUnpackedClidriver()).toBeNull();
    expect(configureDb2ForPackagedApp()).toBeNull();
    expect(process.env.IBM_DB_HOME).toBeUndefined();
  });
});
