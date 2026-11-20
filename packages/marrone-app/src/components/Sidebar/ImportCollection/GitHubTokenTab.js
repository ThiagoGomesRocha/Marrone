import React, { useState } from 'react';
import Button from 'ui/Button';
import { IconSearch, IconLock } from '@tabler/icons';

/**
 * Aba GitHub (token de acesso pessoal). O token fica só na memória desta tela:
 * não é salvo em preferências nem aparece em logs. Com ele, lista os repositórios
 * que a conta acessa (próprios, de colaboração e de organizações).
 */
const GitHubTokenTab = ({ handleSubmit, setErrorMessage }) => {
  const [token, setToken] = useState('');
  const [login, setLogin] = useState(null);
  const [repos, setRepos] = useState([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    setErrorMessage('');
    try {
      const result = await window.ipcRenderer.invoke('renderer:github-list-repos', token);
      setLogin(result.login);
      setRepos(result.repos || []);
    } catch (err) {
      setLogin(null);
      setRepos([]);
      setErrorMessage(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const pick = (repo) => {
    handleSubmit({ rawData: null, type: 'git-repository', repositoryUrl: repo.cloneUrl, authToken: token.trim() });
  };

  const q = query.trim().toLowerCase();
  const visible = q ? repos.filter((r) => r.fullName.toLowerCase().includes(q)) : repos;

  return (
    <div className="flex flex-col gap-3" data-testid="github-token-tab">
      {!login && (
        <>
          <p className="text-xs opacity-70">
            Use um token de acesso pessoal do GitHub (escopo <code>repo</code> para repositórios privados). Ele não
            é salvo.
          </p>
          <div className="flex gap-2 items-center">
            <input
              type="password"
              aria-label="Token de acesso do GitHub"
              className="flex-grow p-1 rounded border text-sm"
              placeholder="ghp_..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && token.trim() && connect()}
            />
            <Button onClick={connect} disabled={busy || !token.trim()} loading={busy}>
              Conectar
            </Button>
          </div>
        </>
      )}

      {login && (
        <>
          <div className="flex justify-between items-center text-sm">
            <span>
              Conectado como <strong>{login}</strong>
            </span>
            <button
              type="button"
              className="text-xs underline opacity-80"
              onClick={() => {
                setLogin(null);
                setRepos([]);
                setToken('');
              }}
            >
              Trocar token
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <IconSearch size={16} strokeWidth={1.5} className="opacity-70" />
            <input
              aria-label="Filtrar repositórios"
              className="flex-grow p-1 rounded border text-sm"
              placeholder="Filtrar por nome (ex.: org/api)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto" data-testid="github-repo-list">
            {visible.map((repo) => (
              <li key={repo.fullName} className="flex justify-between items-center p-2 rounded border">
                <span className="text-sm flex items-center gap-2">
                  {repo.private && <IconLock size={14} strokeWidth={1.5} />}
                  {repo.fullName}
                </span>
                <Button size="sm" variant="outline" onClick={() => pick(repo)}>
                  Importar
                </Button>
              </li>
            ))}
            {visible.length === 0 && <li className="text-xs opacity-70">Nenhum repositório encontrado.</li>}
          </ul>
        </>
      )}
    </div>
  );
};

export default GitHubTokenTab;
