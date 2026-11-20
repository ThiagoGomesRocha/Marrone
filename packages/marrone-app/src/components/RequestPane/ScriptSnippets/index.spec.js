import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import darkTheme from 'themes/dark/dark';
import ScriptSnippets, { insertSnippetAtCursor } from './index';
import { getSnippets } from 'utils/script-snippets';

const renderSnippets = (props) =>
  render(
    <ThemeProvider theme={darkTheme}>
      <ScriptSnippets {...props} />
    </ThemeProvider>
  );

describe('ScriptSnippets', () => {
  test('mostra só os grupos da tela (Tests não lista Pre Request)', () => {
    renderSnippets({ groups: ['tests', 'db'], onInsert: jest.fn() });
    const select = screen.getByLabelText('Inserir trecho de código');
    const labels = [...select.querySelectorAll('optgroup')].map((g) => g.label);
    expect(labels).toEqual(['Testes', 'Banco de dados']);
    expect(screen.getByLabelText('SGBD dos exemplos de banco')).toBeInTheDocument();
  });

  test('tela sem banco não mostra o seletor de SGBD', () => {
    renderSnippets({ groups: ['prerequest'], onInsert: jest.fn() });
    expect(screen.queryByLabelText('SGBD dos exemplos de banco')).toBeNull();
  });

  test('escolher um snippet entrega exatamente o código dele', () => {
    const onInsert = jest.fn();
    renderSnippets({ groups: ['tests'], onInsert });

    fireEvent.change(screen.getByLabelText('Inserir trecho de código'), { target: { value: 'test-status-200' } });

    const expected = getSnippets({ group: 'tests' }).find((s) => s.id === 'test-status-200').code;
    expect(onInsert).toHaveBeenCalledWith(expected);
  });

  test('exemplo de banco usa o SGBD escolhido no seletor', () => {
    const onInsert = jest.fn();
    renderSnippets({ groups: ['db'], onInsert });

    fireEvent.change(screen.getByLabelText('SGBD dos exemplos de banco'), { target: { value: 'mssql' } });
    fireEvent.change(screen.getByLabelText('Inserir trecho de código'), {
      target: { value: 'db-pre-insert-mssql' }
    });

    const code = onInsert.mock.calls[0][0];
    expect(code).toContain('bru.db.connect(\'mssql\'');
    expect(code).toContain('@p1');
  });
});

describe('insertSnippetAtCursor', () => {
  const fakeEditor = (value) => ({
    value,
    focus: jest.fn(),
    getValue() {
      return this.value;
    },
    replaceSelection: jest.fn(function (text) {
      this.value += text;
    })
  });

  test('adiciona quebra de linha antes quando o texto não termina em \\n', () => {
    const cm = fakeEditor('bru.setVar("a", 1);');
    insertSnippetAtCursor(cm, 'test("x", () => {});');
    expect(cm.replaceSelection).toHaveBeenCalledWith('\ntest("x", () => {});\n');
    expect(cm.focus).toHaveBeenCalled();
  });

  test('não adiciona quebra extra quando o texto já termina em \\n', () => {
    const cm = fakeEditor('bru.setVar("a", 1);\n');
    insertSnippetAtCursor(cm, 'x');
    expect(cm.replaceSelection).toHaveBeenCalledWith('x\n');
  });

  test('editor vazio não recebe quebra antes', () => {
    const cm = fakeEditor('');
    insertSnippetAtCursor(cm, 'x');
    expect(cm.replaceSelection).toHaveBeenCalledWith('x\n');
  });

  test('sem editor não faz nada', () => {
    expect(() => insertSnippetAtCursor(null, 'x')).not.toThrow();
  });
});

describe('ScriptSnippets — opções seguem o menu suspenso do tema', () => {
  test('opções usam dropdown.bg e dropdown.color do tema', () => {
    renderSnippets({ groups: ['tests'], onInsert: jest.fn() });
    const option = screen.getByLabelText('Inserir trecho de código').querySelector('option[value="test-status-200"]');

    const probe = document.createElement('div');
    probe.style.background = darkTheme.dropdown.bg;
    probe.style.color = darkTheme.dropdown.color;
    document.body.appendChild(probe);
    const expectedBg = getComputedStyle(probe).backgroundColor;
    const expectedColor = getComputedStyle(probe).color;
    probe.remove();

    expect(getComputedStyle(option).backgroundColor).toBe(expectedBg);
    expect(getComputedStyle(option).color).toBe(expectedColor);
  });
});
