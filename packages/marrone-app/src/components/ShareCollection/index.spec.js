import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import darkTheme from 'themes/dark/dark';
import ShareCollection from './index';

const collection = { uid: 'c1', name: 'API', pathname: 'D:/colecoes/api', items: [] };

const renderShare = (invoke, onClose = jest.fn()) => {
  window.ipcRenderer = { invoke };
  const store = configureStore({
    reducer: { collections: (state = { collections: [collection] }) => state }
  });
  render(
    <Provider store={store}>
      <ThemeProvider theme={darkTheme}>
        <ShareCollection collectionUid="c1" onClose={onClose} />
      </ThemeProvider>
    </Provider>
  );
  return { onClose };
};

describe('ShareCollection: compartilhar com Git', () => {
  test('botão fica desabilitado sem URL', () => {
    renderShare(jest.fn());
    expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeDisabled();
  });

  test('envia a pasta da coleção e a URL para o main e fecha o modal', async () => {
    const invoke = jest.fn().mockResolvedValue({ isRepo: true });
    const { onClose } = renderShare(invoke);

    fireEvent.change(screen.getByLabelText('URL do repositório remoto'), {
      target: { value: '  https://gitlab.com/time/api.git  ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(invoke).toHaveBeenCalledWith(
      'renderer:git-publish',
      'D:/colecoes/api',
      'https://gitlab.com/time/api.git',
      'origin'
    );
  });

  test('erro do main aparece e o modal continua aberto', async () => {
    const invoke = jest.fn().mockRejectedValue(new Error('Remote recusou o envio'));
    const { onClose } = renderShare(invoke);

    fireEvent.change(screen.getByLabelText('URL do repositório remoto'), {
      target: { value: 'https://bitbucket.org/time/api.git' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Remote recusou o envio');
    expect(onClose).not.toHaveBeenCalled();
  });
});
