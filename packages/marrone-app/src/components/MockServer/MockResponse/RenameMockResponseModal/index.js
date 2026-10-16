import { useEffect, useRef, useState } from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import {
  getMockResponseNameError,
  getMockResponseNameInputError,
  isMockResponseNameTaken
} from 'utils/mock-server/mock-responses';
import { useTranslation } from 'react-i18next';

const RenameMockResponseModal = ({
  response,
  existingResponses = [],
  onClose,
  onConfirm,
  isSaving = false
}) => {
  const { t } = useTranslation();
  const inputRef = useRef();
  const [name, setName] = useState(response?.name || '');
  const [submitError, setSubmitError] = useState('');

  const trimmedName = name.trim();
  const inputNameError = getMockResponseNameInputError(name)
    || (trimmedName && isMockResponseNameTaken(existingResponses, trimmedName, response?.uid)
      ? 'A mock response with this name already exists'
      : null);
  const nameError = inputNameError || submitError;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleConfirm = () => {
    const validationError = getMockResponseNameError(trimmedName);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    if (isMockResponseNameTaken(existingResponses, trimmedName, response?.uid)) {
      setSubmitError('A mock response with this name already exists');
      return;
    }

    onConfirm(trimmedName);
  };

  return (
    <Portal>
      <Modal
        size="sm"
        title={t('MODALS.RENAME_MOCK_RESPONSE.TITLE')}
        confirmText={isSaving ? t('MODALS.RENAME_MOCK_RESPONSE.RENAMING') : t('MODALS.COMMON.RENAME')}
        cancelText={t('MODALS.COMMON.CANCEL')}
        handleConfirm={handleConfirm}
        handleCancel={onClose}
        confirmDisabled={isSaving || !trimmedName || Boolean(inputNameError)}
        dataTestId="rename-mock-response-modal"
      >
        <div>
          <label htmlFor="mock-response-rename-name" className="block font-medium">
            {t('MODALS.COMMON.NAME')}
          </label>
          <input
            id="mock-response-rename-name"
            ref={inputRef}
            type="text"
            className="textbox mt-2 w-full"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSubmitError('');
            }}
            data-testid="mock-response-rename-name-input"
          />
          {nameError ? (
            <div className="text-red-500 mt-1">{nameError}</div>
          ) : null}
        </div>
      </Modal>
    </Portal>
  );
};

export default RenameMockResponseModal;
