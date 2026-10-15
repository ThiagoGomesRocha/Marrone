import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import MockConfirmModal from 'components/MockServer/MockConfirmModal';
import { deleteMockServerInstance } from 'utils/mock-server/mock-server-instances';
import i18n from '../../../i18n';

const DeleteMockServerModal = ({ instance, onClose, onDeleted }) => {
  const dispatch = useDispatch();

  const handleConfirm = async () => {
    try {
      await dispatch(deleteMockServerInstance(instance.uid));
      toast.success(i18n.t('TOASTS.MOCK_SERVER_DELETED'));
      onDeleted?.();
      onClose();
    } catch {
      toast.error(i18n.t('TOASTS.FAILED_DELETE_MOCK_SERVER'));
    }
  };

  return (
    <MockConfirmModal
      title={i18n.t('UI.DELETE_MOCK_SERVER')}
      confirmText={i18n.t('UI.DELETE')}
      onConfirm={handleConfirm}
      onClose={onClose}
      confirmButtonColor="danger"
      dataTestId="delete-mock-server-modal"
    >
      Are you sure you want to delete <span className="font-medium">{instance.name}</span>?
      {instance.sourceType === 'spec' ? (
        <div className="text-xs mt-3 opacity-70">This removes the mock server configuration only. Your API spec file is not deleted.</div>
      ) : null}
    </MockConfirmModal>
  );
};

export default DeleteMockServerModal;
