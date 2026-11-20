import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: ${(props) => props.theme.text};
  font-size: ${(props) => props.theme.font.size.base};
  min-height: 20rem;

  .gp-muted {
    opacity: 0.7;
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .gp-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .gp-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .gp-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.5rem;

    h4 {
      font-weight: 600;
      margin-top: 0.5rem;
    }
  }

  .gp-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-height: 14rem;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.5rem;
      border-radius: ${(props) => props.theme.border.radius.sm};
      border: 1px solid ${(props) => props.theme.input.border};
    }
  }

  input[type='text'],
  input:not([type]),
  textarea {
    flex: 1;
    min-width: 10rem;
    padding: 0.25rem 0.5rem;
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    font-size: ${(props) => props.theme.font.size.sm};
    outline: none;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }

  textarea {
    width: 100%;
    resize: vertical;
    font-family: inherit;
  }

  .gp-error {
    padding: 0.5rem;
    border-radius: ${(props) => props.theme.border.radius.sm};
    color: ${(props) => props.theme.intent?.danger?.text || props.theme.text};
    background: rgba(220, 38, 38, 0.12);
    font-size: ${(props) => props.theme.font.size.sm};
    white-space: pre-wrap;
  }

  .gp-notice {
    padding: 0.5rem;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: rgba(22, 163, 74, 0.12);
    font-size: ${(props) => props.theme.font.size.sm};
  }
`;

export default StyledWrapper;
