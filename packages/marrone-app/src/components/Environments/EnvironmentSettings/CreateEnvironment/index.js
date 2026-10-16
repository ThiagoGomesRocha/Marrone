import React, { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import { addEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import * as Yup from 'yup';
import { useDispatch } from 'react-redux';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { validateName, validateNameError } from 'utils/common/regex';
import { useTranslation } from 'react-i18next';
import i18n from '../../../../i18n';

const CreateEnvironment = ({ collection, onClose, onEnvironmentCreated }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const inputRef = useRef();

  const validateEnvironmentName = (name) => {
    return !collection?.environments?.some((env) => env?.name?.toLowerCase().trim() === name?.toLowerCase().trim());
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: ''
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
      dispatch(addEnvironment(values.name, collection.uid))
        .then(() => {
          toast.success(i18n.t('TOASTS.ENV_CREATED_IN_COLLECTION'));
          onClose();
          // Call the callback if provided
          if (onEnvironmentCreated) {
            onEnvironmentCreated();
          }
        })
        .catch(() => toast.error(i18n.t('TOASTS.ERROR_CREATING_ENVIRONMENT')));
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
        size="md"
        title={t('MODALS.CREATE_ENVIRONMENT.TITLE')}
        confirmText={t('MODALS.COMMON.CREATE')}
        handleConfirm={onSubmit}
        handleCancel={onClose}
        dataTestId="create-environment-modal"
      >
        <form className="marrone-form" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="name" className="block font-medium">
              {t('MODALS.COMMON.ENVIRONMENT_NAME')}
            </label>
            <div className="flex items-center mt-2">
              <input
                id="environment-name"
                type="text"
                name="name"
                ref={inputRef}
                data-testid="environment-name-input"
                className="block textbox w-full"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={formik.handleChange}
                value={formik.values.name || ''}
              />
            </div>
            {formik.touched.name && formik.errors.name ? (
              <div className="text-red-500">{formik.errors.name}</div>
            ) : null}
          </div>
        </form>
      </Modal>
    </Portal>
  );
};

export default CreateEnvironment;
