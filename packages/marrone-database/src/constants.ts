/**
 * Catálogo dos SGBDs suportados.
 *
 * Este arquivo é a fonte única de verdade sobre os bancos: a UI (aba Settings > Database)
 * e o host (main process / CLI) leem daqui.
 *
 * IMPORTANTE: não existe campo `sequelizeDialect`. Este projeto NÃO usa Sequelize nem
 * qualquer ORM — o acesso é feito por driver direto (pg, mysql2, tedious, oracledb, ibm_db).
 */

export type SgbdId = 'mysql' | 'postgres' | 'mssql' | 'oracle' | 'db2';

export interface DatabaseDefinition {
  /** Identificador estável, usado em scripts e como chave no cofre de credenciais. */
  id: SgbdId;
  /** Nome exibível na interface. */
  label: string;
  /** Porta padrão do SGBD (usada apenas nos exemplos e na validação do formulário). */
  defaultPort: number;
  /** Pacote npm que implementa o driver. Carregado tardiamente, no host. */
  driverPackage: string;
  /** Descrição legível do estilo de placeholder de parâmetro. */
  placeholderStyle: string;
  /** Exemplo concreto de placeholder, para exibir na aba de exemplos. */
  placeholderExample: string;
  /** Cor de destaque na interface. */
  color: string;
}

export const SUPPORTED_DATABASES: Record<SgbdId, DatabaseDefinition> = {
  mysql: {
    id: 'mysql',
    label: 'MySQL',
    defaultPort: 3306,
    driverPackage: 'mysql2',
    placeholderStyle: 'posicional (?)',
    placeholderExample: 'SELECT * FROM pedidos WHERE id = ?',
    color: '#00758f'
  },
  postgres: {
    id: 'postgres',
    label: 'PostgreSQL',
    defaultPort: 5432,
    driverPackage: 'pg',
    placeholderStyle: 'posicional numerado ($1, $2)',
    placeholderExample: 'SELECT * FROM pedidos WHERE id = $1',
    color: '#336791'
  },
  mssql: {
    id: 'mssql',
    label: 'SQL Server',
    defaultPort: 1433,
    driverPackage: 'tedious',
    placeholderStyle: 'nomeado (@p1, @p2)',
    placeholderExample: 'SELECT * FROM pedidos WHERE id = @p1',
    color: '#a91e22'
  },
  oracle: {
    id: 'oracle',
    label: 'Oracle',
    defaultPort: 1521,
    driverPackage: 'oracledb',
    placeholderStyle: 'posicional numerado (:1, :2)',
    placeholderExample: 'SELECT * FROM pedidos WHERE id = :1',
    color: '#c74634'
  },
  db2: {
    id: 'db2',
    label: 'IBM DB2',
    defaultPort: 50000,
    driverPackage: 'ibm_db',
    placeholderStyle: 'posicional (?)',
    placeholderExample: 'SELECT * FROM pedidos WHERE id = ?',
    color: '#054ada'
  }
};

/** Lista ordenada dos ids suportados. */
export const SUPPORTED_DATABASE_IDS = Object.keys(SUPPORTED_DATABASES) as SgbdId[];

/**
 * Devolve a definição de um SGBD pelo id.
 * Lança um erro explícito se o id não for suportado — nunca devolve undefined.
 */
export const getDatabaseById = (id: string): DatabaseDefinition => {
  const database = (SUPPORTED_DATABASES as Record<string, DatabaseDefinition | undefined>)[id];

  if (!database) {
    throw new Error(
      `SGBD não suportado: "${id}". SGBDs válidos: ${SUPPORTED_DATABASE_IDS.join(', ')}.`
    );
  }

  return database;
};
