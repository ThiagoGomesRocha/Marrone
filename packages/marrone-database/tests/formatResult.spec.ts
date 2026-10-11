import { formatResult } from '../src/formatResult';

describe('formatResult — RF05 / RF06 / RF07', () => {
  // (a) lista com múltiplos objetos
  test('devolve a lista quando há múltiplos registros', () => {
    const rows = [
      { id: 1, nome: 'João' },
      { id: 2, nome: 'Maria' }
    ];

    expect(formatResult(rows)).toEqual([
      { id: 1, nome: 'João' },
      { id: 2, nome: 'Maria' }
    ]);
  });

  // (b) objeto único
  test('devolve um objeto (não um array) quando há um único registro', () => {
    const result = formatResult([{ id: 1, nome: 'João' }]);

    expect(Array.isArray(result)).toBe(false);
    expect(result).toEqual({ id: 1, nome: 'João' });
  });

  // (c) lista vazia
  test('devolve null para lista vazia, null e undefined', () => {
    expect(formatResult([])).toBeNull();
    expect(formatResult(null)).toBeNull();
    expect(formatResult(undefined)).toBeNull();
  });

  // (d) valores nulos omitidos
  test('omite as chaves com valor null', () => {
    const rows = [
      { id: 1, nome: 'João', telefone: null },
      { id: 2, nome: 'Maria', telefone: null }
    ];

    expect(formatResult(rows)).toEqual([{ id: 1, nome: 'João' }, { id: 2, nome: 'Maria' }]);
  });

  // (e) mistura de nulos e valores presentes
  test('remove só as chaves nulas, mantendo as demais no mesmo objeto', () => {
    const result = formatResult([
      { id: 1, nome: 'João', email: null, telefone: '11-99999-9999', observacao: undefined }
    ]);

    expect(result).toEqual({ id: 1, nome: 'João', telefone: '11-99999-9999' });
  });

  // (f) chaves com apelido preservadas
  test('preserva chaves com apelido exatamente como vieram do banco', () => {
    const rows = [
      { id: 1, nome_completo: 'João Silva', email: 'joao@x.com' },
      { id: 2, nome_completo: 'Maria Souza', email: 'maria@x.com' }
    ];

    const result = formatResult(rows) as Record<string, unknown>[];

    expect(Object.keys(result[0])).toEqual(['id', 'nome_completo', 'email']);
    expect(result[0].nome_completo).toBe('João Silva');
  });

  // extras que protegem comportamento já decidido
  test('preserva a ordem das chaves devolvida pelo banco', () => {
    const result = formatResult([{ z: 1, a: 2, m: 3 }]) as Record<string, unknown>;

    expect(Object.keys(result)).toEqual(['z', 'a', 'm']);
  });

  test('valores falsy legítimos NÃO são omitidos (0, false, string vazia)', () => {
    const result = formatResult([{ zero: 0, falso: false, vazio: '' }]);

    expect(result).toEqual({ zero: 0, falso: false, vazio: '' });
  });

  test('um único registro totalmente nulo vira objeto vazio', () => {
    expect(formatResult([{ a: null, b: undefined }])).toEqual({});
  });
});
