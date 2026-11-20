import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import { openMultipleCollections, scanForMarroneFiles } from 'providers/ReduxStore/slices/collections/actions';

/**
 * Procura coleções dentro de uma pasta de repositório que já está no disco e deixa escolher
 * quais abrir. Mesmo passo de "escanear e abrir" que o clone usa, sem o clone.
 */
const OpenLocalGitFolder = ({ folderPath, onClose, onFinish }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    dispatch(scanForMarroneFiles(folderPath))
      .then((result) => {
        if (cancelled) return;
        setItems(result?.items || []);
        setSkipped(result?.skippedItems || []);
      })
      .catch((err) => !cancelled && setError(err?.message || String(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderPath]);

  const toggle = (pathname) =>
    setSelected((prev) => (prev.includes(pathname) ? prev.filter((p) => p !== pathname) : [...prev, pathname]));

  const open = () => {
    dispatch(openMultipleCollections(selected));
    onClose();
    onFinish?.();
  };

  return (
    <Modal size="md" title="Abrir coleções da pasta Git" handleCancel={onClose} hideFooter dataTestId="open-local-git-folder">
      <div className="flex flex-col gap-3 text-sm">
        <div className="text-xs break-all opacity-70">{folderPath}</div>

        {loading && <div>Procurando coleções…</div>}
        {error && <div role="alert" className="text-xs">{error}</div>}

        {!loading && !error && items.length === 0 && (
          <div className="opacity-70">Nenhuma coleção encontrada nesta pasta.</div>
        )}

        <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {items.map((pathname) => (
            <li key={pathname}>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={selected.includes(pathname)} onChange={() => toggle(pathname)} />
                <span className="break-all">{pathname}</span>
              </label>
            </li>
          ))}
        </ul>

        {skipped.length > 0 && (
          <div className="text-xs opacity-60">{skipped.length} pasta(s) ignorada(s) por não serem coleções válidas.</div>
        )}

        <div className="flex justify-end">
          <Button onClick={open} disabled={selected.length === 0}>
            Abrir {selected.length > 0 ? selected.length : ''} coleção(ões)
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default OpenLocalGitFolder;
