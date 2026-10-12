import React from 'react';
import { DATABASE_EXAMPLES, buildScriptExample, getExample } from './constants';

/**
 * Painel de exemplos de uso, atualizado conforme o SGBD selecionado (RF02 / F5).
 *
 * Os exemplos mostram o placeholder correto de cada SGBD e deixam explícito que a
 * string de conexão NÃO leva usuário e senha.
 *
 * A API é sempre `bru.db.*`. Estes exemplos já mostraram `db.connect`/`dbQuery`/`dbExecute`,
 * que NÃO existem no sandbox — um usuário copiou o exemplo e o script quebrou. Os exemplos
 * vêm de ./constants.js, que é onde devem ser corrigidos.
 */
const ExamplesPanel = ({ currentDatabase }) => {
  const example = getExample(currentDatabase);
  const supported = Object.keys(DATABASE_EXAMPLES);

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium mb-1">Exemplos de uso</h3>
      <p className="text-xs opacity-70 mb-3">
        Exemplos para <span className="font-medium">{example.label}</span>. Troque o SGBD na lista acima para ver
        os exemplos correspondentes.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {supported.map((sgbdId) => (
          <span
            key={sgbdId}
            className={`px-2 py-0.5 rounded text-xs border ${
              sgbdId === currentDatabase ? 'font-medium' : 'opacity-60'
            }`}
            title={DATABASE_EXAMPLES[sgbdId].connectionString}
          >
            {DATABASE_EXAMPLES[sgbdId].label}
          </span>
        ))}
      </div>

      <div className="mb-3">
        <div className="text-xs font-medium mb-1">String de conexão (sem credenciais)</div>
        <pre className="p-2 rounded text-xs overflow-x-auto" style={{ background: 'rgba(0,0,0,0.15)' }}>
          {example.connectionString}
        </pre>
      </div>

      <div className="mb-3">
        <div className="text-xs font-medium mb-1">
          Placeholder deste SGBD: <code>{example.placeholder || '-'}</code>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium mb-1">Script completo (bloco tests)</div>
        <pre className="p-2 rounded text-xs overflow-x-auto" style={{ background: 'rgba(0,0,0,0.15)' }}>
          {buildScriptExample(currentDatabase)}
        </pre>
      </div>

      <div className="mt-3 text-xs opacity-70">
        <p className="mb-1">
          A API é <code>bru.db.*</code> — <code>connect</code>, <code>query</code>, <code>execute</code>,{' '}
          <code>disconnect</code> e <code>transaction</code>. Não existe <code>db</code> global nem{' '}
          <code>dbQuery()</code>/<code>dbExecute()</code>.
        </p>
        <p>
          O retorno de <code>bru.db.query()</code> é um objeto quando há um único registro, uma lista quando há
          vários, e <code>null</code> quando não há nenhum. Chaves com valor nulo são omitidas.
        </p>
      </div>
    </div>
  );
};

export default ExamplesPanel;
