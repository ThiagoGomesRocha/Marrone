import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { IconX } from '@tabler/icons';
import Button from 'ui/Button';

export const IGNORED_VERSION_KEY = 'marrone:ignored-update-version';

const Card = styled.div`
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 1000;
  width: 360px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid ${(props) => props.theme.dropdown.hoverBg};
  background: ${(props) => props.theme.dropdown.bg};
  color: ${(props) => props.theme.dropdown.color};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);

  .update-title {
    font-weight: 600;
    margin-bottom: 4px;
  }
  .update-text {
    font-size: 12px;
    opacity: 0.8;
    margin-bottom: 12px;
    word-break: break-all;
  }
  .update-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .update-close {
    position: absolute;
    top: 8px;
    right: 8px;
    background: transparent;
    border: 0;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
  }
`;

/**
 * Aviso de nova versão stable. Só consulta o GitHub (sem baixar nada). O download acontece
 * apenas quando o usuário clica em "Baixar instalador".
 */
const UpdateNotice = ({ version }) => {
  const [update, setUpdate] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [download, setDownload] = useState({ status: 'idle', path: null, error: null });

  useEffect(() => {
    let cancelled = false;
    if (!version || !window.ipcRenderer?.invoke) return undefined;
    window.ipcRenderer
      .invoke('renderer:check-app-update', version)
      .then((result) => {
        if (cancelled || !result?.updateAvailable) return;
        if (localStorage.getItem(IGNORED_VERSION_KEY) === result.version) return;
        setUpdate(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [version]);

  if (!update || dismissed) return null;

  const ignore = () => {
    localStorage.setItem(IGNORED_VERSION_KEY, update.version);
    setDismissed(true);
  };

  const downloadInstaller = async () => {
    setDownload({ status: 'loading', path: null, error: null });
    try {
      const result = await window.ipcRenderer.invoke('renderer:download-app-update', {
        url: update.installer.url,
        name: update.installer.name
      });
      setDownload({ status: 'done', path: result.path, error: null });
    } catch (err) {
      setDownload({ status: 'error', path: null, error: err?.message || String(err) });
    }
  };

  return (
    <Card role="dialog" aria-label="Nova versão disponível" data-testid="update-notice">
      <button type="button" className="update-close" aria-label="Fechar aviso" onClick={() => setDismissed(true)}>
        <IconX size={16} stroke={1.5} />
      </button>
      <div className="update-title">Nova versão {update.version} disponível</div>
      <div className="update-text">Você está usando a {update.currentVersion}.</div>

      {download.status === 'done' && (
        <div className="update-text" data-testid="update-download-done">
          Instalador salvo em: {download.path}
        </div>
      )}
      {download.status === 'error' && (
        <div className="update-text" role="alert" style={{ color: '#f87171' }}>
          {download.error}
        </div>
      )}

      <div className="update-actions">
        {update.installer && download.status !== 'done' && (
          <Button size="sm" onClick={downloadInstaller} disabled={download.status === 'loading'} loading={download.status === 'loading'}>
            Baixar instalador
          </Button>
        )}
        {download.status === 'done' && (
          <Button size="sm" onClick={() => window.ipcRenderer.invoke('renderer:show-item-in-folder', download.path)}>
            Abrir pasta
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => window.ipcRenderer.openExternal(update.htmlUrl)}>
          Ver changelog
        </Button>
        <Button size="sm" variant="outline" onClick={ignore}>
          Ignorar esta versão
        </Button>
      </div>
    </Card>
  );
};

export default UpdateNotice;
