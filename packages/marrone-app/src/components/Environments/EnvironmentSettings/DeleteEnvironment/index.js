import React from 'react';
import Portal from 'components/Portal/index';
import toast from 'react-hot-toast';
import Modal from 'components/Modal/index';
import { deleteEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import i18n from '../../../../i18n';

const DeleteEnvironment = ({ onClose, environment, collection }) => {
  const dispatch = useDispatch();
  const onConfirm = () => {
    dispatch(deleteEnvironment(environment.uid, collection.uid))
      .then(() => {
        toast.success(i18n.t('TOASTS.ENV_DELETED'));
        onClose();
      })
      .catch(() => toast.error(i18n.t('TOASTS.ERROR_DELETING_ENVIRONMENT')));
  };

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="md"
          title={i18n.t('UI.DELETE_ENVIRONMENT')}
          confirmText={i18n.t('UI.DELETE')}
          handleConfirm={onConfirm}
          handleCancel={onClose}
          confirmButtonColor="danger"
        >
          Are you sure you want to delete <span className="font-medium">{environment.name}</span>?
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default DeleteEnvironment;
