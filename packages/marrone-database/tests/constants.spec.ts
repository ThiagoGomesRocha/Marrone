import { SUPPORTED_DATABASES, SUPPORTED_DATABASE_IDS, getDatabaseById } from '../src/constants';

describe('constants — catálogo de SGBDs', () => {
  test('os 5 SGBDs obrigatórios estão presentes', () => {
    expect(SUPPORTED_DATABASE_IDS.sort()).toEqual(['db2', 'mssql', 'mysql', 'oracle', 'postgres']);
  });

  test('getDatabaseById devolve a definição de cada um dos 5 ids', () => {
    for (const id of SUPPORTED_DATABASE_IDS) {
      const database = getDatabaseById(id);
      expect(database.id).toBe(id);
      expect(database.label).toBeTruthy();
      expect(database.defaultPort).toBeGreaterThan(0);
      expect(database.driverPackage).toBeTruthy();
      expect(database.placeholderExample).toBeTruthy();
      expect(database.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test('cada SGBD aponta para o driver correto', () => {
    expect(getDatabaseById('postgres').driverPackage).toBe('pg');
    expect(getDatabaseById('mysql').driverPackage).toBe('mysql2');
    expect(getDatabaseById('mssql').driverPackage).toBe('tedious');
    expect(getDatabaseById('oracle').driverPackage).toBe('oracledb');
    expect(getDatabaseById('db2').driverPackage).toBe('ibm_db');
  });

  test('as portas padrão são as esperadas', () => {
    expect(getDatabaseById('postgres').defaultPort).toBe(5432);
    expect(getDatabaseById('mysql').defaultPort).toBe(3306);
    expect(getDatabaseById('mssql').defaultPort).toBe(1433);
    expect(getDatabaseById('oracle').defaultPort).toBe(1521);
    expect(getDatabaseById('db2').defaultPort).toBe(50000);
  });

  test('o catálogo NÃO expõe sequelizeDialect (não usamos ORM)', () => {
    for (const id of SUPPORTED_DATABASE_IDS) {
      expect(SUPPORTED_DATABASES[id]).not.toHaveProperty('sequelizeDialect');
      expect(SUPPORTED_DATABASES[id]).not.toHaveProperty('sequelize');
    }
  });

  test('id inválido lança erro com a lista de ids válidos', () => {
    expect(() => getDatabaseById('sqlite')).toThrow(/SGBD não suportado: "sqlite"/);
    expect(() => getDatabaseById('sqlite')).toThrow(/postgres/);
    expect(() => getDatabaseById('')).toThrow(Error);
    expect(() => getDatabaseById('POSTGRES')).toThrow(Error); // case-sensitive de propósito
  });
});
