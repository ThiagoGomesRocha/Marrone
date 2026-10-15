import React from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { clearRequestTimeline } from 'providers/ReduxStore/slices/collections/index';
import i18n from '../../../i18n';

const ClearTimeline = ({ collection, item }) => {
  const dispatch = useDispatch();

  const clearResponse = () =>
    dispatch(
      clearRequestTimeline({
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );

  return (
    <StyledWrapper className="flex items-center">
      <button type="button" onClick={clearResponse} className="text-link hover:underline whitespace-nowrap" title={i18n.t('UI.CLEAR_TIMELINE')}>
        Clear Timeline
      </button>
    </StyledWrapper>
  );
};

export default ClearTimeline;
