import React, { useEffect, useRef } from 'react';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal/index';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useDispatch } from 'react-redux';
import { renameWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';

const RenameWorkspace = ({ onClose, workspace }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const inputRef = useRef();

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: workspace.name
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .trim()
        .min(1, () => i18n.t('VALIDATION.MIN_1_CHAR'))
        .max(255, () => i18n.t('VALIDATION.MAX_255_CHARS'))
        .required(() => i18n.t('VALIDATION.NAME_REQUIRED'))
    }),
    onSubmit: (values) => {
      const name = values.name.trim();
      if (name === workspace.name) {
        onClose();
        return;
      }
      dispatch(renameWorkspaceAction(workspace.uid, name))
        .then(() => {
          onClose();
        })
        .catch((error) => {
          toast.error(error?.message || i18n.t('TOASTS.ERROR_RENAMING_WORKSPACE'));
        });
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [inputRef]);

  const onSubmit = () => {
    formik.handleSubmit();
  };

  return (
    <Portal>
      <Modal
        size="md"
        title={t('MODALS.RENAME_WORKSPACE.TITLE')}
        confirmText={t('MODALS.COMMON.RENAME')}
        handleConfirm={onSubmit}
        handleCancel={onClose}
        dataTestId="rename-workspace-modal"
      >
        <form className="marrone-form" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="workspace-name" className="block font-semibold">
              {t('MODALS.RENAME_WORKSPACE.WORKSPACE_NAME')}
            </label>
            <input
              id="workspace-name"
              type="text"
              name="name"
              ref={inputRef}
              data-testid="workspace-name-input"
              className="block textbox mt-2 w-full"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              value={formik.values.name || ''}
            />
            {formik.touched.name && formik.errors.name ? (
              <div className="text-red-500" data-testid="workspace-name-error">{formik.errors.name}</div>
            ) : null}
          </div>
        </form>
      </Modal>
    </Portal>
  );
};

export default RenameWorkspace;
