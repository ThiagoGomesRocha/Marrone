import React, { useState } from 'react';
import { isGitRepositoryUrl } from 'utils/git';

// Qualquer endereço remoto que o git entende: https/ssh/git, ou user@host:caminho (formato scp).
// Não depende de provedor nem do formato dono/repo, então vale para GitLab, Bitbucket, self-hosted etc.
const isAnyGitRemoteUrl = (url) => {
  const value = typeof url === 'string' ? url.trim() : '';
  if (!value) return false;
  if (isGitRepositoryUrl(value)) return true;
  return /^(https?|ssh|git):\/\/[^\s/]+\/\S+$/i.test(value) || /^[\w.-]+@[\w.-]+:\S+$/.test(value);
};
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import { useTranslation } from 'react-i18next';
const GitHubTab = ({
  handleSubmit,
  setErrorMessage
}) => {
  const { t } = useTranslation();
  const [urlInput, setUrlInput] = useState('');

  const handleGitRepositoryImport = (url) => {
    if (!isAnyGitRemoteUrl(url)) {
      setErrorMessage('Please enter a valid git repository URL');
      return;
    }
    handleSubmit({ repositoryUrl: url, type: 'git-repository' });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (urlInput.trim()) {
      handleGitRepositoryImport(urlInput.trim());
    }
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <div className="flex gap-2">
        <input
          id="gitUrlInput"
          data-testid="git-url-input"
          type="text"
          value={urlInput}
          autoFocus
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder={t('MODALS.IMPORT_COLLECTION.GIT_URL_PLACEHOLDER')}
          className="flex-1 px-3 py-1 textbox"
        />
        <Button
          type="submit"
          id="clone-git-button"
          disabled={!urlInput.trim()}
          variant="filled"
          color="primary"
          style={{ height: '100%' }}
        >
          {t('MODALS.COMMON.CLONE')}
        </Button>
      </div>
    </form>
  );
};

export default GitHubTab;
