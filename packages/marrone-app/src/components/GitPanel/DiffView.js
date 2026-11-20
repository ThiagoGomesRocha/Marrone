import React from 'react';

/**
 * Renderiza um diff unificado (saída do `git show -p` / `git diff`) com cores por tipo de linha.
 * Linhas '+' são adicionadas, '-' removidas, '@@' são cabeçalhos de trecho.
 */
const lineClass = (line) => {
  if (line.startsWith('+++') || line.startsWith('---')) return 'gp-diff-meta';
  if (line.startsWith('@@')) return 'gp-diff-hunk';
  if (line.startsWith('+')) return 'gp-diff-add';
  if (line.startsWith('-')) return 'gp-diff-del';
  return '';
};

const DiffView = ({ diff, emptyText = 'Sem alterações de conteúdo.' }) => {
  if (!diff || !diff.trim()) {
    return <div className="gp-muted">{emptyText}</div>;
  }

  return (
    <pre className="gp-diff" data-testid="git-diff">
      {diff.split('\n').map((line, i) => (
        <div key={i} className={lineClass(line)}>
          {line || ' '}
        </div>
      ))}
    </pre>
  );
};

export default DiffView;
