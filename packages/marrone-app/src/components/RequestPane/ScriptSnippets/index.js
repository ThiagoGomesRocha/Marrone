import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { DATABASE_EXAMPLES } from 'components/Preferences/Database/constants';
import { getSnippets, SNIPPET_GROUPS } from 'utils/script-snippets';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-bottom: 0.5rem;

  select {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    padding: 0.125rem 0.375rem;
    max-width: 16rem;

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    option,
    optgroup {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.input.bg};
    }
  }
`;

/**
 * Seletor de trechos de código. Ao escolher um item, o código é entregue por `onInsert`
 * (o chamador insere no cursor do editor). Os exemplos de banco usam o SGBD selecionado.
 *
 * @param {{ groups: string[], onInsert: (code: string) => void }} props
 */
const ScriptSnippets = ({ groups, onInsert }) => {
  const [sgbdId, setSgbdId] = useState('postgres');

  const snippets = useMemo(() => getSnippets({ sgbdId }), [sgbdId]);

  const handleChange = (event) => {
    const snippet = snippets.find((s) => s.id === event.target.value);
    event.target.value = '';
    if (snippet) {
      onInsert(snippet.code);
    }
  };

  return (
    <StyledWrapper>
      {groups.includes('db') && (
        <select aria-label="SGBD dos exemplos de banco" value={sgbdId} onChange={(e) => setSgbdId(e.target.value)}>
          {Object.entries(DATABASE_EXAMPLES).map(([id, example]) => (
            <option key={id} value={id}>
              {example.label}
            </option>
          ))}
        </select>
      )}

      <select aria-label="Inserir trecho de código" value="" onChange={handleChange}>
        <option value="">Inserir snippet…</option>
        {groups.map((group) => (
          <optgroup key={group} label={SNIPPET_GROUPS[group]}>
            {snippets
              .filter((s) => s.group === group)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </StyledWrapper>
  );
};

export default ScriptSnippets;

/**
 * Insere o trecho no cursor do CodeMirror. Quando o texto atual não termina em quebra de
 * linha, adiciona uma antes, para o trecho não grudar na última linha.
 * A mudança dispara o evento 'change', e o CodeEditor salva o script no request.
 */
export const insertSnippetAtCursor = (cm, code) => {
  if (!cm) return;
  const current = cm.getValue();
  const lead = current.length && !current.endsWith('\n') ? '\n' : '';
  cm.focus();
  cm.replaceSelection(`${lead}${code}\n`);
};
