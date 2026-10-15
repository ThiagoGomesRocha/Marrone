import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { IconAlertTriangle } from '@tabler/icons';
import { removeCollectionFromWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { findCollectionByUid } from 'utils/collections/index';
import StyledWrapper from './StyledWrapper';
import i18n from '../../../../../i18n';

const DeleteCollection = ({ onClose, collectionUid, workspaceUid }) => {
  const dispatch = useDispatch();
  const [confirmText, setConfirmText] = useState('');
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));
  const workspace = useSelector((state) => state.workspaces.workspaces.find((w) => w.uid === workspaceUid));

  const isConfirmed = confirmText.toLowerCase() === 'delete';

  const onConfirm = async () => {
    if (!collection || !workspace) {
      toast.error(i18n.t('TOASTS.COLLECTION_OR_WORKSPACE_NOT_FOUND'));
      onClose();
      return;
    }

    try {
      await dispatch(removeCollectionFromWorkspaceAction(workspace.uid, collection.pathname, { deleteFiles: true }));
      toast.success(i18n.t('TOASTS.DELETED_COLLECTION', { name: collection.name }));
      onClose();
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error(error.message || i18n.t('TOASTS.ERROR_DELETING_COLLECTION'));
    }
  };

  if (!collection) {
    return null;
  }

  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title={i18n.t('UI.DELETE_COLLECTION')}
        confirmText={i18n.t('UI.DELETE')}
        cancelText="Cancel"
        confirmButtonColor="danger"
        confirmDisabled={!isConfirmed}
        handleConfirm={onConfirm}
        handleCancel={onClose}
      >
        <p className="modal-description">
          Are you sure you want to permanently delete <strong>"{collection.name}"</strong>?
        </p>
        <div className="collection-info-card">
          <div className="collection-name">{collection.name}</div>
          <div className="collection-path">{collection.pathname}</div>
        </div>
        <p className="warning-text">
          This action cannot be undone. The collection files will be permanently deleted from disk.
        </p>
        <div className="delete-confirmation">
          <label htmlFor="delete-confirm-input">
            Type <span className="delete-keyword">delete</span> to confirm
          </label>
          <input
            id="delete-confirm-input"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="delete"
            autoComplete="off"
            autoFocus
          />
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default DeleteCollection;
