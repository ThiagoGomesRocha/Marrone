import { parseConnectionString } from '../src/connectionString';

describe('parseConnectionString — RF03 + decisão D4 (sem credenciais na URL)', () => {
  test('lê host, porta e database de cada SGBD', () => {
    expect(parseConnectionString('postgres', 'postgres://localhost:5432/mydb')).toEqual({
      host: 'localhost',
      port: 5432,
      database: 'mydb'
    });

    expect(parseConnectionString('mysql', 'mysql://db.interno:3306/mydb')).toEqual({
      host: 'db.interno',
      port: 3306,
      database: 'mydb'
    });

    expect(parseConnectionString('mssql', 'mssql://10.0.0.5:1433/mydb')).toEqual({
      host: '10.0.0.5',
      port: 1433,
      database: 'mydb'
    });

    expect(parseConnectionString('oracle', 'oracle://localhost:1521/mydb')).toEqual({
      host: 'localhost',
      port: 1521,
      database: 'mydb'
    });

    expect(parseConnectionString('db2', 'db2://localhost:50000/mydb')).toEqual({
      host: 'localhost',
      port: 50000,
      database: 'mydb'
    });
  });

  test('usa a porta padrão do SGBD quando a URL omite a porta', () => {
    expect(parseConnectionString('postgres', 'postgres://localhost/mydb').port).toBe(5432);
    expect(parseConnectionString('db2', 'db2://localhost/mydb').port).toBe(50000);
  });

  // Este é o teste que protege a decisão D4.
  test('RECUSA string de conexão que traz usuário e senha', () => {
    expect(() => parseConnectionString('postgres', 'postgres://user:pass@localhost:5432/mydb')).toThrow(
      /não deve conter usuário e senha/
    );

    expect(() => parseConnectionString('mysql', 'mysql://admin:segredo@localhost:3306/mydb')).toThrow(
      /Settings > Database/
    );
  });

  test('a mensagem de erro não ecoa a senha', () => {
    try {
      parseConnectionString('mysql', 'mysql://admin:segredo@localhost:3306/mydb');
      throw new Error('deveria ter lançado');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).not.toContain('segredo');
      expect(message).toContain('admin');
    }
  });

  test('recusa protocolo diferente do SGBD informado', () => {
    expect(() => parseConnectionString('postgres', 'mysql://localhost:3306/mydb')).toThrow(
      /é do tipo "mysql", mas o SGBD informado foi "postgres"/
    );
  });

  test('recusa string vazia, inválida ou sem database', () => {
    expect(() => parseConnectionString('postgres', '')).toThrow(/obrigatória/);
    expect(() => parseConnectionString('postgres', '   ')).toThrow(/obrigatória/);
    expect(() => parseConnectionString('postgres', 'isso não é uma url')).toThrow(/inválida/);
    expect(() => parseConnectionString('postgres', 'postgres://localhost:5432')).toThrow(/não informa o database/);
  });

  test('recusa porta fora da faixa válida', () => {
    expect(() => parseConnectionString('postgres', 'postgres://localhost:99999/mydb')).toThrow(/Porta inválida/);
  });

  test('aceita database com caractere escapado', () => {
    expect(parseConnectionString('postgres', 'postgres://localhost:5432/meu%20banco').database).toBe('meu banco');
  });
});
