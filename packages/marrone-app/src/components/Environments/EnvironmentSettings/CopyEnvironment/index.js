import Modal from 'components/Modal/index';
import Portal from 'components/Portal/index';
import { useFormik } from 'formik';
import { copyEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import * as Yup from 'yup';
import i18n from '../../../../i18n';

const CopyEnvironment = ({ collection, environment, onClose }) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: environment.name + ' - Copy'
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, () => i18n.t('VALIDATION.MIN_1_CHAR'))
        .max(50, () => i18n.t('VALIDATION.MAX_50_CHARS'))
        .required(() => i18n.t('VALIDATION.NAME_REQUIRED'))
    }),
    onSubmit: (values) => {
      dispatch(copyEnvironment(values.name, environment.uid, collection.uid))
        .then(() => {
          toast.success(i18n.t('TOASTS.ENV_CREATED_IN_COLLECTION'));
          onClose();
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
      <Modal size="sm" title={i18n.t('UI.COPY_ENVIRONMENT')} confirmText={i18n.t('UI.COPY')} handleConfirm={onSubmit} handleCancel={onClose}>
        <form className="marrone-form" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="name" className="block font-medium">
              New Environment Name
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

export default CopyEnvironment;
