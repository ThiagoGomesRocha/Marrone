import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { closeAiSidebar, dockAiChat } from 'providers/ReduxStore/slices/chat';
import PopoutWindow from '../PopoutWindow';
import AiChatSidebar from '../index';
import i18n from '../../../i18n';

const AiChatPopout = ({ collection }) => {
  const dispatch = useDispatch();

  const handleClose = useCallback(({ blocked } = {}) => {
    // Closing the OS window closes the assistant (like undocked devtools).
    // If window.open was blocked, fall back to the docked sidebar instead.
    dispatch(blocked ? dockAiChat() : closeAiSidebar());
  }, [dispatch]);

  return (
    <PopoutWindow title={i18n.t('UI.AI_ASSISTANT')} onClose={handleClose}>
      <AiChatSidebar collection={collection} variant="popout" />
    </PopoutWindow>
  );
};

export default AiChatPopout;
