import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import {
  findMockServerInstance,
  getMockServerInstances,
  getMockServerNameError,
  isMockServerNameTaken,
  saveMockServerInstance,
  updateMockServerTabName
} from 'utils/mock-server/mock-server-instances';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';

const RenameMockServerModal = ({ instance, onClose }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const inputRef = useRef();
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const storedInstance = useSelector((state) => (
    findMockServerInstance(state, instance.uid) || instance
  ));
  const existingInstances = useSelector((state) => getMockServerInstances(state, activeWorkspaceUid));

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: storedInstance.name
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .trim()
        .min(1, () => i18n.t('VALIDATION.MIN_1_CHAR'))
        .max(255, () => i18n.t('VALIDATION.MAX_255_CHARS'))
        .test('is-valid-name', function (value) {
          const error = getMockServerNameError(value);
          return error ? this.createError({ message: error }) : true;
        })
        .required(() => i18n.t('VALIDATION.NAME_REQUIRED'))
        .test('duplicate-name', () => i18n.t('VALIDATION.MOCK_SERVER_NAME_EXISTS'), (value) => (
          !isMockServerNameTaken(existingInstances, value, storedInstance.uid)
        ))
    }),
    onSubmit: async (values) => {
      const nextInstance = {
        ...storedInstance,
        name: values.name.trim()
      };

      try {
        await dispatch(saveMockServerInstance(nextInstance));
        dispatch(updateMockServerTabName(nextInstance));
        toast.success(i18n.t('TOASTS.MOCK_SERVER_RENAMED'));
        onClose();
      } catch (err) {
        toast.error(err?.message || i18n.t('TOASTS.FAILED_RENAME_MOCK_SERVER'));
      }
    }
  });

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleCancel = () => {
    formik.resetForm({ values: formik.values });
    onClose();
  };

  return (
    <Portal>
      <Modal
        size="md"
        title={t('MODALS.RENAME_MOCK_SERVER.TITLE')}
        confirmText={t('MODALS.COMMON.RENAME')}
        handleConfirm={() => formik.handleSubmit()}
        handleCancel={handleCancel}
        dataTestId="mock-server-rename-modal"
      >
        <form className="marrone-form" onSubmit={(event) => event.preventDefault()}>
          <div>
            <label htmlFor="mock-server-rename-name" className="block font-medium">
              {t('MODALS.COMMON.NAME')}
            </label>
            <input
              id="mock-server-rename-name"
              type="text"
              name="name"
              ref={inputRef}
              className="block textbox w-full mt-2"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              data-testid="mock-server-rename-name-input"
            />
            {formik.touched.name && formik.errors.name ? (
              <div className="text-red-500 mt-1">{formik.errors.name}</div>
            ) : null}
          </div>
        </form>
      </Modal>
    </Portal>
  );
};

export default RenameMockServerModal;
