import React, { useEffect, useState } from 'react';
import Button from 'ui/Button';
import { gitApi } from './api';
import DiffView from './DiffView';

const STATUS_LETTER = { added: 'A', modified: 'M', deleted: 'D', renamed: 'R', changed: '?' };

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleString('pt-BR');
};

/**
 * Aba Histórico: commits da branch, arquivos de cada commit, diff por arquivo e
 * histórico de um arquivo específico. Dados vêm do main (ipc/git-ops.js).
 */
const HistoryView = ({ collectionPath }) => {
  const [commits, setCommits] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [diff, setDiff] = useState('');

  const [fileQuery, setFileQuery] = useState('');
  const [fileCommits, setFileCommits] = useState(null);
  const [fileFilter, setFileFilter] = useState(null);

  const guard = async (fn) => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err?.message || String(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (size) => {
    const graph = await guard(() => gitApi.history(collectionPath, size));
    if (graph) {
      setCommits(graph.commits || []);
      setHasMore(Boolean(graph.hasMore));
    }
  };

  useEffect(() => {
    loadHistory(limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPath]);

  const selectCommit = async (commit) => {
    setSelected(commit);
    setSelectedFile(null);
    setDiff('');
    const list = await guard(() => gitApi.commitFiles(collectionPath, commit.hash));
    setFiles(list || []);
  };

  const selectFile = async (file) => {
    setSelectedFile(file.path);
    const text = await guard(() => gitApi.commitDiff(collectionPath, selected.hash, file.path));
    setDiff(text || '');
  };

  const searchFile = async () => {
    const path = fileQuery.trim();
    if (!path) return;
    const list = await guard(() => gitApi.fileHistory(collectionPath, path));
    setFileCommits(list || []);
    setFileFilter(path);
  };

  const clearFileSearch = () => {
    setFileQuery('');
    setFileCommits(null);
    setFileFilter(null);
  };

  const showCommit = (commit) => {
    selectCommit(commit);
  };

  const listCommits = fileCommits || commits;

  return (
    <div className="gp-history">
      <div className="gp-row">
        <input
          aria-label="Caminho do arquivo para ver o histórico"
          placeholder="Histórico de um arquivo (ex.: login.bru)"
          value={fileQuery}
          onChange={(e) => setFileQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchFile()}
        />
        <Button size="sm" onClick={searchFile} disabled={loading || !fileQuery.trim()}>
          Ver histórico
        </Button>
        {fileFilter && (
          <Button size="sm" variant="outline" onClick={clearFileSearch}>
            Limpar filtro
          </Button>
        )}
      </div>

      {error && <div className="gp-error">{error}</div>}
      {loading && <div className="gp-muted">Carregando…</div>}

      <div className="gp-history-grid">
        <div className="gp-history-list">
          {fileFilter && <div className="gp-muted">Commits que alteraram {fileFilter}</div>}
          {listCommits.length === 0 && !loading && <div className="gp-muted">Nenhum commit.</div>}
          <ul className="gp-list">
            {listCommits.map((c) => (
              <li
                key={c.hash}
                className={selected?.hash === c.hash ? 'gp-commit gp-commit-active' : 'gp-commit'}
                onClick={() => showCommit(c)}
                data-testid={`commit-${c.hash.slice(0, 7)}`}
              >
                <span>
                  <code>{c.hash.slice(0, 7)}</code> {c.message}
                  {c.parents && c.parents.length > 1 && <span className="gp-muted"> (merge)</span>}
                  <div className="gp-muted">
                    {c.author_name} · {formatDate(c.date)}
                  </div>
                </span>
              </li>
            ))}
          </ul>
          {!fileFilter && hasMore && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const next = limit + 50;
                setLimit(next);
                loadHistory(next);
              }}
              disabled={loading}
            >
              Carregar mais
            </Button>
          )}
        </div>

        <div className="gp-history-detail">
          {!selected && <div className="gp-muted">Escolha um commit para ver os arquivos alterados.</div>}
          {selected && (
            <>
              <div className="gp-muted">
                <code>{selected.hash}</code>
              </div>
              <ul className="gp-list">
                {files.map((f) => (
                  <li
                    key={f.path}
                    className={selectedFile === f.path ? 'gp-commit gp-commit-active' : 'gp-commit'}
                    onClick={() => selectFile(f)}
                    data-testid={`commit-file-${f.path}`}
                  >
                    <span>
                      <strong>{STATUS_LETTER[f.status] || '?'}</strong> {f.path}
                    </span>
                  </li>
                ))}
              </ul>
              {selectedFile && <DiffView diff={diff} emptyText="Sem alterações de conteúdo neste arquivo." />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
