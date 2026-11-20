import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import darkTheme from 'themes/dark/dark';
import HistoryView from './HistoryView';

const collectionPath = 'D:/colecoes/api';
const commit = (hash, message) => ({ hash, message, author_name: 'Ana', date: '2026-11-20T10:00:00Z', parents: [] });

const renderHistory = (invoke) => {
  window.ipcRenderer = { invoke };
  return render(
    <ThemeProvider theme={darkTheme}>
      <HistoryView collectionPath={collectionPath} />
    </ThemeProvider>
  );
};

describe('HistoryView', () => {
  test('lista os commits da branch', async () => {
    const invoke = jest.fn().mockResolvedValue({
      commits: [commit('aaaaaaa1111', 'segundo'), commit('bbbbbbb2222', 'primeiro')],
      hasMore: false
    });
    renderHistory(invoke);

    expect(await screen.findByTestId('commit-aaaaaaa')).toHaveTextContent('segundo');
    expect(screen.getByTestId('commit-bbbbbbb')).toHaveTextContent('primeiro');
    expect(invoke).toHaveBeenCalledWith('renderer:git-history', collectionPath, 50);
  });

  test('escolher um commit lista arquivos e o diff do arquivo aparece colorido', async () => {
    const invoke = jest.fn((channel) => {
      if (channel === 'renderer:git-history') {
        return Promise.resolve({ commits: [commit('aaaaaaa1111', 'altera')], hasMore: false });
      }
      if (channel === 'renderer:git-commit-files') {
        return Promise.resolve([{ path: 'a.bru', status: 'modified' }]);
      }
      if (channel === 'renderer:git-commit-diff') {
        return Promise.resolve('@@ -1 +1 @@\n-url: v1\n+url: v2\n');
      }
      return Promise.resolve(null);
    });
    renderHistory(invoke);

    fireEvent.click(await screen.findByTestId('commit-aaaaaaa'));
    fireEvent.click(await screen.findByTestId('commit-file-a.bru'));

    expect(invoke).toHaveBeenCalledWith('renderer:git-commit-diff', collectionPath, 'aaaaaaa1111', 'a.bru');
    const diff = await screen.findByTestId('git-diff');
    expect(diff.querySelector('.gp-diff-del')).toHaveTextContent('-url: v1');
    expect(diff.querySelector('.gp-diff-add')).toHaveTextContent('+url: v2');
  });

  test('histórico de um arquivo mostra só os commits que o alteraram', async () => {
    const invoke = jest.fn((channel) => {
      if (channel === 'renderer:git-history') {
        return Promise.resolve({ commits: [commit('aaaaaaa1111', 'outro'), commit('bbbbbbb2222', 'do arquivo')], hasMore: false });
      }
      if (channel === 'renderer:git-file-history') {
        return Promise.resolve([commit('bbbbbbb2222', 'do arquivo')]);
      }
      return Promise.resolve(null);
    });
    renderHistory(invoke);

    await screen.findByTestId('commit-aaaaaaa');
    fireEvent.change(screen.getByLabelText('Caminho do arquivo para ver o histórico'), { target: { value: 'login.bru' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ver histórico' }));

    await waitFor(() => expect(screen.queryByTestId('commit-aaaaaaa')).toBeNull());
    expect(screen.getByTestId('commit-bbbbbbb')).toHaveTextContent('do arquivo');
    expect(invoke).toHaveBeenCalledWith('renderer:git-file-history', collectionPath, 'login.bru');
  });

  test('erro do main aparece na tela', async () => {
    const invoke = jest.fn().mockRejectedValue(new Error('Commit inválido'));
    renderHistory(invoke);
    expect(await screen.findByText('Commit inválido')).toBeInTheDocument();
  });
});
