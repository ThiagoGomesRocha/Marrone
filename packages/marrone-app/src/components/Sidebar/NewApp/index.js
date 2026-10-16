import React, { useRef } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import Modal from 'components/Modal';
import Portal from 'components/Portal';
import { newApp } from 'providers/ReduxStore/slices/collections/actions';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';

const NewApp = ({ collectionUid, item, onClose }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const submitLockRef = useRef(false);

  const collection = useSelector((state) =>
    state.collections.collections?.find((c) => c.uid === collectionUid)
  );

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { appName: '' },
    validationSchema: Yup.object({
      appName: Yup.string()
        .trim()
        .min(1, () => i18n.t('VALIDATION.APP_NAME_REQUIRED'))
        .max(255, () => i18n.t('VALIDATION.MAX_255_CHARS'))
        .test('valid-name', validateNameError, (value) => validateName(value || ''))
        .required(() => i18n.t('VALIDATION.APP_NAME_REQUIRED'))
    }),
    onSubmit: (values) => {
      const name = values.appName.trim();
      return dispatch(
        newApp({
          appName: name,
          filename: sanitizeName(name),
          collectionUid,
          itemUid: item ? item.uid : null
        })
      )
        .then(() => {
          toast.success(i18n.t('TOASTS.APP_CREATED'));
          onClose();
        })
        .catch((err) => toast.error(err?.message || i18n.t('TOASTS.FAILED_CREATE_APP')))
        .finally(() => { submitLockRef.current = false; });
    }
  });

  const onSubmit = () => {
    if (submitLockRef.current || formik.isSubmitting) return;
    submitLockRef.current = true;
    formik.handleSubmit();
    setTimeout(() => { submitLockRef.current = false; }, 0);
  };

  return (
    <Portal>
      <Modal
        size="md"
        title={t('MODALS.NEW_APP.TITLE')}
        confirmText={t('MODALS.COMMON.CREATE')}
        handleConfirm={onSubmit}
        handleCancel={onClose}
        disableEscapeKey={false}
        disableCloseOnOutsideClick={false}
        confirmDisabled={formik.isSubmitting}
      >
        <form
          className="marrone-form"
          onSubmit={(e) => e.preventDefault()}
          data-testid="new-app-form"
        >
          <label htmlFor="appName" className="block font-semibold">
            {t('MODALS.COMMON.NAME')}
          </label>
          <input
            id="appName"
            type="text"
            name="appName"
            data-testid="new-app-name-input"
            autoFocus
            autoComplete="off"
            spellCheck="false"
            className="block textbox mt-2 w-full"
            value={formik.values.appName}
            onChange={formik.handleChange}
          />
          {formik.touched.appName && formik.errors.appName ? (
            <div className="text-red-500 text-xs mt-2">{formik.errors.appName}</div>
          ) : (
            <div className="text-xs mt-2 opacity-70">
              {t('MODALS.NEW_APP.CREATE_DESC_PRE')} {item ? t('MODALS.NEW_APP.CREATE_DESC_THIS_FOLDER') : t('MODALS.NEW_APP.CREATE_DESC_COLLECTION', { name: collection?.name || '' })}.
            </div>
          )}
        </form>
      </Modal>
    </Portal>
  );
};

export default NewApp;
