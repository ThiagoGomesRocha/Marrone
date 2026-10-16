import React, { useEffect, useRef } from 'react';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal/index';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useDispatch } from 'react-redux';
import { renameGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { validateName, validateNameError } from 'utils/common/regex';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import i18n from '../../../../i18n';

const RenameEnvironment = ({ onClose, environment }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const globalEnvs = useSelector((state) => state?.globalEnvironments?.globalEnvironments);
  const inputRef = useRef();

  const validateEnvironmentName = (name) => {
    const trimmedName = name?.toLowerCase().trim();
    return (globalEnvs || []).every((env) =>
      env.uid === environment.uid || env?.name?.toLowerCase().trim() !== trimmedName);
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: environment.name
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, () => i18n.t('VALIDATION.MIN_1_CHAR'))
        .max(255, () => i18n.t('VALIDATION.MAX_255_CHARS'))
        .test('is-valid-filename', function (value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
        .required(() => i18n.t('VALIDATION.NAME_REQUIRED'))
        .test('duplicate-name', () => i18n.t('VALIDATION.ENVIRONMENT_ALREADY_EXISTS'), validateEnvironmentName)
    }),
    onSubmit: (values) => {
      if (values.name === environment.name) {
        return;
      }
      dispatch(renameGlobalEnvironment({ name: values.name, environmentUid: environment.uid }))
        .then(() => {
          toast.success(i18n.t('TOASTS.ENV_RENAMED_SUCCESS'));
          onClose();
        })
        .catch((error) => {
          toast.error(i18n.t('TOASTS.ERROR_RENAMING_ENVIRONMENT'));
          console.error(error);
        });
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => {
    formik.handleSubmit();
  };

  return (
    <Portal>
      <Modal
        size="sm"
        title={t('MODALS.RENAME_ENVIRONMENT.TITLE')}
        confirmText={t('MODALS.COMMON.RENAME')}
        handleConfirm={onSubmit}
        handleCancel={onClose}
      >
        <form className="marrone-form" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="environment-name" className="block font-semibold">
              {t('MODALS.COMMON.ENVIRONMENT_NAME')}
            </label>
            <input
              id="environment-name"
              type="text"
              name="name"
              ref={inputRef}
              className="block textbox mt-2 w-full"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              value={formik.values.name || ''}
            />
            {formik.touched.name && formik.errors.name ? (
              <div className="text-red-500">{formik.errors.name}</div>
            ) : null}
          </div>
        </form>
      </Modal>
    </Portal>
  );
};

export default RenameEnvironment;
