import React from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { useState } from 'react';
import StyledWrapper from './StyledWrapper';
import i18n from '../../../i18n';

const IpcErrorModal = ({ error }) => {
  const [showModal, setShowModal] = useState(true);
  return (
    <>
      {showModal ? (
        <StyledWrapper>
          <Portal>
            <Modal
              size="sm"
              title={i18n.t('UI.ERROR')}
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
          </Portal>
        </StyledWrapper>
      ) : null}
    </>
  );
};

export default IpcErrorModal;
