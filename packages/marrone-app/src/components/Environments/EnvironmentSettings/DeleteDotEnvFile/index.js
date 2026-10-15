import React from 'react';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal/index';
import StyledWrapper from './StyledWrapper';
import i18n from '../../../../i18n';

const DeleteDotEnvFile = ({ onClose, onConfirm, filename = '.env' }) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="sm"
          title={`Delete ${filename} File`}
          confirmText={i18n.t('UI.DELETE')}
          handleConfirm={handleConfirm}
          handleCancel={onClose}
          confirmButtonColor="danger"
        >
          Are you sure you want to delete <span className="font-medium">{filename}</span> file?
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default DeleteDotEnvFile;
