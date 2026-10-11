import React, { useEffect, useState } from 'react';
import CredentialsForm from './CredentialsForm';
import ExamplesPanel from './ExamplesPanel';
import { FALLBACK_DATABASE_IDS } from './constants';

/**
 * Aba Settings > Database.
 *
 * O catálogo de SGBDs vem do MAIN process por IPC, porque o renderer não pode importar
 * @marrone/database (arrastaria os drivers para o bundle do browser). Se o IPC falhar,
 * caímos para a lista local de ids — a aba continua funcional.
 */
const Database = () => {
  const [databases, setDatabases] = useState(FALLBACK_DATABASE_IDS);
  const [currentDatabase, setCurrentDatabase] = useState(FALLBACK_DATABASE_IDS[0]);
  const [catalogWarning, setCatalogWarning] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      try {
        const catalog = await window.ipcRenderer?.invoke('database:catalog');

        if (cancelled || !catalog) {
          return;
        }

        // O aviso é mostrado SEMPRE que vier — mesmo sem ids. Engolir o aviso quando a
        // lista vem vazia esconderia justamente o caso em que o usuário precisa saber
        // por que a aba está com a lista local.
        if (catalog.warning) {
          setCatalogWarning(catalog.warning);
        }

        if (catalog.ids?.length) {
          setDatabases(catalog.ids);
        }
      } catch (err) {
        if (!cancelled) {
          setCatalogWarning(`Não foi possível carregar o catálogo de SGBDs: ${err.message}`);
        }
      }
    };

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      {catalogWarning && (
        <div className="p-2 rounded text-xs mb-3" style={{ background: 'rgba(217,119,6,0.12)' }}>
          {catalogWarning}
        </div>
      )}

      <CredentialsForm
        databases={databases}
        currentDatabase={currentDatabase}
        onDatabaseChange={setCurrentDatabase}
      />

      <hr className="my-5 opacity-20" />

      <ExamplesPanel currentDatabase={currentDatabase} />
    </div>
  );
};

export default Database;
