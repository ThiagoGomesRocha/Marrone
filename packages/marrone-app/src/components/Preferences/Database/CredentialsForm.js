import React, { useCallback, useEffect, useState } from 'react';
import { getExample, getSgbdLabel } from './constants';

/**
 * Formulário de credenciais por SGBD (RF01 / F4).
 *
 * PONTOS IMPORTANTES
 * ------------------
 * 1. O renderer não tem acesso ao `safeStorage` do Electron. Salvar credencial passa
 *    OBRIGATORIAMENTE por IPC para o main process, que cifra no cofre do sistema.
 * 2. Só usuário e senha são persistidos. A string de conexão é digitada no script; o
 *    campo abaixo existe apenas para o teste de conexão e NÃO é salvo.
 * 3. A senha nunca volta do main process — o formulário só sabe se ela existe
 *    (`hasPassword`), para poder mostrar "senha guardada".
 */
const CredentialsForm = ({ databases, currentDatabase, onDatabaseChange, onSaved }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasStoredPassword, setHasStoredPassword] = useState(false);
  // Forma de autenticação e domínio (Fase 3). Só têm efeito no SQL Server — é o único
  // driver que implementa a autenticação do Windows (NTLM).
  const [authType, setAuthType] = useState('sql');
  const [domain, setDomain] = useState('');
  const [testConnectionString, setTestConnectionString] = useState(getExample(currentDatabase).connectionString);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const isMssql = currentDatabase === 'mssql';

  // useCallback para manter as referências estáveis: sem isso o useEffect abaixo vira um loop
  // de dependências instáveis (aviso react-hooks/exhaustive-deps do ESLint do repo).
  const invoke = useCallback((channel, ...args) => window.ipcRenderer?.invoke(channel, ...args), []);

  const loadStoredCredentials = useCallback(async (sgbdId) => {
    try {
      const list = await invoke('database:credentials:list');
      const entry = (list || []).find((item) => item.sgbdId === sgbdId);

      setUsername(entry?.username || '');
      setHasStoredPassword(Boolean(entry?.hasPassword));
      // Ausente/desconhecido = 'sql': é o padrão e o comportamento das versões anteriores.
      setAuthType(entry?.authType === 'windows' ? 'windows' : 'sql');
      setDomain(entry?.domain || '');
      // A senha em claro nunca é devolvida pelo main process: por isso o campo começa vazio.
      setPassword('');
    } catch (err) {
      setStatus({ type: 'error', message: `Não foi possível ler as credenciais: ${err.message}` });
    }
  }, [invoke]);

  useEffect(() => {
    setTestConnectionString(getExample(currentDatabase).connectionString);
    setStatus(null);
    loadStoredCredentials(currentDatabase);
  }, [currentDatabase, loadStoredCredentials]);

  const handleSave = async () => {
    setBusy(true);
    setStatus(null);

    try {
      await invoke('database:credentials:set', {
        sgbdId: currentDatabase,
        username,
        // Campo vazio = MANTER a senha guardada; por isso a chave é omitida em vez de
        // mandar string vazia (que apagaria a senha — ver DatabaseCredentialsStore).
        ...(password ? { password } : {}),
        // Só o SQL Server usa estes dois; nos demais mandamos 'sql' para não gravar uma
        // configuração de autenticação que o driver não implementa.
        authType: isMssql ? authType : 'sql',
        domain: isMssql && authType === 'windows' ? domain : ''
      });
      setHasStoredPassword(Boolean(password) || hasStoredPassword);
      setPassword('');
      setStatus({ type: 'success', message: `Credenciais de ${getSgbdLabel(currentDatabase)} guardadas no cofre do sistema.` });
      onSaved?.();
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setStatus(null);

    try {
      await invoke('database:credentials:delete', { sgbdId: currentDatabase });
      setUsername('');
      setPassword('');
      setHasStoredPassword(false);
      setAuthType('sql');
      setDomain('');
      setStatus({ type: 'success', message: 'Credenciais removidas.' });
      onSaved?.();
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    setStatus(null);

    try {
      const result = await invoke('database:test-connection', {
        sgbdId: currentDatabase,
        connectionString: testConnectionString
      });

      if (result?.ok) {
        setStatus({ type: 'success', message: 'Conexão bem-sucedida.' });
      } else {
        setStatus({ type: 'error', message: result?.error?.message || 'Falha ao conectar.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="text-base font-medium mb-1">Database</h2>
      <p className="text-xs opacity-70 mb-4">
        Cadastre o usuário e a senha de cada banco. A senha fica no cofre do sistema operacional — ela nunca é gravada
        no arquivo da coleção, no git nem no relatório.
      </p>

      <div className="mb-3">
        <label className="block text-xs font-medium mb-1" htmlFor="database-sgbd">
          Banco de dados
        </label>
        <select
          id="database-sgbd"
          className="w-full p-1 rounded border text-sm"
          value={currentDatabase}
          onChange={(event) => onDatabaseChange(event.target.value)}
        >
          {databases.map((sgbdId) => (
            <option key={sgbdId} value={sgbdId}>
              {getSgbdLabel(sgbdId)}
            </option>
          ))}
        </select>
      </div>

      {/*
        Tipo de autenticação — SÓ no SQL Server. É o único driver do projeto que implementa
        a autenticação do Windows (NTLM); oferecer a opção nos outros SGBDs seria uma opção
        que não faz nada.
      */}
      {isMssql && (
        <div className="mb-3">
          <span className="block text-xs font-medium mb-1">Tipo de autenticação</span>
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="database-auth-type"
                value="sql"
                checked={authType === 'sql'}
                onChange={() => setAuthType('sql')}
              />
              SQL Server Authentication — usuário e senha do próprio banco
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="database-auth-type"
                value="windows"
                checked={authType === 'windows'}
                onChange={() => setAuthType('windows')}
              />
              Windows Authentication — conta do Windows (NTLM), com domínio
            </label>
          </div>
        </div>
      )}

      <div className="mb-3">
        <label className="block text-xs font-medium mb-1" htmlFor="database-username">
          {isMssql && authType === 'windows' ? 'Usuário (conta do Windows)' : 'Usuário'}
        </label>
        <input
          id="database-username"
          className="w-full p-1 rounded border text-sm"
          type="text"
          autoComplete="off"
          placeholder={isMssql && authType === 'windows' ? 'joao.silva' : ''}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        {isMssql && authType === 'windows' && (
          <p className="text-xs opacity-60 mt-1">
            Informe só o nome da conta — o domínio vai no campo abaixo. Também funciona escrever a
            conta já qualificada (<code>EMPRESA\joao.silva</code>) e deixar o domínio preenchido.
          </p>
        )}
      </div>

      {/*
        Campo de domínio: aparece SÓ com a autenticação do Windows selecionada.
        Em rede sem Active Directory o domínio de uma conta local é o NOME DA MÁQUINA — sem
        ele, o NTLM tenta autenticar uma conta do próprio servidor e a conexão falha mesmo
        com usuário e senha corretos (sintoma que engana).
      */}
      {isMssql && authType === 'windows' && (
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1" htmlFor="database-domain">
            Domínio
          </label>
          <input
            id="database-domain"
            className="w-full p-1 rounded border text-sm"
            type="text"
            autoComplete="off"
            placeholder="EMPRESA"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
          />
          <p className="text-xs opacity-60 mt-1">
            Em rede sem Active Directory (workgroup), o domínio de uma conta local é o{' '}
            <strong>nome da máquina</strong> — por exemplo <code>SEU-PC</code> para a conta{' '}
            <code>SEU-PC\joao.silva</code>.
          </p>
        </div>
      )}

      <div className="mb-3">
        <label className="block text-xs font-medium mb-1" htmlFor="database-password">
          Senha
        </label>
        <div className="flex gap-2">
          <input
            id="database-password"
            className="flex-grow p-1 rounded border text-sm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={hasStoredPassword ? '•••••••• (senha já guardada)' : ''}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            className="px-2 rounded border text-xs"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        <p className="text-xs opacity-60 mt-1">
          {hasStoredPassword
            ? 'Há uma senha guardada. Deixe o campo vazio para mantê-la ao salvar o usuário.'
            : 'A senha será cifrada pelo cofre do sistema (safeStorage).'}
        </p>
        {isMssql && authType === 'windows' && (
          <p className="text-xs opacity-60 mt-1">
            A senha é necessária também na autenticação do Windows: o driver do SQL Server não usa o
            token da sessão já aberta no sistema, ele negocia a conta informada aqui.
          </p>
        )}
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium mb-1" htmlFor="database-test-connection">
          String de conexão (apenas para testar — não é salva)
        </label>
        <input
          id="database-test-connection"
          className="w-full p-1 rounded border text-sm"
          type="text"
          value={testConnectionString}
          onChange={(event) => setTestConnectionString(event.target.value)}
        />
        <p className="text-xs opacity-60 mt-1">
          Sem usuário e senha. No script, essa string é o segundo argumento de{' '}
          <code>db.connect('{currentDatabase}', '...')</code>.
        </p>
      </div>

      <div className="flex gap-2 mb-3">
        <button type="button" className="px-3 py-1 rounded border text-sm" disabled={busy} onClick={handleSave}>
          Salvar
        </button>
        <button type="button" className="px-3 py-1 rounded border text-sm" disabled={busy} onClick={handleTest}>
          Testar conexão
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded border text-sm"
          disabled={busy || !hasStoredPassword}
          onClick={handleDelete}
        >
          Remover
        </button>
      </div>

      {status && (
        <div
          className="p-2 rounded text-xs mb-2"
          style={{ background: status.type === 'error' ? 'rgba(220,38,38,0.12)' : 'rgba(22,163,74,0.12)' }}
          role={status.type === 'error' ? 'alert' : 'status'}
        >
          {status.message}
        </div>
      )}

      <p className="text-xs opacity-60">
        O teste de conexão exige o driver do SGBD instalado. Se ele não estiver, a mensagem de erro dirá exatamente
        qual pacote instalar.
      </p>
    </div>
  );
};

export default CredentialsForm;
