import { normalizeValue, normalizeRows, MAX_SAFE_INTEGER_DIGITS } from '../src/normalizeType';

describe('normalizeType — tipos entre SGBDs (F7 / P6)', () => {
  describe('Date (timestamp do PostgreSQL)', () => {
    test('vira string ISO 8601 em UTC', () => {
      const date = new Date('2024-01-02T03:04:05.678Z');

      expect(normalizeValue(date)).toBe('2024-01-02T03:04:05.678Z');
    });

    test('é sempre UTC, mesmo se a data foi construída com offset', () => {
      // 00:00 em UTC-3 == 03:00 em UTC
      const date = new Date('2024-01-02T00:00:00.000-03:00');

      expect(normalizeValue(date)).toBe('2024-01-02T03:00:00.000Z');
    });

    test('data inválida vira null em vez de "Invalid Date"', () => {
      expect(normalizeValue(new Date('não é data'))).toBeNull();
    });
  });

  describe('Buffer (BLOB)', () => {
    test('vira string base64', () => {
      expect(normalizeValue(Buffer.from('abc'))).toBe('YWJj');
    });

    test('Uint8Array também vira base64', () => {
      expect(normalizeValue(new Uint8Array([97, 98, 99]))).toBe('YWJj');
    });

    test('bytes binários são preservados sem perda', () => {
      const original = Buffer.from([0, 1, 254, 255]);
      const encoded = normalizeValue(original) as string;

      expect(Buffer.from(encoded, 'base64').equals(original)).toBe(true);
    });
  });

  describe('BigInt / inteiros grandes', () => {
    test('BigInt vira string', () => {
      expect(normalizeValue(BigInt('9007199254740993'))).toBe('9007199254740993');
    });

    test('BigDecimal acima de 2^53 (string do DB2) permanece string, sem arredondar', () => {
      const bigDecimal = '9007199254740993';

      expect(normalizeValue(bigDecimal)).toBe('9007199254740993');
      expect(typeof normalizeValue(bigDecimal)).toBe('string');
    });

    test('string de inteiro com mais de 15 dígitos permanece string', () => {
      const digits = '1'.repeat(MAX_SAFE_INTEGER_DIGITS + 1);

      expect(normalizeValue(digits)).toBe(digits);
      expect(typeof normalizeValue(digits)).toBe('string');
    });

    test('string de inteiro seguro vira number', () => {
      expect(normalizeValue('42')).toBe(42);
      expect(normalizeValue('-7')).toBe(-7);
      expect(normalizeValue('0')).toBe(0);
    });
  });

  describe('Decimal / Number', () => {
    test('DECIMAL do MySQL ("1234.56") permanece string, preservando a precisão', () => {
      const result = normalizeValue('1234.56');

      expect(result).toBe('1234.56');
      expect(typeof result).toBe('string');
    });

    test('a forma textual do decimal é preservada ("1.50" NÃO vira 1.5)', () => {
      expect(normalizeValue('1.50')).toBe('1.50');
    });

    test('número nativo passa inalterado', () => {
      expect(normalizeValue(1234.56)).toBe(1234.56);
    });

    test('string que não é número permanece string', () => {
      expect(normalizeValue('concluido')).toBe('concluido');
      expect(normalizeValue('')).toBe('');
    });
  });

  describe('null / undefined', () => {
    test('são preservados (a omissão é responsabilidade do formatResult)', () => {
      expect(normalizeValue(null)).toBeNull();
      expect(normalizeValue(undefined)).toBeUndefined();
    });
  });

  describe('estruturas aninhadas', () => {
    test('array é normalizado recursivamente', () => {
      const result = normalizeValue([new Date('2024-01-02T00:00:00.000Z'), '42', '1.50']);

      expect(result).toEqual(['2024-01-02T00:00:00.000Z', 42, '1.50']);
    });

    test('objeto é normalizado recursivamente, sem reordenar chaves', () => {
      const result = normalizeValue({
        criado_em: new Date('2024-01-02T00:00:00.000Z'),
        total: '19.90',
        itens: [{ id: '9007199254740993', qtd: '3' }]
      }) as Record<string, unknown>;

      expect(Object.keys(result)).toEqual(['criado_em', 'total', 'itens']);
      expect(result.criado_em).toBe('2024-01-02T00:00:00.000Z');
      expect(result.total).toBe('19.90');
      expect((result.itens as Record<string, unknown>[])[0]).toEqual({
        id: '9007199254740993',
        qtd: 3
      });
    });
  });

  describe('normalizeRows', () => {
    test('normaliza cada linha', () => {
      const rows = [{ criado_em: new Date('2024-01-02T00:00:00.000Z'), id: '1' }];

      expect(normalizeRows(rows)).toEqual([{ criado_em: '2024-01-02T00:00:00.000Z', id: 1 }]);
    });

    test('lista vazia ou nula vira array vazio', () => {
      expect(normalizeRows([])).toEqual([]);
      expect(normalizeRows(null)).toEqual([]);
      expect(normalizeRows(undefined)).toEqual([]);
    });
  });
});
