import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import get from 'lodash/get';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import { SettingsGroup, CheckboxSetting } from '../SettingsLayout';

const Security = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const includeSensitive = get(preferences, 'report.includeSensitive', false);

  const handleToggle = (e) => {
    dispatch(
      savePreferences({
        ...preferences,
        report: {
          ...preferences.report,
          includeSensitive: e.target.checked
        }
      })
    );
  };

  return (
    <StyledWrapper>
      <div className="section-header">{t('PREFERENCES.SECURITY.TITLE')}</div>
      <SettingsGroup
        title={t('PREFERENCES.SECURITY.REPORTS')}
        description={t('PREFERENCES.SECURITY.REPORTS_DESC')}
      >
        <CheckboxSetting
          id="includeSensitive"
          name="includeSensitive"
          label={t('PREFERENCES.SECURITY.INCLUDE_CREDENTIALS')}
          checked={includeSensitive}
          onChange={handleToggle}
        />
      </SettingsGroup>
    </StyledWrapper>
  );
};

export default Security;
