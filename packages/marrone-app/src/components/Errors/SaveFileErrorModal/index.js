import React from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { useState } from 'react';
import StyledWrapper from './StyledWrapper';
import i18n from '../../../i18n';

const SaveFileErrorModal = ({ error }) => {
  const [showModal, setShowModal] = useState(true);
  return (
    <>
      {showModal ? (
        <Portal>
          <StyledWrapper>
            <Modal
              size="sm"
              title={i18n.t('UI.SAVE_FILE_ERROR')}
              hideFooter={true}
              hideCancel={true}
              handleCancel={() => {
                setShowModal(false);
              }}
              disableCloseOnOutsideClick={true}
              disableEscapeKey={true}
            >
              <pre className="w-full flex flex-wrap whitespace-pre-wrap">{error}</pre>
            </Modal>
          </StyledWrapper>
        </Portal>
      ) : null}
    </>
  );
};

export default SaveFileErrorModal;
