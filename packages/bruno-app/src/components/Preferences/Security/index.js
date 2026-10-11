import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import get from 'lodash/get';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import { SettingsGroup, CheckboxSetting } from '../SettingsLayout';

const Security = () => {
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
      <div className="section-header">Security</div>
      <SettingsGroup
        title="Reports"
        description="Control how credentials are exposed in generated reports"
      >
        <CheckboxSetting
          id="includeSensitive"
          name="includeSensitive"
          label="Include credentials (Authorization, Cookie, API Key) in CURL commands within reports"
          checked={includeSensitive}
          onChange={handleToggle}
        />
      </SettingsGroup>
    </StyledWrapper>
  );
};

export default Security;
