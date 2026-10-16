import React, { useState } from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { IconFileImport } from '@tabler/icons';
import { StyledWrapper } from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const UploadStep = ({ modalTitle, modalTestId, importTestId, onClose, handleImportEnvironment }) => {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.json';
    input.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleImportEnvironment(e.target.files);
      }
    };
    input.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImportEnvironment(files);
    }
  };

  return (
    <Portal>
      <Modal
        size="md"
        title={modalTitle}
        hideFooter={true}
        handleCancel={onClose}
        dataTestId={modalTestId}
        disableCloseOnOutsideClick
      >
        <StyledWrapper>
          <div className="upload-container">
            <div
              className={`upload-dropzone ${isDragOver ? 'is-drag-over' : ''}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleFileSelect();
                }
              }}
              onClick={handleFileSelect}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              data-testid={importTestId}
            >
              <IconFileImport size={64} className="upload-dropzone-icon" />
              <span className="upload-dropzone-title">
                {isDragOver ? t('MODALS.IMPORT_ENVIRONMENT.DROP_TITLE') : t('MODALS.IMPORT_ENVIRONMENT.IMPORT_TITLE')}
              </span>
              <span className="upload-dropzone-subtitle">
                {t('MODALS.IMPORT_ENVIRONMENT.SUBTITLE')}
              </span>
            </div>
          </div>
        </StyledWrapper>
      </Modal>
    </Portal>
  );
};

export default UploadStep;
