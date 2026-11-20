import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import darkTheme from 'themes/dark/dark';
import UpdateNotice, { IGNORED_VERSION_KEY } from './index';

const available = {
  updateAvailable: true,
  currentVersion: '1.3.0-rc.3',
  version: '1.3.0',
  htmlUrl: 'https://github.com/ThiagoGomesRocha/Marrone/releases/tag/1.3.0',
  changelog: '',
  installer: { name: 'marrone-setup-1.3.0.exe', url: 'https://github.com/x/marrone-setup-1.3.0.exe', size: 1 }
};

const renderNotice = (invoke, openExternal = jest.fn()) => {
  window.ipcRenderer = { invoke, openExternal };
  render(
    <ThemeProvider theme={darkTheme}>
      <UpdateNotice version="1.3.0-rc.3" />
    </ThemeProvider>
  );
  return { openExternal };
};

beforeEach(() => localStorage.clear());

describe('UpdateNotice', () => {
  test('mostra o aviso quando há versão stable nova', async () => {
    renderNotice(jest.fn().mockResolvedValue(available));
    expect(await screen.findByText('Nova versão 1.3.0 disponível')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Baixar instalador' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver changelog' })).toBeInTheDocument();
  });

  test('não mostra nada quando já está atualizado', async () => {
    const invoke = jest.fn().mockResolvedValue({ updateAvailable: false });
    renderNotice(invoke);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('renderer:check-app-update', '1.3.0-rc.3'));
    expect(screen.queryByTestId('update-notice')).toBeNull();
  });

  test('versão marcada como ignorada não volta a aparecer', async () => {
    localStorage.setItem(IGNORED_VERSION_KEY, '1.3.0');
    renderNotice(jest.fn().mockResolvedValue(available));
    await waitFor(() => expect(screen.queryByTestId('update-notice')).toBeNull());
  });

  test('"Ignorar esta versão" grava a versão e fecha o aviso', async () => {
    renderNotice(jest.fn().mockResolvedValue(available));
    fireEvent.click(await screen.findByRole('button', { name: 'Ignorar esta versão' }));
    expect(localStorage.getItem(IGNORED_VERSION_KEY)).toBe('1.3.0');
    expect(screen.queryByTestId('update-notice')).toBeNull();
  });

  test('"Ver changelog" abre a página da release no navegador', async () => {
    const { openExternal } = renderNotice(jest.fn().mockResolvedValue(available));
    fireEvent.click(await screen.findByRole('button', { name: 'Ver changelog' }));
    expect(openExternal).toHaveBeenCalledWith(available.htmlUrl);
  });

  test('"Baixar instalador" baixa pelo main e mostra o caminho salvo', async () => {
    const invoke = jest
      .fn()
      .mockResolvedValueOnce(available)
      .mockResolvedValueOnce({ path: 'C:/Users/x/Downloads/marrone-setup-1.3.0.exe' });
    renderNotice(invoke);
    fireEvent.click(await screen.findByRole('button', { name: 'Baixar instalador' }));

    expect(invoke).toHaveBeenLastCalledWith('renderer:download-app-update', {
      url: available.installer.url,
      name: 'marrone-setup-1.3.0.exe'
    });
    expect(await screen.findByTestId('update-download-done')).toHaveTextContent('C:/Users/x/Downloads/marrone-setup-1.3.0.exe');
    expect(screen.getByRole('button', { name: 'Abrir pasta' })).toBeInTheDocument();
  });

  test('falha no download aparece na tela', async () => {
    const invoke = jest.fn().mockResolvedValueOnce(available).mockRejectedValueOnce(new Error('Falha no download (503)'));
    renderNotice(invoke);
    fireEvent.click(await screen.findByRole('button', { name: 'Baixar instalador' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha no download (503)');
  });

  test('release sem instalador só oferece changelog', async () => {
    renderNotice(jest.fn().mockResolvedValue({ ...available, installer: null }));
    await screen.findByText('Nova versão 1.3.0 disponível');
    expect(screen.queryByRole('button', { name: 'Baixar instalador' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver changelog' })).toBeInTheDocument();
  });
});
