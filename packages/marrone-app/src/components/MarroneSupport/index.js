import React from 'react';
import Modal from 'components/Modal/index';
import { IconSpeakerphone, IconBook } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { MARRONE_DOCS_URL, MARRONE_ISSUES_URL } from 'utils/common/constants';
import i18n from '../../i18n';

/**
 * ATENÇÃO: este componente não está montado em lugar nenhum (a tela de suporte em uso é
 * `components/Preferences/Support`). Ele foi mantido aqui com os links corretos para que
 * uma eventual religação não traga de volta a organização inexistente `marrone/marrone`.
 *
 * Os itens de comunidade (Discord, Twitter, GitHub) foram removidos pelo mesmo motivo da
 * tela de Support: eram canais do Bruno, o projeto de origem.
 */
const MarroneSupport = ({ onClose }) => {
  return (
    <StyledWrapper>
      <Modal size="sm" title={i18n.t('UI.SUPPORT')} handleCancel={onClose} hideFooter={true}>
        <div className="collection-options">
          <div className="mt-2">
            <a href={MARRONE_DOCS_URL} target="_blank" rel="noreferrer" className="flex items-end">
              <IconBook size={18} strokeWidth={2} />
              <span className="label ml-2">Documentation</span>
            </a>
          </div>
          <div className="mt-2">
            <a href={MARRONE_ISSUES_URL} target="_blank" rel="noreferrer" className="flex items-end">
              <IconSpeakerphone size={18} strokeWidth={2} />
              <span className="label ml-2">Report Issues</span>
            </a>
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default MarroneSupport;
