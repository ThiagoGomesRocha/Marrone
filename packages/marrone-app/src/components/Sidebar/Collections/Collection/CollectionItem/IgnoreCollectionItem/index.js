import React from 'react';
import Modal from 'components/Modal';
import { useSelector, useDispatch } from 'react-redux';
import { ignoreFolder, closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { recursivelyGetAllItemUids } from 'utils/collections';
import toast from 'react-hot-toast';
import i18n from '../../../../../../i18n';

const IgnoreCollectionItem = ({ onClose, item, collectionUid }) => {
  const dispatch = useDispatch();
  const collection = useSelector((state) => state.collections.collections?.find((c) => c.uid === collectionUid));
  const isYamlCollection = collection?.format === 'yml' || Boolean(collection?.brunoConfig?.opencollection);
  const configFileName = isYamlCollection ? 'opencollection.yml' : 'bruno.json';

  const onConfirm = () => {
    dispatch(ignoreFolder(item.uid, collectionUid))
      .then(() => {
        const tabUids = [...recursivelyGetAllItemUids(item.items), item.uid];
        dispatch(closeTabs({ tabUids }));
        toast.success(i18n.t('TOASTS.FOLDER_IGNORED'));
      })
      .catch((error) => {
        console.error('Error ignoring folder', error);
        toast.error(error?.message || i18n.t('TOASTS.ERROR_IGNORING_FOLDER'));
      });
    onClose();
  };

  return (
    <Modal
      size="md"
      title={i18n.t('UI.IGNORE_FOLDER')}
      confirmText={i18n.t('UI.IGNORE')}
      handleConfirm={onConfirm}
      handleCancel={onClose}
    >
      Ignoring <span className="font-medium">{item.name}</span> will hide it from this
      {' '}
      {isYamlCollection ? 'opencollection (YAML)' : 'Marrone (JSON)'}
      {' '}
      collection by adding it to the
      {' '}
      <span className="font-medium">ignore</span>
      {' '}
      list in
      {' '}
      <span className="font-medium">{configFileName}</span>
      . The folder and its files are not deleted. To restore it later, remove the entry from the
      {' '}
      <span className="font-medium">ignore</span>
      {' '}
      list in
      {' '}
      <span className="font-medium">{configFileName}</span>
      .
    </Modal>
  );
};

export default IgnoreCollectionItem;
