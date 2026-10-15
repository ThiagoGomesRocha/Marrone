import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Database from './index';

/**
 * Estes testes cobrem o aceite do F4 ("o componente renderiza sem erro; campos controlados")
 * e verificam a decisão D4 na ponta da UI: a senha nunca trafega de volta do main process.
 */
const createIpcMock = ({ catalog, credentials = [], testResult = { ok: true } } = {}) => {
  const calls = [];

  const invoke = async (channel, params) => {
    calls.push([channel, params]);

    switch (channel) {
      case 'database:catalog':
        return (
          catalog || {
            ids: ['postgres', 'mysql', 'mssql', 'oracle', 'db2'],
            databases: {}
          }
        );
      case 'database:credentials:list':
        return credentials;
      case 'database:credentials:set':
        return { sgbdId: params.sgbdId, username: params.username, hasPassword: Boolean(params.password) };
      case 'database:credentials:delete':
        return true;
      case 'database:test-connection':
        return testResult;
      default:
        throw new Error(`canal inesperado: ${channel}`);
    }
  };

  return { invoke, calls };
};

describe('Preferences > Database (F4 / F5)', () => {
  beforeEach(() => {
    const { invoke } = createIpcMock();
    window.ipcRenderer = { invoke };
  });

  test('renderiza o formulário e o painel de exemplos', async () => {
    render(<Database />);

    expect(await screen.findByLabelText('Banco de dados')).toBeInTheDocument();
    expect(screen.getByLabelText('Usuário')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByText('Exemplos de uso')).toBeInTheDocument();
  });

  test('lista os 5 SGBDs no select', async () => {
    render(<Database />);

    const select = await screen.findByLabelText('Banco de dados');

    expect(select.options).toHaveLength(5);
    const labels = Array.from(select.options).map((option) => option.textContent);
    expect(labels).toEqual(['PostgreSQL', 'MySQL', 'SQL Server', 'Oracle', 'IBM DB2']);
  });

  test('o campo de senha é do tipo password e o botão Mostrar alterna', async () => {
    render(<Database />);

    const password = await screen.findByLabelText('Senha');
    expect(password).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByText('Mostrar'));
    expect(password).toHaveAttribute('type', 'text');
  });

  test('os campos são controlados (digitar reflete no valor)', async () => {
    render(<Database />);

    const username = await screen.findByLabelText('Usuário');
    fireEvent.change(username, { target: { value: 'joao' } });

    expect(username).toHaveValue('joao');
  });

  test('trocar o SGBD troca o exemplo e a string de conexão sugerida', async () => {
    render(<Database />);

    const select = await screen.findByLabelText('Banco de dados');
    expect(screen.getByText('postgres://localhost:5432/mydb')).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'db2' } });

    await waitFor(() => {
      expect(screen.getByText('db2://localhost:50000/mydb')).toBeInTheDocument();
    });
    expect(screen.queryByText('postgres://localhost:5432/mydb')).not.toBeInTheDocument();
  });

  test('salvar envia usuário e senha ao main process (que cifra no cofre)', async () => {
    const mock = createIpcMock();
    window.ipcRenderer = { invoke: mock.invoke };

    render(<Database />);

    fireEvent.change(await screen.findByLabelText('Usuário'), { target: { value: 'joao' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo' } });
    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() => {
      expect(mock.calls).toContainEqual([
        'database:credentials:set',
        {
          sgbdId: 'postgres',
          username: 'joao',
          password: 'segredo',
          // Fora do SQL Server a autenticação é sempre a do banco ('sql') e não há domínio
          // — a UI manda os campos explícitos para não gravar lixo no cofre.
          authType: 'sql',
          domain: ''
        }
      ]);
    });

    expect(await screen.findByText(/guardadas no cofre/)).toBeInTheDocument();
  });

  test('a senha NÃO é repopulada a partir do main process (só o aviso de que existe)', async () => {
    const mock = createIpcMock({
      credentials: [{ sgbdId: 'postgres', username: 'joao', hasPassword: true }]
    });
    window.ipcRenderer = { invoke: mock.invoke };

    render(<Database />);

    const password = await screen.findByLabelText('Senha');
    expect(password).toHaveValue('');
    expect(await screen.findByText(/Há uma senha guardada/)).toBeInTheDocument();

    // O único payload que voltou do main process não continha senha nenhuma.
    const listCallPayload = mock.calls.find(([channel]) => channel === 'database:credentials:list');
    expect(JSON.stringify(listCallPayload || {})).not.toContain('segredo');
  });

  test('o teste de conexão reporta sucesso e falha', async () => {
    const failing = createIpcMock({ testResult: { ok: false, error: { message: 'SQL30081N', code: '-30081' } } });
    window.ipcRenderer = { invoke: failing.invoke };

    render(<Database />);
    fireEvent.click(await screen.findByText('Testar conexão'));

    expect(await screen.findByRole('alert')).toHaveTextContent('SQL30081N');
  });

  test('um catálogo indisponível mostra aviso mas não quebra a aba', async () => {
    const mock = createIpcMock({
      catalog: { ids: [], databases: {}, warning: 'Catálogo indisponível: não construído' }
    });
    window.ipcRenderer = { invoke: mock.invoke };

    render(<Database />);

    expect(await screen.findByText(/Catálogo indisponível/)).toBeInTheDocument();
    // cai para a lista local e continua funcional
    expect(await screen.findByLabelText('Banco de dados')).toBeInTheDocument();
  });

  /**
   * Autenticação do Windows (Fase 3).
   *
   * Estes testes existem porque a opção é CONDICIONAL: só o SQL Server implementa NTLM, e
   * o campo de domínio só faz sentido com o Windows Authentication selecionado. Um teste
   * que não cobrisse o "não aparece" deixaria passar exatamente o erro que estraga a tela:
   * oferecer Windows Authentication para PostgreSQL.
   */
  describe('autenticação do Windows (SQL Server)', () => {
    const selectDatabase = async (sgbdId) => {
      const select = await screen.findByLabelText('Banco de dados');
      fireEvent.change(select, { target: { value: sgbdId } });
      return select;
    };

    test('o seletor de autenticação NÃO aparece em bancos que não são SQL Server', async () => {
      render(<Database />);

      expect(await screen.findByLabelText('Banco de dados')).toBeInTheDocument();
      expect(screen.queryByText('Tipo de autenticação')).not.toBeInTheDocument();
      expect(screen.queryByRole('radio', { name: /Windows Authentication/ })).not.toBeInTheDocument();
    });

    test('no SQL Server o seletor aparece e o domínio começa escondido', async () => {
      render(<Database />);
      await selectDatabase('mssql');

      expect(await screen.findByText('Tipo de autenticação')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /SQL Server Authentication/ })).toBeChecked();
      // Só aparece com o Windows Authentication selecionado.
      expect(screen.queryByLabelText('Domínio')).not.toBeInTheDocument();
    });

    test('escolher Windows Authentication revela o campo de domínio', async () => {
      render(<Database />);
      await selectDatabase('mssql');

      fireEvent.click(screen.getByRole('radio', { name: /Windows Authentication/ }));

      expect(await screen.findByLabelText('Domínio')).toBeInTheDocument();
      expect(screen.getByLabelText('Usuário (conta do Windows)')).toBeInTheDocument();
    });

    test('salvar como Windows Authentication envia authType e domínio ao cofre', async () => {
      const mock = createIpcMock();
      window.ipcRenderer = { invoke: mock.invoke };

      render(<Database />);
      await selectDatabase('mssql');

      fireEvent.click(screen.getByRole('radio', { name: /Windows Authentication/ }));
      fireEvent.change(await screen.findByLabelText('Usuário (conta do Windows)'), { target: { value: 'joao.silva' } });
      fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo' } });
      fireEvent.change(screen.getByLabelText('Domínio'), { target: { value: 'EMPRESA' } });
      fireEvent.click(screen.getByText('Salvar'));

      await waitFor(() => {
        expect(mock.calls).toContainEqual([
          'database:credentials:set',
          {
            sgbdId: 'mssql',
            username: 'joao.silva',
            password: 'segredo',
            authType: 'windows',
            domain: 'EMPRESA'
          }
        ]);
      });
    });

    test('voltar para SQL Server Authentication não envia domínio (nada de lixo no cofre)', async () => {
      const mock = createIpcMock();
      window.ipcRenderer = { invoke: mock.invoke };

      render(<Database />);
      await selectDatabase('mssql');

      fireEvent.click(screen.getByRole('radio', { name: /Windows Authentication/ }));
      fireEvent.change(await screen.findByLabelText('Domínio'), { target: { value: 'EMPRESA' } });
      fireEvent.click(screen.getByRole('radio', { name: /SQL Server Authentication/ }));
      fireEvent.click(screen.getByText('Salvar'));

      await waitFor(() => {
        const saved = mock.calls.filter(([channel]) => channel === 'database:credentials:set');
        expect(saved).toHaveLength(1);
        expect(saved[saved.length - 1][1]).toMatchObject({ sgbdId: 'mssql', authType: 'sql', domain: '' });
      });
    });

    test('a escolha gravada é restaurada ao reabrir o formulário', async () => {
      const mock = createIpcMock({
        credentials: [
          { sgbdId: 'mssql', username: 'joao.silva', authType: 'windows', domain: 'EMPRESA', hasPassword: true }
        ]
      });
      window.ipcRenderer = { invoke: mock.invoke };

      render(<Database />);
      await selectDatabase('mssql');

      expect(await screen.findByRole('radio', { name: /Windows Authentication/ })).toBeChecked();
      expect(screen.getByLabelText('Domínio')).toHaveValue('EMPRESA');
      expect(screen.getByLabelText('Usuário (conta do Windows)')).toHaveValue('joao.silva');
    });

    test('salvar com o campo de senha vazio NÃO manda a chave password (senha preservada)', async () => {
      const mock = createIpcMock({
        credentials: [{ sgbdId: 'mssql', username: 'joao', authType: 'sql', domain: '', hasPassword: true }]
      });
      window.ipcRenderer = { invoke: mock.invoke };

      render(<Database />);
      await selectDatabase('mssql');

      fireEvent.change(await screen.findByLabelText('Usuário'), { target: { value: 'joao' } });
      fireEvent.click(screen.getByText('Salvar'));

      await waitFor(() => {
        const saved = mock.calls.filter(([channel]) => channel === 'database:credentials:set');
        expect(saved).toHaveLength(1);
        // A chave ausente significa "manter a senha guardada" no main process; enviar
        // string vazia apagaria a senha (era o bug).
        expect(saved[0][1]).not.toHaveProperty('password');
      });
    });
  });
});
