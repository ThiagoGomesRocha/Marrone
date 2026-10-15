import React, { useRef, useEffect, useCallback } from 'react';
import get from 'lodash/get';
import debounce from 'lodash/debounce';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { IconTrash, IconUpload } from '@tabler/icons';
import path from 'utils/common/path';
import { SettingsGroup, CheckboxSetting, SettingsField } from '../SettingsLayout';
import i18n from '../../../i18n';
import { useTranslation } from 'react-i18next';

const General = () => {
  const { t } = useTranslation();
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();
  // The file input is hidden; the visible button forwards its click here.
  const inputFileCaCertificateRef = useRef();
  const inputFileLogoRef = useRef();

  const preferencesSchema = Yup.object().shape({
    sslVerification: Yup.boolean(),
    customCaCertificate: Yup.object({
      enabled: Yup.boolean(),
      filePath: Yup.string().nullable()
    }),
    keepDefaultCaCertificates: Yup.object({
      enabled: Yup.boolean()
    }),
    storeCookies: Yup.boolean(),
    sendCookies: Yup.boolean(),
    timeout: Yup.mixed()
      .transform((value, originalValue) => {
        return originalValue === '' ? undefined : value;
      })
      .nullable()
      .test('isNumber', () => i18n.t('VALIDATION.TIMEOUT_NOT_NUMBER'), (value) => {
        return value === undefined || !isNaN(value);
      })
      .test('isValidTimeout', () => i18n.t('VALIDATION.TIMEOUT_MIN'), (value) => {
        return value === undefined || Number(value) >= 0;
      }),
    autoSave: Yup.object({
      enabled: Yup.boolean(),
      interval: Yup.mixed()
        .transform((value, originalValue) => {
          return originalValue === '' ? undefined : value;
        })
        .test('isNumber', () => i18n.t('VALIDATION.SAVE_DELAY_NOT_NUMBER'), (value) => {
          return value === undefined || !isNaN(value);
        })
        .test('isValidInterval', () => i18n.t('VALIDATION.SAVE_DELAY_MIN'), (value) => {
          return value === undefined || Number(value) >= 500;
        })
        .test('intervalRequired', () => i18n.t('VALIDATION.SAVE_DELAY_REQUIRED'), function (value) {
          return !(this.parent.enabled && (value === undefined || value === ''));
        })
    }),
    oauth2: Yup.object({
      useSystemBrowser: Yup.boolean()
    }),
    defaultLocation: Yup.string().max(1024),
    language: Yup.string().oneOf(['en', 'pt-BR']),
    reportLogo: Yup.string(),
    reportDefaultDir: Yup.string().max(1024)
  });

  const formik = useFormik({
    initialValues: {
      sslVerification: preferences.request.sslVerification,
      customCaCertificate: {
        enabled: get(preferences, 'request.customCaCertificate.enabled', false),
        filePath: get(preferences, 'request.customCaCertificate.filePath', null)
      },
      keepDefaultCaCertificates: {
        enabled: get(preferences, 'request.keepDefaultCaCertificates.enabled', true)
      },
      timeout: preferences.request.timeout,
      storeCookies: get(preferences, 'request.storeCookies', true),
      sendCookies: get(preferences, 'request.sendCookies', true),
      autoSave: {
        enabled: get(preferences, 'autoSave.enabled', false),
        interval: get(preferences, 'autoSave.interval', 1000)
      },
      oauth2: {
        useSystemBrowser: get(preferences, 'request.oauth2.useSystemBrowser', false)
      },
      defaultLocation: get(preferences, 'general.defaultLocation', ''),
      language: get(preferences, 'general.language', 'en'),
      reportLogo: get(preferences, 'report.logo', ''),
      reportDefaultDir: get(preferences, 'report.defaultDir', '')
    },
    validationSchema: preferencesSchema,
    onSubmit: async (values) => {
      try {
        const newPreferences = await preferencesSchema.validate(values, { abortEarly: true });
        handleSave(newPreferences);
      } catch (error) {
        console.error('Preferences validation error:', error.message);
      }
    }
  });

  const handleSave = useCallback((newPreferences) => {
    dispatch(
      savePreferences({
        ...preferences,
        request: {
          ...preferences.request,
          sslVerification: newPreferences.sslVerification,
          customCaCertificate: {
            enabled: newPreferences.customCaCertificate.enabled,
            filePath: newPreferences.customCaCertificate.filePath
          },
          keepDefaultCaCertificates: {
            enabled: newPreferences.keepDefaultCaCertificates.enabled
          },
          timeout: newPreferences.timeout,
          storeCookies: newPreferences.storeCookies,
          sendCookies: newPreferences.sendCookies,
          oauth2: {
            useSystemBrowser: newPreferences.oauth2.useSystemBrowser
          }
        },
        autoSave: {
          enabled: newPreferences.autoSave.enabled,
          interval: newPreferences.autoSave.interval
        },
        general: {
          defaultLocation: newPreferences.defaultLocation,
          language: newPreferences.language
        },
        report: {
          logo: newPreferences.reportLogo || '',
          defaultDir: newPreferences.reportDefaultDir || '',
          includeSensitive: get(preferences, 'report.includeSensitive', false)
        }
      }))
      .catch((err) => console.log(err) && toast.error(i18n.t('TOASTS.FAILED_UPDATE_PREFERENCES')));
  }, [dispatch, preferences]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const debouncedSave = useCallback(
    debounce((values) => {
      preferencesSchema.validate(values, { abortEarly: true })
        .then((validatedValues) => {
          handleSaveRef.current(validatedValues);
        })
        .catch((error) => {
        });
    }, 500),
    []
  );

  useEffect(() => {
    if (formik.dirty && formik.isValid) {
      debouncedSave(formik.values);
    }
    return () => {
      debouncedSave.flush();
    };
  }, [formik.values, formik.dirty, formik.isValid, debouncedSave]);

  const addCaCertificate = (e) => {
    const filePath = window?.ipcRenderer?.getFilePath(e?.target?.files?.[0]);
    if (filePath) {
      formik.setFieldValue('customCaCertificate.filePath', filePath);
    }
  };

  const deleteCaCertificate = () => {
    formik.setFieldValue('customCaCertificate.filePath', null);
  };

  const browseDefaultLocation = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string') {
          formik.setFieldValue('defaultLocation', dirPath);
        }
      })
      .catch((error) => {
        // cancelling resolves false, so this is a real failure: keep the existing value
        console.error(error);
        toast.error(i18n.t('TOASTS.FAILED_BROWSE_DEFAULT_LOCATION'));
      });
  };

  const handleLogoUpload = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) {
      return;
    }
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast.error(i18n.t('TOASTS.PNG_JPEG_ONLY'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      formik.setFieldValue('reportLogo', reader.result);
    };
    reader.onerror = () => {
      toast.error(i18n.t('TOASTS.FAILED_READ_IMAGE'));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    formik.setFieldValue('reportLogo', '');
  };

  const browseReportDir = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string') {
          formik.setFieldValue('reportDefaultDir', dirPath);
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error(i18n.t('TOASTS.FAILED_BROWSE_REPORT_DIR'));
      });
  };

  const customCaCertificateEnabled = formik.values.customCaCertificate.enabled;
  const customCaCertificatePath = formik.values.customCaCertificate.filePath;
  const keepDefaultCaCertificatesDisabled = !(customCaCertificateEnabled && customCaCertificatePath);
  const autoSaveEnabled = formik.values.autoSave.enabled;

  // gate typed field errors on touched so they are not flashed on every keystroke
  const autoSaveIntervalTouched = get(formik.touched, 'autoSave.interval', false);
  const autoSaveError = autoSaveIntervalTouched ? formik.errors.autoSave?.interval : undefined;
  const timeoutError = formik.touched.timeout ? formik.errors.timeout : undefined;

  return (
    <StyledWrapper className="w-full">
      <div className="section-header">{t('PREFERENCES.GENERAL.TITLE')}</div>
      <form className="marrone-form settings-form" onSubmit={formik.handleSubmit}>
        <SettingsGroup
          title={t('PREFERENCES.GENERAL.LANGUAGE_TITLE')}
          description={t('PREFERENCES.GENERAL.LANGUAGE_DESC')}
        >
          <SettingsField label={t('PREFERENCES.GENERAL.LANGUAGE_LABEL')} htmlFor="language">
            <select
              id="language"
              name="language"
              className="textbox"
              value={formik.values.language}
              onChange={(e) => {
                const lang = e.target.value;
                i18n.changeLanguage(lang);
                formik.setFieldValue('language', lang);
              }}
            >
              <option value="en">English</option>
              <option value="pt-BR">Português (Brasil)</option>
            </select>
          </SettingsField>
        </SettingsGroup>

        <SettingsGroup title={t('PREFERENCES.GENERAL.CERTIFICATES')}>
          <CheckboxSetting
            id="sslVerification"
            name="sslVerification"
            label={t('PREFERENCES.GENERAL.SSL_VERIFICATION')}
            checked={formik.values.sslVerification}
            onChange={formik.handleChange}
          />
          <CheckboxSetting
            id="customCaCertificateEnabled"
            name="customCaCertificate.enabled"
            label={t('PREFERENCES.GENERAL.CUSTOM_CA')}
            checked={customCaCertificateEnabled}
            onChange={formik.handleChange}
          >
            <div className={`ca-certificate-picker ${customCaCertificateEnabled ? '' : 'is-disabled'}`}>
              {customCaCertificatePath ? (
                <span className="ca-certificate-file">
                  {path.basename(customCaCertificatePath)}
                  <button
                    type="button"
                    className="ca-certificate-remove"
                    aria-label={t('PREFERENCES.GENERAL.REMOVE_CA')}
                    data-testid="general-remove-ca-certificate"
                    disabled={!customCaCertificateEnabled}
                    onClick={deleteCaCertificate}
                  >
                    <IconTrash strokeWidth={1.5} size={14} />
                  </button>
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    className="ca-certificate-select"
                    data-testid="general-select-ca-certificate"
                    disabled={!customCaCertificateEnabled}
                    onClick={() => inputFileCaCertificateRef.current.click()}
                  >
                    <IconUpload strokeWidth={1.5} size={14} aria-hidden="true" />
                    {t('PREFERENCES.GENERAL.SELECT_FILE')}
                  </button>
                  <input
                    id="caCertFilePath"
                    type="file"
                    name="customCaCertificate.filePath"
                    className="hidden"
                    ref={inputFileCaCertificateRef}
                    disabled={!customCaCertificateEnabled}
                    onChange={addCaCertificate}
                  />
                </>
              )}
            </div>
            <CheckboxSetting
              id="keepDefaultCaCertificatesEnabled"
              name="keepDefaultCaCertificates.enabled"
              label={t('PREFERENCES.GENERAL.KEEP_DEFAULT_CA')}
              checked={formik.values.keepDefaultCaCertificates.enabled}
              onChange={formik.handleChange}
              disabled={keepDefaultCaCertificatesDisabled}
            />
          </CheckboxSetting>
        </SettingsGroup>

        <SettingsGroup title={t('PREFERENCES.GENERAL.COOKIES_AUTH')}>
          <CheckboxSetting
            id="storeCookies"
            name="storeCookies"
            label={t('PREFERENCES.GENERAL.STORE_COOKIES')}
            checked={formik.values.storeCookies}
            onChange={formik.handleChange}
          />
          <CheckboxSetting
            id="sendCookies"
            name="sendCookies"
            label={t('PREFERENCES.GENERAL.SEND_COOKIES')}
            checked={formik.values.sendCookies}
            onChange={formik.handleChange}
          />
          <CheckboxSetting
            id="oauth2.useSystemBrowser"
            name="oauth2.useSystemBrowser"
            label={t('PREFERENCES.GENERAL.OAUTH2_BROWSER')}
            checked={formik.values.oauth2.useSystemBrowser}
            onChange={formik.handleChange}
          />
        </SettingsGroup>

        <SettingsGroup title={t('PREFERENCES.GENERAL.AUTO_SAVE')}>
          <CheckboxSetting
            id="autoSaveEnabled"
            name="autoSave.enabled"
            label={t('PREFERENCES.GENERAL.ENABLE_AUTO_SAVE')}
            checked={autoSaveEnabled}
            onChange={formik.handleChange}
          />
          <SettingsField
            label={t('PREFERENCES.GENERAL.AUTO_SAVE_DELAY')}
            htmlFor="autoSaveInterval"
            disabled={!autoSaveEnabled}
            error={autoSaveError}
          >
            <input
              id="autoSaveInterval"
              type="text"
              name="autoSave.interval"
              className="textbox numeric-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.autoSave.interval}
              disabled={!autoSaveEnabled}
            />
          </SettingsField>
        </SettingsGroup>

        <SettingsGroup title={t('PREFERENCES.GENERAL.REQUESTS')}>
          <SettingsField label={t('PREFERENCES.GENERAL.REQUEST_TIMEOUT')} htmlFor="timeout" error={timeoutError}>
            <input
              id="timeout"
              type="text"
              name="timeout"
              className="textbox numeric-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.timeout}
            />
          </SettingsField>
        </SettingsGroup>

        <SettingsGroup
          title={t('PREFERENCES.GENERAL.DEFAULT_LOCATION')}
          description={t('PREFERENCES.GENERAL.DEFAULT_LOCATION_DESC')}
        >
          <SettingsField error={formik.errors.defaultLocation} className="default-location-field">
            <input
              type="text"
              name="defaultLocation"
              id="defaultLocation"
              aria-label={t('PREFERENCES.GENERAL.DEFAULT_LOCATION')}
              data-testid="general-default-location-input"
              className="textbox cursor-pointer default-location-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              readOnly={true}
              onChange={formik.handleChange}
              value={formik.values.defaultLocation || ''}
              onClick={browseDefaultLocation}
              placeholder={t('PREFERENCES.GENERAL.BROWSE_LOCATION')}
            />
            <button
              type="button"
              className="default-location-browse"
              data-testid="general-browse-default-location"
              onClick={browseDefaultLocation}
            >
              {t('PREFERENCES.GENERAL.BROWSE')}
            </button>
          </SettingsField>
        </SettingsGroup>

        <SettingsGroup
          title={t('PREFERENCES.GENERAL.REPORT')}
          description={t('PREFERENCES.GENERAL.REPORT_DESC')}
        >
          <SettingsField label={t('PREFERENCES.GENERAL.REPORT_LOGO')} htmlFor="reportLogo">
            <div className="report-logo-upload">
              {formik.values.reportLogo ? (
                <>
                  <img className="report-logo-preview" src={formik.values.reportLogo} alt={t('PREFERENCES.GENERAL.REPORT_LOGO_ALT')} />
                  <button type="button" className="report-logo-remove" onClick={removeLogo}>
                    {t('PREFERENCES.GENERAL.REMOVE')}
                  </button>
                </>
              ) : (
                <button type="button" className="report-logo-select" onClick={() => inputFileLogoRef.current.click()}>
                  <IconUpload strokeWidth={1.5} size={14} aria-hidden="true" />
                  {t('PREFERENCES.GENERAL.UPLOAD_LOGO')}
                </button>
              )}
              <input
                id="reportLogo"
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                ref={inputFileLogoRef}
                onChange={handleLogoUpload}
              />
            </div>
          </SettingsField>

          <SettingsField label={t('PREFERENCES.GENERAL.REPORT_DIR')} htmlFor="reportDefaultDir">
            <input
              type="text"
              name="reportDefaultDir"
              id="reportDefaultDir"
              className="textbox cursor-pointer default-location-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              readOnly={true}
              onChange={formik.handleChange}
              value={formik.values.reportDefaultDir || ''}
              onClick={browseReportDir}
              placeholder={t('PREFERENCES.GENERAL.BROWSE_REPORT_DIR')}
            />
            <button type="button" className="default-location-browse" onClick={browseReportDir}>
              {t('PREFERENCES.GENERAL.BROWSE')}
            </button>
          </SettingsField>
        </SettingsGroup>
      </form>
    </StyledWrapper>
  );
};

export default General;
