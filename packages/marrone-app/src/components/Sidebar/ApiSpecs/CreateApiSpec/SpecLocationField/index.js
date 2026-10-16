import React from 'react';
import { useTranslation } from 'react-i18next';

const SpecLocationField = ({ location, error, onBrowse }) => {
  const { t } = useTranslation();
  return (
    <>
      <label htmlFor="api-spec-location" className="block font-semibold mt-5">
        {t('MODALS.COMMON.LOCATION')}
      </label>
      <input
        id="api-spec-location"
        type="text"
        name="apiSpecLocation"
        readOnly={true}
        className="block textbox mt-1 w-full cursor-pointer"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        title={location}
        value={location}
        onClick={onBrowse}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onBrowse();
          }
        }}
      />
      {error ? (
        <div className="text-red-500 break-words">{error}</div>
      ) : null}
      <div className="mt-1">
        <span className="text-link cursor-pointer hover:underline" onClick={onBrowse}>
          {t('MODALS.COMMON.BROWSE')}
        </span>
      </div>
    </>
  );
};

export default SpecLocationField;
