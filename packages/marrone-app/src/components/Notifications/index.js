import { IconBell } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import StyledWrapper from './StyledWrapper';
import NotificationsModal from './NotificationsModal';
import useNotifications from './hooks/useNotifications';
import i18n from '../../i18n';

const Notifications = () => {
  const notifications = useNotifications();
  const { isOpen, unreadCount, open, close } = notifications;

  return (
    <>
      <StyledWrapper onClick={open} aria-label={i18n.t('UI.CHECK_ALL_NOTIFICATIONS')}>
        <ToolHint text="Notifications" toolhintId="Notifications" offset={8}>
          <IconBell size={16} aria-hidden strokeWidth={1.5} />
          {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
        </ToolHint>
      </StyledWrapper>

      {isOpen && <NotificationsModal notifications={notifications} onClose={close} />}
    </>
  );
};

export default Notifications;
