import React, { useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { renameCollection } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid } from 'utils/collections/index';
import { useTranslation } from 'react-i18next';
import i18n from '../../../../../i18n';

const RenameCollection = ({ collectionUid, onClose }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const inputRef = useRef();
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: collection.name
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, () => i18n.t('VALIDATION.MIN_1_CHAR'))
        .required(() => i18n.t('VALIDATION.NAME_REQUIRED'))
    }),
    onSubmit: (values) => {
      dispatch(renameCollection(values.name, collection.uid))
        .then(() => {
          toast.success(i18n.t('TOASTS.COLLECTION_RENAMED'));
          onClose();
        })
        .catch((err) => {
          toast.error(err ? err.message : i18n.t('TOASTS.ERROR_RENAMING_COLLECTION'));
        });
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => formik.handleSubmit();

  return (
    <Modal size="md" title={t('MODALS.RENAME_COLLECTION.TITLE')} confirmText={t('MODALS.COMMON.RENAME')} handleConfirm={onSubmit} handleCancel={onClose}>
      <form className="marrone-form" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="name" className="block font-medium">
            {t('MODALS.COMMON.NAME')}
          </label>
          <input
            id="collection-name"
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
          {formik.touched.name && formik.errors.name ? <div className="text-red-500">{formik.errors.name}</div> : null}
        </div>
      </form>
    </Modal>
  );
};

export default RenameCollection;
