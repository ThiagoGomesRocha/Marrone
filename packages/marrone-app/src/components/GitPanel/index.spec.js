import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import darkTheme from 'themes/dark/dark';
import GitPanel from './index';
import { gitChannelFor } from './api';

const collection = { uid: 'c1', pathname: 'D:/colecoes/api' };

const repoStatus = (over = {}) => ({
  isRepo: true,
  gitRootPath: collection.pathname,
  branch: 'main',
  tracking: 'origin/main',
  ahead: 0,
  behind: 0,
  hasCommits: true,
  mergeInProgress: false,
  branches: ['main', 'feature/x'],
  remotes: [{ name: 'origin', url: 'https://exemplo.com/r.git' }],
  staged: [],
  unstaged: [{ path: 'login.bru' }],
  conflicted: [],
  stashes: [],
  ...over
});

const renderPanel = (invoke) => {
  window.ipcRenderer = { invoke };
  return render(
    <ThemeProvider theme={darkTheme}>
      <GitPanel collection={collection} onClose={jest.fn()} />
    </ThemeProvider>
  );
};

describe('gitChannelFor', () => {
  test('converte o nome do método no canal registrado no main', () => {
    expect(gitChannelFor('status')).toBe('renderer:git-status');
    expect(gitChannelFor('addRemote')).toBe('renderer:git-add-remote');
    expect(gitChannelFor('stashCreate')).toBe('renderer:git-stash-create');
    expect(gitChannelFor('resolveConflict')).toBe('renderer:git-resolve-conflict');
    expect(gitChannelFor('completeMerge')).toBe('renderer:git-complete-merge');
  });
});

describe('GitPanel', () => {
  test('pasta sem repositório oferece inicializar e compartilhar', async () => {
    const invoke = jest.fn().mockResolvedValue({ isRepo: false, collectionPath: collection.pathname });
    renderPanel(invoke);

    expect(await screen.findByText('Inicializar Git')).toBeInTheDocument();
    expect(screen.getByText('Compartilhar com Git')).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith('renderer:git-status', collection.pathname);
  });

  test('inicializar chama o main com o caminho da coleção', async () => {
    const invoke = jest
      .fn()
      .mockResolvedValueOnce({ isRepo: false, collectionPath: collection.pathname })
      .mockResolvedValueOnce(repoStatus({ hasCommits: false, unstaged: [] }));
    renderPanel(invoke);

    fireEvent.click(await screen.findByText('Inicializar Git'));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('renderer:git-init', collection.pathname)
    );
    expect(await screen.findByText(/sem commits ainda/)).toBeInTheDocument();
  });

  test('repositório mostra a branch e não deixa dar push sem commits', async () => {
    const invoke = jest.fn().mockResolvedValue(repoStatus({ hasCommits: false, unstaged: [] }));
    renderPanel(invoke);

    expect(await screen.findByText('main')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Push' })).toBeDisabled();
  });

  test('erro do main aparece para o usuário', async () => {
    const invoke = jest
      .fn()
      .mockResolvedValueOnce(repoStatus())
      .mockRejectedValueOnce(new Error('Ainda há conflitos não resolvidos'));
    renderPanel(invoke);

    await screen.findByText('main');
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Ainda há conflitos não resolvidos')).toBeInTheDocument();
  });

  test('aba de conflitos só aparece quando há conflito', async () => {
    const invoke = jest.fn().mockResolvedValue(repoStatus());
    const { unmount } = renderPanel(invoke);
    await screen.findByText('main');
    expect(screen.queryByTestId('tab-trigger-conflicts')).toBeNull();
    unmount();

    const withConflict = jest.fn().mockResolvedValue(
      repoStatus({ mergeInProgress: true, conflicted: [{ path: 'req.bru' }] })
    );
    renderPanel(withConflict);
    expect(await screen.findByTestId('tab-trigger-conflicts')).toBeInTheDocument();
  });

  test('remover remote pede confirmação e não chama o main sem ela', async () => {
    const invoke = jest.fn().mockResolvedValue(repoStatus());
    window.confirm = jest.fn().mockReturnValue(false);
    renderPanel(invoke);

    await screen.findByText('main');
    fireEvent.click(screen.getByTestId('tab-trigger-remotes'));
    fireEvent.click(await screen.findByRole('button', { name: 'Remover' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalledWith('renderer:git-remove-remote', expect.anything(), expect.anything());
  });
});
