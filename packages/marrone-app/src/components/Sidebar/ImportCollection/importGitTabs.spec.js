import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import darkTheme from 'themes/dark/dark';
import GitHubTokenTab from './GitHubTokenTab';
import LocalGitFolderTab from './LocalGitFolderTab';
import GitHubTab from './GitHubTab';
import OpenLocalGitFolder from '../OpenLocalGitFolder';
import { browseDirectory, scanForMarroneFiles, openMultipleCollections } from 'providers/ReduxStore/slices/collections/actions';

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectory: jest.fn(),
  scanForMarroneFiles: jest.fn(),
  openMultipleCollections: jest.fn()
}));

const store = () => configureStore({ reducer: { app: (s = {}) => s } });

const wrap = (ui) =>
  render(
    <Provider store={store()}>
      <ThemeProvider theme={darkTheme}>{ui}</ThemeProvider>
    </Provider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  browseDirectory.mockImplementation(() => () => Promise.resolve('D:/repos/api'));
  scanForMarroneFiles.mockImplementation(() => () => Promise.resolve({ items: ['D:/repos/api/colecao-a'], skippedItems: [] }));
  openMultipleCollections.mockImplementation((paths) => ({ type: 'open', paths }));
});

describe('GitHubTokenTab', () => {
  test('conecta com o token, lista repositórios e importa o escolhido com o token', async () => {
    const invoke = jest.fn().mockResolvedValue({
      login: 'ana',
      repos: [
        { fullName: 'org/api', cloneUrl: 'https://github.com/org/api.git', private: true, defaultBranch: 'main', description: '' },
        { fullName: 'ana/site', cloneUrl: 'https://github.com/ana/site.git', private: false, defaultBranch: 'main', description: '' }
      ]
    });
    window.ipcRenderer = { invoke };
    const handleSubmit = jest.fn();
    wrap(<GitHubTokenTab handleSubmit={handleSubmit} setErrorMessage={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Token de acesso do GitHub'), { target: { value: 'ghp_teste' } });
    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));

    expect(await screen.findByText('ana')).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith('renderer:github-list-repos', 'ghp_teste');

    fireEvent.change(screen.getByLabelText('Filtrar repositórios'), { target: { value: 'api' } });
    expect(screen.queryByText('ana/site')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Importar' }));
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'git-repository',
        repositoryUrl: 'https://github.com/org/api.git',
        authToken: 'ghp_teste'
      })
    );
  });

  test('token recusado mostra o erro na tela', async () => {
    window.ipcRenderer = { invoke: jest.fn().mockRejectedValue(new Error('Token inválido ou expirado')) };
    const setErrorMessage = jest.fn();
    wrap(<GitHubTokenTab handleSubmit={jest.fn()} setErrorMessage={setErrorMessage} />);

    fireEvent.change(screen.getByLabelText('Token de acesso do GitHub'), { target: { value: 'ruim' } });
    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));

    await waitFor(() => expect(setErrorMessage).toHaveBeenLastCalledWith('Token inválido ou expirado'));
  });
});

describe('LocalGitFolderTab', () => {
  test('pasta que é repositório habilita abrir as coleções', async () => {
    window.ipcRenderer = {
      invoke: jest.fn().mockResolvedValue({ isRepo: true, root: 'D:/repos/api', folderPath: 'D:/repos/api', branch: 'main' })
    };
    const handleSubmit = jest.fn();
    wrap(<LocalGitFolderTab handleSubmit={handleSubmit} setErrorMessage={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Escolher pasta…' }));
    expect(await screen.findByText(/na branch/)).toHaveTextContent('main');

    fireEvent.click(screen.getByRole('button', { name: 'Procurar coleções' }));
    expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({ type: 'local-git-folder', folderPath: 'D:/repos/api' }));
  });

  test('pasta sem Git avisa e não deixa seguir', async () => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue({ isRepo: false }) };
    const setErrorMessage = jest.fn();
    wrap(<LocalGitFolderTab handleSubmit={jest.fn()} setErrorMessage={setErrorMessage} />);

    fireEvent.click(screen.getByRole('button', { name: 'Escolher pasta…' }));
    await waitFor(() => expect(setErrorMessage).toHaveBeenLastCalledWith(expect.stringContaining('não é um repositório Git')));
    expect(screen.getByRole('button', { name: 'Procurar coleções' })).toBeDisabled();
  });
});

describe('OpenLocalGitFolder', () => {
  test('lista as coleções encontradas e abre só as selecionadas', async () => {
    const onClose = jest.fn();
    wrap(<OpenLocalGitFolder folderPath="D:/repos/api" onClose={onClose} />);

    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Abrir 1 coleção/ }));

    expect(openMultipleCollections).toHaveBeenCalledWith(['D:/repos/api/colecao-a']);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('GitHubTab (aba Repositório Git)', () => {
  const submitWith = async (url) => {
    const handleSubmit = jest.fn();
    const setErrorMessage = jest.fn();
    wrap(<GitHubTab handleSubmit={handleSubmit} setErrorMessage={setErrorMessage} />);
    const input = screen.getByTestId('git-url-input');
    fireEvent.change(input, { target: { value: url } });
    fireEvent.submit(input.closest('form'));
    return { handleSubmit, setErrorMessage };
  };

  test.each([
    'https://github.com/org/api.git',
    'https://gitlab.com/grupo/sub/repo.git',
    'https://bitbucket.org/time/api.git',
    'https://git.empresa.local/time/projeto.git',
    'http://192.168.0.10/repo.git',
    'git@github.com:org/api.git',
    'ssh://git@servidor/repo.git'
  ])('aceita %s', async (url) => {
    const { handleSubmit } = await submitWith(url);
    expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({ type: 'git-repository', repositoryUrl: url }));
  });

  test('recusa caminho de pasta (isso é a aba Pasta local)', async () => {
    const { handleSubmit, setErrorMessage } = await submitWith('C:/repos/colecao');
    expect(handleSubmit).not.toHaveBeenCalled();
    expect(setErrorMessage).toHaveBeenCalled();
  });
});
