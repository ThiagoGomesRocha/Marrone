import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import Button from 'ui/Button';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';

/**
 * Aba Pasta local: escolhe uma pasta que já é repositório Git e abre as coleções
 * que estiverem dentro dela. Não clona nada: usa a cópia que já está no disco.
 */
const LocalGitFolderTab = ({ handleSubmit, setErrorMessage }) => {
  const dispatch = useDispatch();
  const [folder, setFolder] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  const chooseFolder = async () => {
    setErrorMessage('');
    const dirPath = await dispatch(browseDirectory()).catch(() => null);
    if (typeof dirPath !== 'string') return;

    setBusy(true);
    try {
      const result = await window.ipcRenderer.invoke('renderer:git-inspect-folder', dirPath);
      setFolder(dirPath);
      setInfo(result);
      if (!result.isRepo) {
        setErrorMessage('Essa pasta não é um repositório Git. Escolha outra pasta ou use a aba Repositório Git.');
      }
    } catch (err) {
      setInfo(null);
      setErrorMessage(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const open = () => {
    handleSubmit({ rawData: null, type: 'local-git-folder', folderPath: folder });
  };

  return (
    <div className="flex flex-col gap-3" data-testid="local-git-folder-tab">
      <p className="text-xs opacity-70">
        Escolha uma pasta de repositório Git que já está no seu computador. As coleções encontradas nela serão
        abertas, sem clonar.
      </p>
      <div className="flex gap-2 items-center">
        <Button variant="outline" onClick={chooseFolder} disabled={busy}>
          Escolher pasta…
        </Button>
        {folder && <span className="text-xs break-all">{folder}</span>}
      </div>
      {info?.isRepo && (
        <div className="text-sm">
          Repositório encontrado
          {info.branch ? (
            <>
              {' '}
              na branch <strong>{info.branch}</strong>
            </>
          ) : (
            ' (sem branch atual)'
          )}
          {info.root && info.root !== folder && (
            <div className="text-xs opacity-70">Raiz do repositório: {info.root}</div>
          )}
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={open} disabled={!info?.isRepo || busy}>
          Procurar coleções
        </Button>
      </div>
    </div>
  );
};

export default LocalGitFolderTab;
