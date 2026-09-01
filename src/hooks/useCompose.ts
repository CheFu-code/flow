'use client';

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { apiUrl, flowHeaders } from '@/lib/api';
import {
  escapeEditorHtml,
  fileToComposeAttachment,
  normalizeUrl,
  parseRecipients,
} from '@/lib/flow-console/compose';
import {
  initialCompose,
  maxAttachmentBytes,
} from '@/lib/flow-console/constants';
import { responseJson } from '@/lib/flow-console/http';
import type {
  AccessSession,
  ComposeAttachment,
  ComposeFields,
  ContactPreview,
  FlowConfig,
  StatusMessage,
} from '@/lib/flow-console/types';

export interface UseComposeOptions {
  accessSession: AccessSession;
  config: FlowConfig;
  onStatusChange: (status: StatusMessage | null) => void;
  onMailSentSuccess?: () => void;
}

export function useCompose({
  accessSession,
  config,
  onStatusChange,
  onMailSentSuccess,
}: UseComposeOptions) {
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeExpanded, setComposeExpanded] = useState(false);
  const [composeFields, setComposeFields] = useState<ComposeFields>(initialCompose);
  const [composeAttachments, setComposeAttachments] = useState<ComposeAttachment[]>([]);
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [formatToolbarOpen, setFormatToolbarOpen] = useState(true);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const [sendOptionsOpen, setSendOptionsOpen] = useState(false);

  const composeEditorRef = useRef<HTMLDivElement | null>(null);
  const composeFormRef = useRef<HTMLFormElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const sendLockRef = useRef(false);

  const canWrite = accessSession.permission !== 'read';
  const composeFrom = composeFields.from || config.defaultFrom;

  const composeRecipients = useMemo(
    () => [
      ...new Set([
        ...recipientEmails,
        ...parseRecipients(composeFields.to),
      ]),
    ],
    [composeFields.to, recipientEmails],
  );

  const totalAttachmentBytes = useMemo(
    () =>
      composeAttachments.reduce(
        (total, attachment) => total + attachment.size,
        0,
      ),
    [composeAttachments],
  );

  const updateComposeField = useCallback(
    (field: keyof ComposeFields) =>
      (
        event: ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => {
        setComposeFields(current => ({
          ...current,
          [field]: event.target.value,
        }));
      },
    [],
  );

  const currentComposeBody = useCallback(
    () => composeEditorRef.current?.innerHTML || composeFields.body,
    [composeFields.body],
  );

  const syncComposeBody = useCallback(() => {
    const body = currentComposeBody();
    setComposeFields(current => ({ ...current, body }));
  }, [currentComposeBody]);

  const focusComposeEditor = useCallback(() => {
    composeEditorRef.current?.focus();
  }, []);

  const runEditorCommand = useCallback(
    (command: string, value?: string) => {
      if (isSending) return;
      focusComposeEditor();
      document.execCommand(command, false, value);
      syncComposeBody();
    },
    [focusComposeEditor, isSending, syncComposeBody],
  );

  const insertEditorHtml = useCallback(
    (html: string) => {
      if (isSending) return;
      focusComposeEditor();
      document.execCommand('insertHTML', false, html);
      syncComposeBody();
    },
    [focusComposeEditor, isSending, syncComposeBody],
  );

  const insertEditorText = useCallback(
    (text: string) => {
      if (isSending) return;
      focusComposeEditor();
      document.execCommand('insertText', false, text);
      syncComposeBody();
    },
    [focusComposeEditor, isSending, syncComposeBody],
  );

  const insertEditorList = useCallback(
    (ordered: boolean) => {
      const editor = composeEditorRef.current;
      if (!editor || isSending) return;

      focusComposeEditor();
      const selection = window.getSelection();
      const selectedRange =
        selection?.rangeCount && selection.anchorNode
          ? selection.getRangeAt(0)
          : null;
      const range =
        selectedRange && editor.contains(selectedRange.commonAncestorContainer)
          ? selectedRange
          : document.createRange();

      if (!selectedRange || !editor.contains(selectedRange.commonAncestorContainer)) {
        range.selectNodeContents(editor);
        range.collapse(false);
      }

      const selectedText =
        selection && editor.contains(range.commonAncestorContainer)
          ? selection.toString()
          : '';
      const lines = selectedText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
      const items = lines.length ? lines : [''];
      const list = document.createElement(ordered ? 'ol' : 'ul');

      items.forEach(line => {
        const item = document.createElement('li');
        if (line) {
          item.textContent = line;
        } else {
          item.appendChild(document.createElement('br'));
        }
        list.appendChild(item);
      });

      range.deleteContents();
      range.insertNode(list);

      const lastItem = list.lastElementChild;
      if (lastItem && selection) {
        const caret = document.createRange();
        caret.selectNodeContents(lastItem);
        caret.collapse(false);
        selection.removeAllRanges();
        selection.addRange(caret);
      }

      syncComposeBody();
    },
    [focusComposeEditor, isSending, syncComposeBody],
  );

  const handleEditorPaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      insertEditorText(event.clipboardData.getData('text/plain'));
    },
    [insertEditorText],
  );

  const promptForLink = useCallback(() => {
    const rawUrl = window.prompt('Paste a link URL');
    const url = rawUrl ? normalizeUrl(rawUrl) : '';
    if (!url) return;

    const selection = window.getSelection();
    if (selection?.toString()) {
      runEditorCommand('createLink', url);
      return;
    }

    insertEditorHtml(
      `<a href="${escapeEditorHtml(url)}">${escapeEditorHtml(url)}</a>`,
    );
  }, [insertEditorHtml, runEditorCommand]);

  const insertDriveLink = useCallback(() => {
    const rawUrl = window.prompt('Paste the Drive or file URL');
    const url = rawUrl ? normalizeUrl(rawUrl) : '';
    if (!url) return;

    insertEditorHtml(
      `<a href="${escapeEditorHtml(url)}">Attached file</a>`,
    );
  }, [insertEditorHtml]);

  const insertConfidentialNotice = useCallback(() => {
    insertEditorHtml(
      '<div style="border-left:3px solid #0f766e;padding-left:12px;color:#0f766e;"><strong>Confidential</strong><br />This message is intended only for its recipients. Please do not share it without permission.</div><br />',
    );
  }, [insertEditorHtml]);

  const insertSignature = useCallback(() => {
    insertEditorHtml('<br /><br />Best regards,<br />CHEFU Technologies');
  }, [insertEditorHtml]);

  const insertDivider = useCallback(() => {
    insertEditorHtml('<hr /><br />');
  }, [insertEditorHtml]);

  const insertVariable = useCallback(
    (name: string) => {
      insertEditorText(`{{${name}}}`);
      setMoreToolsOpen(false);
    },
    [insertEditorText],
  );

  const clearEditorFormatting = useCallback(() => {
    runEditorCommand('removeFormat');
    runEditorCommand('unlink');
  }, [runEditorCommand]);

  const removeAllFormatting = useCallback(() => {
    const text = composeEditorRef.current?.innerText || '';
    if (composeEditorRef.current) {
      composeEditorRef.current.textContent = text;
    }
    syncComposeBody();
    setMoreToolsOpen(false);
  }, [syncComposeBody]);

  const addFilesToCompose = useCallback(
    async (files: File[], inline = false) => {
      if (!files.length) return;

      const nextSize = files.reduce((total, file) => total + file.size, 0);
      if (totalAttachmentBytes + nextSize > maxAttachmentBytes) {
        onStatusChange({
          kind: 'info',
          text: 'Attachments must stay under 24 MB before encoding.',
        });
        return;
      }

      try {
        const nextAttachments = await Promise.all(
          files.map(file => fileToComposeAttachment(file, inline)),
        );

        setComposeAttachments(current => [...current, ...nextAttachments]);

        if (inline) {
          nextAttachments.forEach(attachment => {
            insertEditorHtml(
              `<img src="cid:${attachment.contentId}" alt="${escapeEditorHtml(
                attachment.filename,
              )}" style="max-width:100%;border-radius:8px;" /><br />`,
            );
          });
        }

        onStatusChange({
          kind: 'success',
          text: `${files.length} file${files.length === 1 ? '' : 's'} added.`,
        });
      } catch (error) {
        onStatusChange({
          kind: 'info',
          text: error instanceof Error ? error.message : 'File could not be added.',
        });
      }
    },
    [insertEditorHtml, onStatusChange, totalAttachmentBytes],
  );

  const removeAttachment = useCallback((id: string) => {
    setComposeAttachments(current =>
      current.filter(attachment => attachment.id !== id),
    );
  }, []);

  const addRecipients = useCallback(() => {
    const recipients = parseRecipients(composeFields.to);

    if (!recipients.length) {
      onStatusChange({
        kind: 'info',
        text: 'Type a valid email address before adding it.',
      });
      return;
    }

    setRecipientEmails(current => [...new Set([...current, ...recipients])]);
    setComposeFields(current => ({ ...current, to: '' }));
  }, [composeFields.to, onStatusChange]);

  const removeRecipient = useCallback((email: string) => {
    setRecipientEmails(current => current.filter(item => item !== email));
  }, []);

  const addRecipientsFromKeyboard = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      addRecipients();
    },
    [addRecipients],
  );

  const resetCompose = useCallback(() => {
    setDraftId(null);
    setComposeFields(initialCompose);
    setComposeAttachments([]);
    setComposeExpanded(false);
    setEmojiPickerOpen(false);
    setMoreToolsOpen(false);
    setRecipientEmails([]);
    setSendOptionsOpen(false);
    if (composeEditorRef.current) composeEditorRef.current.innerHTML = '';
  }, []);

  const hasDraftContent =
    composeRecipients.length > 0 ||
    composeFields.subject.trim() ||
    composeFields.body.trim() ||
    composeAttachments.length > 0;

  const saveDraftAndClose = useCallback(async () => {
    if (!canWrite || isSavingDraft) {
      setComposeOpen(false);
      resetCompose();
      return;
    }

    const body = currentComposeBody();

    if (hasDraftContent) {
      setIsSavingDraft(true);
      try {
        const saved = await fetch(apiUrl('/flow/drafts'), {
          body: JSON.stringify({
            body,
            ...(draftId ? { draftId } : {}),
            from: composeFrom,
            subject: composeFields.subject,
            to: composeRecipients,
          }),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...flowHeaders() },
          method: 'POST',
        }).then(response => responseJson<{ draftId?: string }>(response));
        if (saved.draftId) setDraftId(saved.draftId);
        onStatusChange({ kind: 'success', text: 'Draft saved.' });
      } catch (error) {
        onStatusChange({
          kind: 'info',
          text: error instanceof Error ? error.message : 'Draft save failed.',
        });
      } finally {
        setIsSavingDraft(false);
      }
    }

    setComposeOpen(false);
    resetCompose();
  }, [
    canWrite,
    composeFields.subject,
    composeFrom,
    composeRecipients,
    currentComposeBody,
    draftId,
    hasDraftContent,
    isSavingDraft,
    onStatusChange,
    resetCompose,
  ]);

  const discardCompose = useCallback(() => {
    setComposeOpen(false);
    resetCompose();
  }, [resetCompose]);

  const openComposeToContact = useCallback(
    (contact: ContactPreview, subject?: string) => {
      if (!canWrite || !contact.email) return;

      resetCompose();
      setRecipientEmails([contact.email]);
      if (subject) {
        setComposeFields({ ...initialCompose, subject });
      }
      setComposeOpen(true);
      onStatusChange(null);
    },
    [canWrite, onStatusChange, resetCompose],
  );

  const submitCompose = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canWrite || sendLockRef.current) return;

      const recipients = composeRecipients;
      const body = currentComposeBody();

      if (!recipients.length) {
        onStatusChange({ kind: 'info', text: 'Enter at least one valid recipient.' });
        return;
      }

      sendLockRef.current = true;
      setIsSending(true);
      try {
        const response = await fetch(apiUrl('/flow/send'), {
          body: JSON.stringify({
            action: 'campaign',
            attachments: composeAttachments.map(attachment => ({
              content: attachment.content,
              contentId: attachment.contentId,
              contentType: attachment.contentType,
              filename: attachment.filename,
              size: attachment.size,
            })),
            bodyFormat: 'html',
            from: composeFrom,
            html: body,
            recipients: recipients.map(email => ({
              email,
              firstName: email.split('@')[0],
              tags: ['manual'],
            })),
            subject: composeFields.subject,
            tags: ['flow'],
          }),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...flowHeaders() },
          method: 'POST',
        });
        const data = await responseJson<{ count?: number }>(response);

        setComposeOpen(false);
        onStatusChange({
          kind: 'success',
          text: `Email sent to ${data.count || recipients.length} recipient${
            (data.count || recipients.length) === 1 ? '' : 's'
          }.`,
        });
        resetCompose();
        onMailSentSuccess?.();
      } catch (error) {
        onStatusChange({
          kind: 'info',
          text: error instanceof Error ? error.message : 'Send failed.',
        });
      } finally {
        sendLockRef.current = false;
        setIsSending(false);
      }
    },
    [
      canWrite,
      composeAttachments,
      composeFields.subject,
      composeFrom,
      composeRecipients,
      currentComposeBody,
      onMailSentSuccess,
      onStatusChange,
      resetCompose,
    ],
  );

  return {
    addFilesToCompose,
    addRecipients,
    addRecipientsFromKeyboard,
    attachmentInputRef,
    clearEditorFormatting,
    composeAttachments,
    composeEditorRef,
    composeExpanded,
    composeFields,
    composeFormRef,
    composeFrom,
    composeOpen,
    composeRecipients,
    currentComposeBody,
    discardCompose,
    draftId,
    emojiPickerOpen,
    focusComposeEditor,
    formatToolbarOpen,
    handleEditorPaste,
    hasDraftContent,
    imageInputRef,
    insertConfidentialNotice,
    insertDivider,
    insertDriveLink,
    insertEditorHtml,
    insertEditorList,
    insertEditorText,
    insertSignature,
    insertVariable,
    isSavingDraft,
    isSending,
    moreToolsOpen,
    openComposeToContact,
    promptForLink,
    recipientEmails,
    removeAllFormatting,
    removeAttachment,
    removeRecipient,
    resetCompose,
    runEditorCommand,
    saveDraftAndClose,
    sendOptionsOpen,
    setComposeAttachments,
    setComposeExpanded,
    setComposeFields,
    setComposeOpen,
    setDraftId,
    setEmojiPickerOpen,
    setFormatToolbarOpen,
    setMoreToolsOpen,
    setRecipientEmails,
    setSendOptionsOpen,
    submitCompose,
    syncComposeBody,
    totalAttachmentBytes,
    updateComposeField,
  };
}
