import React, { useRef, useEffect, useState, forwardRef } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { isItemAFolder } from 'utils/tabs';
import { getItemTypeLabel } from 'utils/collections';
import { renameItem, saveRequest, closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import path from 'utils/common/path';
import { IconArrowBackUp, IconEdit, IconCaretDown } from '@tabler/icons';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import toast from 'react-hot-toast';
import Help from 'components/Help';
import PathDisplay from 'components/PathDisplay';
import Portal from 'components/Portal';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';
import Button from 'ui/Button';
import { useTranslation } from 'react-i18next';
import i18n from '../../../../../../i18n';

const RenameCollectionItem = ({ collectionUid, item, onClose }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const collection = useSelector((state) => state.collections.collections?.find((c) => c.uid === collectionUid));
  const isFolder = isItemAFolder(item);
  const inputRef = useRef();
  const [isEditing, toggleEditing] = useState(false);
  const itemName = item?.name;
  const itemType = item?.type;
  const itemTypeLabel = getItemTypeLabel(item);
  const itemTypeKey = isFolder ? 'FOLDER' : item?.type === 'app' ? 'APP' : 'REQUEST';
  const itemFilename = item?.filename ? path.parse(item?.filename).name : '';
  const [showFilesystemName, toggleShowFilesystemName] = useState(false);

  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: itemName,
      filename: sanitizeName(itemFilename)
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, () => i18n.t('VALIDATION.MIN_1_CHAR'))
        .max(255, () => i18n.t('VALIDATION.MAX_255_CHARS'))
        .required(() => i18n.t('VALIDATION.NAME_REQUIRED')),
      filename: Yup.string()
        .min(1, () => i18n.t('VALIDATION.MIN_1_CHAR'))
        .max(255, () => i18n.t('VALIDATION.MAX_255_CHARS'))
        .required(() => i18n.t('VALIDATION.NAME_REQUIRED'))
        .test('is-valid-name', function (value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
        .test('not-reserved', () => i18n.t('VALIDATION.RESERVED_NAMES'), (value) => !['collection', 'folder'].includes(value))
    }),
    onSubmit: async (values) => {
      // if there is unsaved changes in the request,
      // save them before renaming the request
      if ((item.name === values.name) && (itemFilename === values.filename)) {
        return;
      }
      if (!isFolder && item.draft) {
        await dispatch(saveRequest(item.uid, collectionUid, true));
      }
      const { name: newName, filename: newFilename } = values;
      try {
        let renameConfig = {
          itemUid: item.uid,
          collectionUid
        };
        renameConfig['newName'] = newName;
        if (itemFilename !== newFilename) {
          renameConfig['newFilename'] = newFilename;
        }
        await dispatch(renameItem(renameConfig));
        if (isFolder) {
          dispatch(closeTabs({ tabUids: [item.uid] }));
        }
        onClose();
      } catch (error) {
        toast.error(error.message || i18n.t('TOASTS.ERROR_RENAMING'));
      }
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const AdvancedOptions = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex mr-2 text-link cursor-pointer items-center">
        <button
          className="btn-advanced"
          type="button"
        >
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
          title={t(`MODALS.RENAME_ITEM.TITLE_${itemTypeKey}`)}
          handleCancel={onClose}
          hideFooter
        >
          <form className="marrone-form" onSubmit={formik.handleSubmit}>
            <div className="flex flex-col mt-2">
              <label htmlFor="name" className="block font-medium">
                {t(`MODALS.RENAME_ITEM.NAME_LABEL_${itemTypeKey}`)}
              </label>
              <input
                id="collection-item-name"
                type="text"
                name="name"
                ref={inputRef}
                className="block textbox mt-2 w-full"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={(e) => {
                  formik.setFieldValue('name', e.target.value);
                  !isEditing && formik.setFieldValue('filename', sanitizeName(e.target.value));
                }}
                value={formik.values.name || ''}
              />
              {formik.touched.name && formik.errors.name ? <div className="text-red-500" data-testid="form-error">{formik.errors.name}</div> : null}
            </div>

            {showFilesystemName && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="filename" className="flex items-center font-medium">
                    {isFolder ? t('MODALS.COMMON.FOLDER_NAME') : t('MODALS.COMMON.FILE_NAME')} <small className="font-normal text-muted ml-1">{t('MODALS.COMMON.ON_FILESYSTEM')}</small>
                    { isFolder ? (
                      <Help width="300">
                        <p>
                          {t('MODALS.COMMON.FILESYSTEM_FOLDER_HELP')}
                        </p>
                      </Help>
                    ) : (
                      <Help width="300">
                        <p>
                          {t('MODALS.COMMON.FILESYSTEM_FILE_HELP_1')}
                        </p>
                        <p className="mt-2">
                          {t('MODALS.COMMON.FILESYSTEM_FILE_HELP_2')}
                        </p>
                      </Help>
                    )}
                  </label>
                  {isEditing ? (
                    <IconArrowBackUp
                      className="cursor-pointer opacity-50 hover:opacity-80"
                      size={16}
                      strokeWidth={1.5}
                      onClick={() => toggleEditing(false)}
                    />
                  ) : (
                    <IconEdit
                      className="cursor-pointer opacity-50 hover:opacity-80"
                      size={16}
                      strokeWidth={1.5}
                      onClick={() => toggleEditing(true)}
                      data-testid="rename-request-edit-icon"
                    />
                  )}
                </div>
                {isEditing ? (
                  <div className="relative flex flex-row gap-1 items-center justify-between">
                    <input
                      id="file-name"
                      type="text"
                      name="filename"
                      placeholder={isFolder ? t('MODALS.COMMON.FOLDER_NAME') : t('MODALS.COMMON.FILE_NAME')}
                      className="!pr-10 block textbox mt-2 w-full"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      onChange={formik.handleChange}
                      value={formik.values.filename || ''}
                    />
                    {itemType !== 'folder' && <span className="absolute right-2 top-4 flex justify-center items-center file-extension">.{collection?.format || 'bru'}</span>}
                  </div>
                ) : (
                  <div className="relative flex flex-row gap-1 items-center justify-between">
                    <PathDisplay
                      baseName={formik.values.filename}
                    />
                  </div>
                )}
                {formik.touched.filename && formik.errors.filename ? (
                  <div className="text-red-500" data-testid="form-error">{formik.errors.filename}</div>
                ) : null}
              </div>
            )}
            <div className="flex justify-between items-center mt-8 marrone-modal-footer">
              <div className="flex advanced-options">
                <Dropdown onCreate={onDropdownCreate} icon={<AdvancedOptions />} placement="bottom-start">
                  <div
                    className="dropdown-item"
                    key="show-filesystem-name"
                    onClick={(e) => {
                      dropdownTippyRef.current.hide();
                      toggleShowFilesystemName(!showFilesystemName);
                    }}
                  >
                    {showFilesystemName ? t('MODALS.COMMON.HIDE_FILESYSTEM_NAME') : t('MODALS.COMMON.SHOW_FILESYSTEM_NAME')}
                  </div>
                </Dropdown>
              </div>
              <div className="flex justify-end">
                <Button type="button" color="secondary" variant="ghost" onClick={onClose} className="mr-2">
                  {t('MODALS.COMMON.CANCEL')}
                </Button>
                <Button type="submit" data-testid="rename-item-button">
                  {t('MODALS.COMMON.RENAME')}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default RenameCollectionItem;
