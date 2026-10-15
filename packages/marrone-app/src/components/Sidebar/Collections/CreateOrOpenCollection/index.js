import { useTheme } from '../../../../providers/Theme';
import { useDispatch } from 'react-redux';
import { setIsOpeningCollection } from 'providers/ReduxStore/slices/app';

import styled from 'styled-components';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const LinkStyle = styled.span`
  color: ${(props) => props.theme['text-link']};
`;

const CreateOrOpenCollection = ({ onCreateClick }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const dispatch = useDispatch();

  const handleOpenCollection = () => {
    dispatch(setIsOpeningCollection(true));
  };
  const CreateLink = () => (
    <LinkStyle
      className="underline text-link cursor-pointer"
      theme={theme}
      onClick={onCreateClick}
    >
      {t('MODALS.COMMON.CREATE')}
    </LinkStyle>
  );
  const OpenLink = () => (
    <LinkStyle className="underline text-link cursor-pointer" theme={theme} onClick={() => handleOpenCollection(true)}>
      {t('MODALS.COMMON.OPEN')}
    </LinkStyle>
  );

  return (
    <StyledWrapper className="px-2 mt-4">
      <div className="text-xs text-center">
        <div>{t('MODALS.CREATE_OR_OPEN.NO_COLLECTIONS')}</div>
        <div className="mt-2">
          <CreateLink /> {t('MODALS.CREATE_OR_OPEN.OR')} <OpenLink /> {t('MODALS.CREATE_OR_OPEN.COLLECTION')}.
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CreateOrOpenCollection;
