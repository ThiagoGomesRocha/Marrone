import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { useDispatch } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { cloneDeep } from 'lodash';
import { IconCaretDown } from '@tabler/icons';
import toast from 'react-hot-toast';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import Portal from 'components/Portal';
import { useTranslation } from 'react-i18next';
import Modal from 'components/Modal';
import Dropdown from 'components/Dropdown';
import { browseDirectory, exportCollectionToPostman } from 'providers/ReduxStore/slices/collections/actions';
import { exportPostmanCollection } from 'utils/exporters/postman-collection';
import StyledWrapper from './StyledWrapper';
import i18n from '../../../../../../i18n';

const FILE_EXISTS_ERROR = 'Name already exists in this location.';

const ExportToPostman = ({ onClose, onExported, collection }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const inputRef = useRef();
  const [preserveScripts, setPreserveScripts] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const optionsDropdownTippyRef = useRef();
  const onOptionsDropdownCreate = (ref) => (optionsDropdownTippyRef.current = ref);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      fileName: sanitizeName(collection?.name || ''),
      location: ''
    },
    validationSchema: Yup.object({
      fileName: Yup.string()
        .trim()
        .min(1, () => i18n.t('VALIDATION.MIN_1_CHAR'))
        .max(255, () => i18n.t('VALIDATION.MAX_255_CHARS'))
        .test('is-valid-name', function (value) {
          if (!value) return true;
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
        .required(() => i18n.t('VALIDATION.NAME_REQUIRED')),
      location: Yup.string().min(1, () => i18n.t('VALIDATION.LOCATION_REQUIRED')).required(() => i18n.t('VALIDATION.LOCATION_REQUIRED'))
    }),
    onSubmit: (values) => handleExport(values, false)
  });

  // a conflicting filename is tracked for showing error
  const fileExists = formik.errors.fileName === FILE_EXISTS_ERROR;

  async function handleExport(values, overwrite) {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const content = exportPostmanCollection(cloneDeep(collection), { preserveScripts });
      await dispatch(exportCollectionToPostman(values.location, `${values.fileName.trim()}.json`, content, overwrite));
      toast.success(i18n.t('TOASTS.COLLECTION_EXPORTED'));
      onExported();
    } catch (error) {
      const message = error?.message || String(error);

      // the filename already exists, surface it as a error message
      if (!overwrite && message.includes('already exists')) {
        formik.setFieldError('fileName', FILE_EXISTS_ERROR);
        return;
      }
      toast.error(i18n.t('TOASTS.FAILED_EXPORT_COLLECTION') + ': ' + message);
    } finally {
      setIsExporting(false);
    }
  }

  // overwrite = true will replace the existing file in the location
  const handleReplace = () => handleExport(formik.values, true);

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string' && dirPath.length > 0) {
          formik.setFieldValue('location', dirPath);
        }
      })
      .catch((error) => {
        formik.setFieldValue('location', '');
        console.error(error);
      });
  };

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const AdvancedOptions = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center text-link cursor-pointer">
        <button className="btn-advanced" type="button">
          {t('MODALS.COMMON.OPTIONS')}
        </button>
        <IconCaretDown className="caret ml-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="md"
          title={t('MODALS.EXPORT_TO_POSTMAN.TITLE')}
          dataTestId="export-to-postman-modal"
          confirmText={fileExists ? t('MODALS.COMMON.REPLACE') : t('MODALS.COMMON.EXPORT')}
          confirmButtonColor={fileExists ? 'danger' : 'primary'}
          confirmDisabled={isExporting}
          handleConfirm={() => (fileExists ? handleReplace() : formik.handleSubmit())}
          handleCancel={onClose}
          footerLeft={(
            <div className="advanced-options flex">
              <Dropdown onCreate={onOptionsDropdownCreate} icon={<AdvancedOptions />} placement="bottom-start">
                <div
                  className="dropdown-item"
                  data-testid="show-advanced-options-toggle"
                  onClick={() => {
                    optionsDropdownTippyRef?.current?.hide();
                    setShowAdvancedOptions(!showAdvancedOptions);
                  }}
                >
                  {showAdvancedOptions ? t('MODALS.COMMON.HIDE_ADVANCED_OPTIONS') : t('MODALS.COMMON.SHOW_ADVANCED_OPTIONS')}
                </div>
              </Dropdown>
            </div>
          )}
        >
          <form className="marrone-form" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="fileName" className="block font-medium">
              {t('MODALS.COMMON.NAME')}
            </label>
            <div className="relative">
              <input
                id="fileName"
                type="text"
                name="fileName"
                ref={inputRef}
                className="block textbox mt-2 !pr-14 w-full"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                value={formik.values.fileName || ''}
                onChange={formik.handleChange}
              />
              <div className="absolute right-2 top-0 bottom-0 h-full flex items-center file-extension">.json</div>
            </div>
            {formik.touched.fileName && formik.errors.fileName ? (
              <div className="error-message">{formik.errors.fileName}</div>
            ) : null}

            <label htmlFor="location" className="block font-medium mt-4">
              {t('MODALS.COMMON.LOCATION')}
            </label>
            <input
              id="location"
              type="text"
              name="location"
              className="block textbox mt-2 w-full cursor-pointer"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={formik.values.location || ''}
              onClick={browse}
              onChange={(e) => formik.setFieldValue('location', e.target.value)}
            />
            {formik.touched.location && formik.errors.location ? (
              <div className="error-message">{formik.errors.location}</div>
            ) : null}
            <div className="mt-1">
              <span className="text-link cursor-pointer hover:underline" onClick={browse}>
                {t('MODALS.COMMON.BROWSE')}
              </span>
            </div>

            {showAdvancedOptions && (
              <label className="mt-4 flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveScripts}
                  onChange={(e) => setPreserveScripts(e.target.checked)}
                  className="checkbox cursor-pointer mt-0.5"
                  data-testid="preserve-scripts-toggle"
                />
                <div>
                  <span className="preserve-scripts-label">{t('MODALS.EXPORT_TO_POSTMAN.PRESERVE_SCRIPTS')}</span>
                  <p className="preserve-scripts-description">
                    {t('MODALS.EXPORT_TO_POSTMAN.PRESERVE_SCRIPTS_DESC')}
                  </p>
                </div>
              </label>
            )}
          </form>
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default ExportToPostman;
