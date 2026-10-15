import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { isSafeUrl } from 'utils/url/index';
import i18n from '../../../../i18n';

const useLinkHandlers = (editor) => {
  const handleLinkSubmit = useCallback(({ text, url }) => {
    if (!editor) return;

    const trimmedUrl = url.trim();

    if (!isSafeUrl(trimmedUrl)) {
      toast.error(i18n.t('TOASTS.LINK_NOT_ALLOWED'));
      return;
    }

    const chain = editor.chain().focus();
    if (editor.isActive('link')) {
      chain.extendMarkRange('link');
    }

    chain
      .insertContent({
        type: 'text',
        text: text || trimmedUrl,
        marks: [{ type: 'link', attrs: { href: trimmedUrl } }]
      })
      .run();
  }, [editor]);

  const handleUnlink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  }, [editor]);

  return { handleLinkSubmit, handleUnlink };
};

export default useLinkHandlers;
