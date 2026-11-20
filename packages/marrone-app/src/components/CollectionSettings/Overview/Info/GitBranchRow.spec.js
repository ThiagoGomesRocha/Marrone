import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import darkTheme from 'themes/dark/dark';
import { GitBranchRow } from './index';

const renderRow = (invoke, onOpenGit = jest.fn()) => {
  window.ipcRenderer = { invoke };
  render(
    <ThemeProvider theme={darkTheme}>
      <GitBranchRow collectionPath="D:/colecoes/api" onOpenGit={onOpenGit} />
    </ThemeProvider>
  );
  return { onOpenGit };
};

describe('GitBranchRow (Overview da coleção)', () => {
  test('mostra o nome da branch quando a pasta é repositório', async () => {
    const invoke = jest.fn().mockResolvedValue({ isRepo: true, branch: 'feature/login' });
    renderRow(invoke);
    expect(await screen.findByText('Branch: feature/login')).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith('renderer:git-status', 'D:/colecoes/api');
  });

  test('pasta sem Git mostra a opção de criar', async () => {
    renderRow(jest.fn().mockResolvedValue({ isRepo: false }));
    expect(await screen.findByText('Pasta sem Git (abrir para criar)')).toBeInTheDocument();
  });

  test('repositório sem branch atual mostra texto explícito', async () => {
    renderRow(jest.fn().mockResolvedValue({ isRepo: true, branch: null }));
    expect(await screen.findByText('Branch: (sem branch)')).toBeInTheDocument();
  });

  test('erro ao ler o Git não quebra a Overview', async () => {
    renderRow(jest.fn().mockRejectedValue(new Error('git não encontrado')));
    expect(await screen.findByText('Não foi possível ler o Git')).toBeInTheDocument();
  });

  test('clique abre a aba Git', async () => {
    const onOpenGit = jest.fn();
    renderRow(jest.fn().mockResolvedValue({ isRepo: true, branch: 'main' }), onOpenGit);
    fireEvent.click(await screen.findByTestId('info-git-row'));
    expect(onOpenGit).toHaveBeenCalled();
  });
});
