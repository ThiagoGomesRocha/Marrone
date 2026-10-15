import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { savePreferences, updateActivePreferencesTab } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import debounce from 'lodash/debounce';
import toast from 'react-hot-toast';
import get from 'lodash/get';
// Commented out while there are no active beta features. Re-enable this import when
// adding a beta feature its keys are then referenced as BETA_FEATURE_IDS.MY_FEATURE in the BETA_FEATURES array.
import { IconArrowRight, IconExternalLink } from '@tabler/icons';
import ToggleSwitch from 'components/ToggleSwitch';

import { BETA_FEATURES as BETA_FEATURE_IDS } from 'utils/beta-features';
import { getDocsUrlWithVersion } from 'utils/url';

/**
 * UI metadata for the Beta Features section in Preferences — one entry per toggle.
 * The whole tab is data-driven from this array: the form fields, validation schema,
 * initial values and the rendered checkboxes are all generated from it.
 *
 * Each entry has the shape { id, label, description }:
 *   - id          (required) the feature key. MUST be a value from BETA_FEATURES in
 *                 utils/beta-features.js (imported here as BETA_FEATURE_IDS). It is
 *                 used as the preference key (preferences.beta[id]), the form field
 *                 name and the checkbox id, so it must be stable and unique.
 *   - label       (required) i18n key for the short name shown next to the checkbox.
 *   - description (required) i18n key for the one-line explanation shown under the label.
 *   - docsUrl     (optional) URL to the documentation for the feature.
 *   - defaultEnabled (optional) value used when the preference has never been saved. Must match the
 *                 default in the electron preferences store, otherwise the toggle lies about the state.
 *   - action      (optional) object with { label, tab } to render a button that navigates to a specific preferences tab. The label is an i18n key for the button text, and the tab is the tab key (e.g. 'ai', 'cache').
 *
 * To add a beta feature:
 *   1. Add its key to BETA_FEATURES in utils/beta-features.js (e.g. MY_FEATURE: 'my-feature').
 *   2. Add an entry to the array below using BETA_FEATURE_IDS.MY_FEATURE.
 *   3. Gate the feature in code with useBetaFeature(BETA_FEATURES.MY_FEATURE).
 *
 * When the array is empty, the Beta tab shows "No beta features are currently available",
 * so a feature can be hidden by simply removing or commenting out its entry.
 *
 * Sobre `docsUrl`: o Marrone não tem site de documentação próprio — a referência é a
 * documentação do Bruno (o projeto de origem), que é para onde estes links apontam. As
 * URLs curtas `link.marrone.com/docs/*` que existiam aqui foram inventadas pelo rename e
 * não resolvem. Os caminhos abaixo foram conferidos (respondem 200); onde não há página
 * específica verificável, o link vai para a raiz da documentação de propósito — melhor
 * levar a um lugar real do que a um 404.
 */
const BETA_FEATURES = [
  {
    id: BETA_FEATURE_IDS.AI_ASSISTANT,
    label: 'PREFERENCES.BETA.AI_ASSISTANT_LABEL',
    description: 'PREFERENCES.BETA.AI_ASSISTANT_DESC',
    action: { label: 'PREFERENCES.BETA.GO_TO_AI_SETTINGS', tab: 'ai' },
    docsUrl: 'https://docs.usebruno.com/ai/bruno-ai/introduction'
  },
  {
    id: BETA_FEATURE_IDS.FILE_CACHE,
    label: 'PREFERENCES.BETA.FILE_CACHE_LABEL',
    description: 'PREFERENCES.BETA.FILE_CACHE_DESC',
    action: { label: 'PREFERENCES.BETA.GO_TO_CACHE_SETTINGS', tab: 'cache' }
  },
  {
    id: BETA_FEATURE_IDS.AKAMAI_EDGEGRID,
    label: 'PREFERENCES.BETA.AKAMAI_EDGEGRID_LABEL',
    description: 'PREFERENCES.BETA.AKAMAI_EDGEGRID_DESC',
    docsUrl: 'https://docs.usebruno.com/auth/overview'
  },
  {
    id: BETA_FEATURE_IDS.MOCK_SERVER,
    label: 'PREFERENCES.BETA.MOCK_SERVER_LABEL',
    description: 'PREFERENCES.BETA.MOCK_SERVER_DESC',
    toggle: true,
    defaultEnabled: true,
    docsUrl: 'https://docs.usebruno.com'
  },
  {
    id: BETA_FEATURE_IDS.GRPC_SCRIPTING,
    label: 'PREFERENCES.BETA.GRPC_SCRIPTING_LABEL',
    description: 'PREFERENCES.BETA.GRPC_SCRIPTING_DESC',
    docsUrl: 'https://docs.usebruno.com'
  }
];

const Beta = ({ close }) => {
  const { t } = useTranslation();
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  // Generate validation schema dynamically from beta features
  const generateValidationSchema = () => {
    const schemaShape = {};
    BETA_FEATURES.forEach((feature) => {
      schemaShape[feature.id] = Yup.boolean();
    });
    return Yup.object().shape(schemaShape);
  };

  // Generate initial values dynamically from beta features
  const generateInitialValues = () => {
    const initialValues = {};
    BETA_FEATURES.forEach((feature) => {
      initialValues[feature.id] = get(preferences, `beta.${feature.id}`, feature.defaultEnabled ?? false);
    });
    return initialValues;
  };

  // BETA_FEATURES is static, so the schema never actually changes across renders
  const betaSchema = useMemo(() => generateValidationSchema(), []);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: generateInitialValues(),
    validationSchema: betaSchema,
    onSubmit: async (values) => {
      try {
        const newPreferences = await betaSchema.validate(values, { abortEarly: true });
        handleSave(newPreferences);
      } catch (error) {
        console.error('Beta preferences validation error:', error.message);
      }
    }
  });

  const handleSave = useCallback((newBetaPreferences) => {
    dispatch(
      savePreferences({
        ...preferences,
        beta: {
          ...preferences.beta,
          ...newBetaPreferences
        }
      })
    )
      .catch((err) => console.log(err) && toast.error('Failed to update beta preferences'));
  }, [dispatch, preferences]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const debouncedSave = useCallback(
    debounce((values) => {
      betaSchema.validate(values, { abortEarly: true })
        .then((validatedValues) => {
          handleSaveRef.current(validatedValues);
        })
        .catch((error) => {
        });
    }, 500),
    [betaSchema]
  );

  // Auto-save when form values change
  useEffect(() => {
    if (formik.dirty && formik.isValid) {
      debouncedSave(formik.values);
    }
    return () => {
      debouncedSave.flush();
    };
  }, [formik.values, formik.dirty, formik.isValid, debouncedSave]);

  const hasAnyBetaFeatures = BETA_FEATURES.length > 0;

  const goToTab = useCallback((tab) => {
    dispatch(updateActivePreferencesTab({ tab }));
  }, [dispatch]);

  return (
    <StyledWrapper>
      <div className="section-header">{t('PREFERENCES.BETA.TITLE')}</div>
      <form onSubmit={formik.handleSubmit}>
        <div className="mb-6">
          <p className="text-gray-500 dark:text-gray-400 mb-4 text-wrap">
            {t('PREFERENCES.BETA.DESCRIPTION')}
          </p>
        </div>

        <div className="beta-feature-list">
          {BETA_FEATURES.map((feature) => (
            <div key={feature.id} className="beta-feature-item">
              <div className="beta-feature-header">
                <span className="beta-feature-title select-none font-medium" id={`${feature.id}-label`}>
                  {t(feature.label)}
                </span>
              </div>
              <div className="beta-feature-description text-xs text-gray-500 dark:text-gray-400 flex">
                {t(feature.description)}
                {feature.toggle && (
                  <div className="ml-auto">
                    <ToggleSwitch
                      size="xs"
                      isOn={formik.values[feature.id]}
                      handleToggle={() => formik.setFieldValue(feature.id, !formik.values[feature.id])}
                      data-testid="mock-server-beta-toggle"
                    />
                  </div>
                )}
              </div>
              {(feature.action || feature.docsUrl) && (
                <div className="beta-feature-links">
                  {feature.action && (
                    <button
                      type="button"
                      className="beta-feature-link"
                      onClick={() => goToTab(feature.action.tab)}
                    >
                      <span>{t(feature.action.label)}</span>
                      <IconArrowRight size={14} strokeWidth={1.5} />
                    </button>
                  )}
                  {feature.docsUrl && (
                    <a
                      className="beta-feature-link"
                      href={getDocsUrlWithVersion(feature.docsUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>{t('PREFERENCES.BETA.VIEW_DOCS')}</span>
                      <IconExternalLink size={14} strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {!hasAnyBetaFeatures && (
          <div className="no-features-message">
            <p>{t('PREFERENCES.BETA.NO_FEATURES')}</p>
          </div>
        )}
      </form>
    </StyledWrapper>
  );
};

export default Beta;
