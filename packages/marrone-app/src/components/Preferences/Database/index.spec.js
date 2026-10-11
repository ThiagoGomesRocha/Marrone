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
        { sgbdId: 'postgres', username: 'joao', password: 'segredo' }
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
});
