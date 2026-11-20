import React, { useEffect, useState } from 'react';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'components/Tabs';
import { gitApi } from './api';
import StyledWrapper from './StyledWrapper';
import HistoryView from './HistoryView';
import DiffView from './DiffView';

const fileList = (files) => (files || []).map((f) => f.path);

/**
 * Painel Git da coleção (estilo da versão paga): alterações, commit, branches, remotos,
 * push/pull/fetch, stash, resolução de conflitos e publicação.
 * Toda operação passa pelo main (ipc/git-ops.js), que resolve o repositório a partir da coleção.
 */
const GitPanel = ({ collection, onClose, embedded = false }) => {
  const collectionPath = collection.pathname;

  const [status, setStatus] = useState(null);
  const [tab, setTab] = useState('changes');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [selected, setSelected] = useState([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [remoteName, setRemoteName] = useState('origin');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [stashMessage, setStashMessage] = useState('');
  const [mergeMessage, setMergeMessage] = useState('');
  const [publishUrl, setPublishUrl] = useState('');
  const [stashView, setStashView] = useState(null);

  // Executa uma operação: mostra o erro do main ou a confirmação, e atualiza o status.
  const run = async (label, fn) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = await fn();
      if (next) {
        setStatus(next);
      }
      if (label) {
        setNotice(label);
      }
      return next;
    } catch (err) {
      setError(err?.message || String(err));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const refresh = () => run(null, () => gitApi.status(collectionPath));

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPath]);

  const isRepo = Boolean(status?.isRepo);
  const hasConflicts = Boolean(status?.conflicted?.length) || Boolean(status?.mergeInProgress);
  const defaultRemote = status?.remotes?.[0]?.name || 'origin';

  const toggleSelected = (path) =>
    setSelected((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));

  const stageSelected = async () => {
    await run('Arquivos adicionados ao stage', () => gitApi.stage(collectionPath, selected));
    setSelected([]);
  };

  const discardFiles = async (files) => {
    const ok = window.confirm(`Descartar as alterações de ${files.length} arquivo(s)? Não dá para desfazer.`);
    if (!ok) return;
    await run('Alterações descartadas', () => gitApi.discard(collectionPath, files));
    setSelected([]);
  };

  const commit = async () => {
    const result = await run('Commit criado', () => gitApi.commit(collectionPath, commitMessage));
    if (result) setCommitMessage('');
  };

  const checkout = (name, create = false) =>
    run(`Branch atual: ${name}`, () => gitApi.checkout(collectionPath, name, create));

  const createBranch = async () => {
    const name = newBranch.trim();
    const result = await run(`Branch criada e ativa: ${name}`, () => gitApi.checkout(collectionPath, name, true));
    if (result) setNewBranch('');
  };

  const addRemote = async () => {
    const result = await run('Remote adicionado', () =>
      gitApi.addRemote(collectionPath, remoteName.trim(), remoteUrl.trim())
    );
    if (result) setRemoteUrl('');
  };

  const removeRemote = async (name) => {
    const ok = window.confirm(`Remover o remote "${name}"? A URL será perdida.`);
    if (!ok) return;
    await run('Remote removido', () => gitApi.removeRemote(collectionPath, name));
  };

  const stashCreate = async () => {
    const result = await run('Stash criado', () => gitApi.stashCreate(collectionPath, stashMessage));
    if (result) setStashMessage('');
  };

  const stashDrop = async (index) => {
    const ok = window.confirm('Apagar este stash? Não dá para desfazer.');
    if (!ok) return;
    await run('Stash apagado', () => gitApi.stashDrop(collectionPath, index));
  };

  const viewStash = async (index) => {
    setError(null);
    try {
      const list = await gitApi.stashFiles(collectionPath, index);
      setStashView({ index, files: list || [], file: null, diff: '' });
    } catch (err) {
      setError(err?.message || String(err));
    }
  };

  const showStashFile = async (file) => {
    try {
      const diff = await gitApi.stashDiff(collectionPath, stashView.index, file.path, file.untracked || false);
      setStashView((prev) => ({ ...prev, file: file.path, diff: diff || '' }));
    } catch (err) {
      setError(err?.message || String(err));
    }
  };

  const completeMerge = async () => {
    const result = await run('Merge concluído', () => gitApi.completeMerge(collectionPath, mergeMessage));
    if (result) setMergeMessage('');
  };

  const abortMerge = async () => {
    const ok = window.confirm('Abortar o merge? As alterações de conflito voltam ao estado anterior.');
    if (!ok) return;
    await run('Merge abortado', () => gitApi.abortMerge(collectionPath));
  };

  const publish = () =>
    run('Coleção publicada no remote', () => gitApi.publish(collectionPath, publishUrl.trim(), defaultRemote));

  const init = () => run('Repositório Git inicializado na branch main', () => gitApi.init(collectionPath));

  const remoteAction = (label, fn) => {
    if (!defaultRemote || !status?.remotes?.length) {
      setError('Adicione um remote antes de sincronizar (aba Remotos).');
      return undefined;
    }
    return run(label, fn);
  };

  const fetchRemote = () => remoteAction('Remote atualizado', () => gitApi.fetch(collectionPath, defaultRemote));
  const pullBranch = () =>
    remoteAction('Pull concluído', () => gitApi.pull(collectionPath, defaultRemote, status.branch, '--ff-only'));
  const pushBranch = () =>
    remoteAction('Push concluído', () => gitApi.push(collectionPath, defaultRemote, status.branch));

  const unstaged = fileList(status?.unstaged);
  const staged = fileList(status?.staged);

  const content = (
    <StyledWrapper>
      {status === null && <div className="gp-muted">Carregando status do Git…</div>}

      {status && !isRepo && (
        <div className="gp-section">
          <p className="gp-muted">Esta coleção ainda não está em um repositório Git.</p>
          <div className="gp-row">
            <Button size="sm" onClick={init} disabled={busy}>
              Inicializar Git
            </Button>
          </div>
          <h4>Compartilhar com Git</h4>
          <p className="gp-muted">
            Cria o repositório (se preciso), adiciona o remote, faz o commit e envia a branch.
          </p>
          <div className="gp-row">
            <input
              aria-label="URL do repositório remoto"
              placeholder="https://github.com/usuario/repositorio.git"
              value={publishUrl}
              onChange={(e) => setPublishUrl(e.target.value)}
            />
            <Button size="sm" onClick={publish} disabled={busy || !publishUrl.trim()}>
              Compartilhar
            </Button>
          </div>
        </div>
      )}

      {status && isRepo && (
        <>
          <div className="gp-header">
            <div>
              <strong>Branch:</strong> {status.branch || '(sem branch)'}
              {status.tracking && <span className="gp-muted"> → {status.tracking}</span>}
              {(status.ahead > 0 || status.behind > 0) && (
                <span className="gp-muted">
                  {' '}
                  (↑{status.ahead} ↓{status.behind})
                </span>
              )}
              {!status.hasCommits && <span className="gp-muted"> · sem commits ainda</span>}
            </div>
            <div className="gp-row">
              <Button size="sm" variant="outline" onClick={refresh} disabled={busy}>
                Atualizar
              </Button>
              <Button size="sm" variant="outline" onClick={fetchRemote} disabled={busy}>
                Buscar
              </Button>
              <Button size="sm" variant="outline" onClick={pullBranch} disabled={busy}>
                Pull
              </Button>
              <Button size="sm" onClick={pushBranch} disabled={busy || !status.hasCommits}>
                Push
              </Button>
            </div>
          </div>

          {error && <div className="gp-error">{error}</div>}
          {notice && !error && <div className="gp-notice">{notice}</div>}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="changes">Alterações</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
              <TabsTrigger value="branches">Branches</TabsTrigger>
              <TabsTrigger value="remotes">Remotos</TabsTrigger>
              <TabsTrigger value="stash">Stash</TabsTrigger>
              {hasConflicts && <TabsTrigger value="conflicts">Conflitos</TabsTrigger>}
            </TabsList>

            <TabsContent value="changes">
              <div className="gp-section">
                <h4>Não preparadas ({unstaged.length})</h4>
                <ul className="gp-list">
                  {unstaged.map((p) => (
                    <li key={p}>
                      <label>
                        <input type="checkbox" checked={selected.includes(p)} onChange={() => toggleSelected(p)} />{' '}
                        {p}
                      </label>
                      <Button size="xs" variant="ghost" onClick={() => discardFiles([p])} disabled={busy}>
                        Descartar
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="gp-row">
                  <Button size="sm" onClick={stageSelected} disabled={busy || selected.length === 0}>
                    Adicionar ao stage ({selected.length})
                  </Button>
                </div>

                <h4>Preparadas ({staged.length})</h4>
                <ul className="gp-list">
                  {staged.map((p) => (
                    <li key={p}>
                      <span>{p}</span>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => run('Removido do stage', () => gitApi.unstage(collectionPath, [p]))}
                        disabled={busy}
                      >
                        Tirar do stage
                      </Button>
                    </li>
                  ))}
                </ul>

                <textarea
                  aria-label="Mensagem do commit"
                  placeholder="Mensagem do commit"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  rows={3}
                />
                <div className="gp-row">
                  <Button
                    size="sm"
                    onClick={commit}
                    disabled={busy || staged.length === 0 || !commitMessage.trim()}
                  >
                    Commit
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <HistoryView collectionPath={collectionPath} />
            </TabsContent>

            <TabsContent value="branches">
              <div className="gp-section">
                <ul className="gp-list">
                  {(status.branches || []).map((name) => (
                    <li key={name}>
                      <span>
                        {name === status.branch ? <strong>● {name}</strong> : name}
                      </span>
                      {name !== status.branch && (
                        <Button size="xs" variant="ghost" onClick={() => checkout(name)} disabled={busy}>
                          Trocar
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                <h4>Nova branch</h4>
                <div className="gp-row">
                  <input
                    aria-label="Nome da nova branch"
                    placeholder="feature/minha-mudanca"
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                  />
                  <Button size="sm" onClick={createBranch} disabled={busy || !newBranch.trim()}>
                    Criar e trocar
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="remotes">
              <div className="gp-section">
                <ul className="gp-list">
                  {status.remotes.map((r) => (
                    <li key={r.name}>
                      <span>
                        <strong>{r.name}</strong> <span className="gp-muted">{r.url}</span>
                      </span>
                      <Button size="xs" variant="ghost" onClick={() => removeRemote(r.name)} disabled={busy}>
                        Remover
                      </Button>
                    </li>
                  ))}
                  {status.remotes.length === 0 && <li className="gp-muted">Nenhum remote configurado.</li>}
                </ul>
                <h4>Adicionar remote</h4>
                <div className="gp-row">
                  <input
                    aria-label="Nome do remote"
                    value={remoteName}
                    onChange={(e) => setRemoteName(e.target.value)}
                    style={{ maxWidth: '8rem' }}
                  />
                  <input
                    aria-label="URL do remote"
                    placeholder="https://… ou caminho local"
                    value={remoteUrl}
                    onChange={(e) => setRemoteUrl(e.target.value)}
                  />
                  <Button size="sm" onClick={addRemote} disabled={busy || !remoteName.trim() || !remoteUrl.trim()}>
                    Adicionar
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stash">
              <div className="gp-section">
                <ul className="gp-list">
                  {(status.stashes || []).map((s) => (
                    <li key={s.index}>
                      <span>
                        stash@{'{'}
                        {s.index}
                        {'}'} — {s.message}
                      </span>
                      <span className="gp-row">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => run('Stash aplicado', () => gitApi.stashApply(collectionPath, s.index))}
                          disabled={busy}
                        >
                          Aplicar
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => viewStash(s.index)} disabled={busy}>
                          Ver
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => stashDrop(s.index)} disabled={busy}>
                          Apagar
                        </Button>
                      </span>
                    </li>
                  ))}
                  {(status.stashes || []).length === 0 && <li className="gp-muted">Nenhum stash.</li>}
                </ul>
                {stashView && (
                  <div className="gp-section">
                    <h4>Stash {stashView.index}: alterações guardadas</h4>
                    <ul className="gp-list">
                      {stashView.files.map((f) => (
                        <li key={f.path}>
                          <span>{f.path}</span>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => showStashFile(f)}
                            disabled={busy}
                          >
                            Ver diff
                          </Button>
                        </li>
                      ))}
                    </ul>
                    {stashView.file && <DiffView diff={stashView.diff} emptyText="Sem alterações de conteúdo." />}
                  </div>
                )}
                <div className="gp-row">
                  <input
                    aria-label="Mensagem do stash"
                    placeholder="Guardar alterações como…"
                    value={stashMessage}
                    onChange={(e) => setStashMessage(e.target.value)}
                  />
                  <Button size="sm" onClick={stashCreate} disabled={busy || !stashMessage.trim()}>
                    Guardar
                  </Button>
                </div>
              </div>
            </TabsContent>

            {hasConflicts && (
              <TabsContent value="conflicts">
                <div className="gp-section">
                  {status.conflicted.length > 0 ? (
                    <ul className="gp-list">
                      {status.conflicted.map((f) => (
                        <li key={f.path}>
                          <span>{f.path}</span>
                          <span className="gp-row">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() =>
                                run('Conflito resolvido com a sua versão', () =>
                                  gitApi.resolveConflict(collectionPath, f.path, 'ours')
                                )}
                              disabled={busy}
                            >
                              Minha versão
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() =>
                                run('Conflito resolvido com a versão recebida', () =>
                                  gitApi.resolveConflict(collectionPath, f.path, 'theirs')
                                )}
                              disabled={busy}
                            >
                              Versão recebida
                            </Button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="gp-muted">Nenhum arquivo em conflito.</p>
                  )}

                  {status.mergeInProgress && (
                    <>
                      <textarea
                        aria-label="Mensagem do merge"
                        placeholder="Mensagem do commit de merge"
                        value={mergeMessage}
                        onChange={(e) => setMergeMessage(e.target.value)}
                        rows={2}
                      />
                      <div className="gp-row">
                        <Button
                          size="sm"
                          onClick={completeMerge}
                          disabled={busy || status.conflicted.length > 0 || !mergeMessage.trim()}
                        >
                          Concluir merge
                        </Button>
                        <Button size="sm" variant="outline" onClick={abortMerge} disabled={busy}>
                          Abortar merge
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </StyledWrapper>
  );

  // Dentro das configurações da coleção (aba Git) o conteúdo fica na própria página, sem modal.
  if (embedded) return content;

  return (
    <Modal size="lg" title="Git" handleCancel={onClose} hideFooter dataTestId="git-panel">
      {content}
    </Modal>
  );
};

export default GitPanel;
