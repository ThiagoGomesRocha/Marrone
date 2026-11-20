import styled from 'styled-components';

/**
 * Estilo da aba Settings > Database.
 *
 * Os controles nativos (input, select, textarea) não herdam o tema sozinhos: sem
 * estas regras, o navegador pinta fundo branco e texto claro (ou vice-versa), e o
 * texto fica ilegível no tema escuro/claro. Os tokens vêm de theme.input.* e theme.text,
 * os mesmos usados pelas demais abas.
 */
const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};

  input[type='text'],
  input[type='password'],
  select,
  textarea {
    width: 100%;
    padding: 0.25rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    outline: none;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &::placeholder {
      color: ${(props) => props.theme.input.placeholder.color};
      opacity: ${(props) => props.theme.input.placeholder.opacity};
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  select option,
  select optgroup {
    color: ${(props) => props.theme.dropdown.color};
    background: ${(props) => props.theme.dropdown.bg};
  }

  input[type='radio'],
  input[type='checkbox'] {
    accent-color: ${(props) => props.theme.input.focusBorder};
  }

  button {
    color: ${(props) => props.theme.text};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: transparent;

    &:not(:disabled):hover {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .db-code {
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
`;

export default StyledWrapper;
