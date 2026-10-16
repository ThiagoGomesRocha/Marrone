import React, { memo } from 'react';
import { ResolutionButton } from '../ReviewStep/StyledWrapper';
import { RESOLUTION_OPTIONS, RESOLUTION_TYPES } from '../utils';
import { useTranslation } from 'react-i18next';

const EnvironmentRow = ({ env, isSelected, resolution, toggleItemSelection, setItemResolution, showResolutions }) => {
  const { t } = useTranslation();
  return (
    <div className="env-item" data-testid="env-import-item">
      <label className="env-item-label">
        <input
          type="checkbox"
          className="env-item-checkbox"
          checked={isSelected}
          onChange={() => toggleItemSelection(env.id)}
          data-testid="env-import-item-checkbox"
        />
        <div className="env-item-content">
          <div className="env-name" title={env.name}>{env.name}</div>
        </div>
      </label>
      {showResolutions && (
        <div className="env-actions">
          {RESOLUTION_OPTIONS.map(({ value, testId }) => {
            const isNew = value === RESOLUTION_TYPES.CREATE_NEW;
            const label = isNew ? t('MODALS.IMPORT_ENVIRONMENT.RESOLUTION_NEW') : t('MODALS.IMPORT_ENVIRONMENT.RESOLUTION_REPLACE');
            const title = isNew ? t('MODALS.IMPORT_ENVIRONMENT.RESOLUTION_NEW_TITLE') : t('MODALS.IMPORT_ENVIRONMENT.RESOLUTION_REPLACE_TITLE');
            const selected = resolution === value;

            return (
              <ResolutionButton
                key={value}
                $selected={selected}
                aria-pressed={selected}
                onClick={() => setItemResolution(env.id, value)}
                title={title}
                data-testid={testId}
              >
                {label}
              </ResolutionButton>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default memo(EnvironmentRow);
