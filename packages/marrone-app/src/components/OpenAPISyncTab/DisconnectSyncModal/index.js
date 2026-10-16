import Button from 'ui/Button';
import Modal from 'components/Modal';
import i18n from '../../../i18n';

const DisconnectSyncModal = ({ onConfirm, onClose }) => {
  return (
    <Modal
      size="sm"
      title={i18n.t('UI.DISCONNECT_SYNC')}
      hideFooter={true}
      handleCancel={onClose}
    >
      <div className="disconnect-modal">
        <p className="disconnect-message">
          <>Are you sure you want to disconnect OpenAPI sync? </> <br /> <br />
          <>This will only disconnect the sync configuration. Your collection will remain intact.</>
        </p>
        <div className="disconnect-actions">
          <Button variant="ghost" color="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button color="danger" onClick={onConfirm}>
            Disconnect
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DisconnectSyncModal;
