'use client';

import {
  useCallback,
  useEffect,
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
import { realtimeBus } from '@/lib/flow-console/realtime';
import type {
  AccessSession,
  ComposeAttachment,
  ComposeFields,
  ContactPreview,
  DraftSaveState,
  FlowConfig,
  MailMessage,
  StatusMessage,
  UndoSendState,
} from '@/lib/flow-console/types';

export interface UseComposeOptions {
  accessSession: AccessSession;
  config: FlowConfig;
  onStatusChange: (status: StatusMessage | null) => void;
  onMailSentSuccess?: () => void;
}

const DRAFT_STORAGE_KEY = 'flow-compose-draft-backup-v1';

function readSavedDraft(): {
  composeFields?: ComposeFields;
  recipientEmails?: string[];
  composeAttachments?: ComposeAttachment[];
  draftId?: string | null;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as {
      composeFields?: ComposeFields;
      recipientEmails?: string[];
      composeAttachments?: ComposeAttachment[];
      draftId?: string | null;
    }) : null;
  } catch {
    return null;
  }
}

export function useCompose({
  accessSession,
  config,
  onStatusChange,
  onMailSentSuccess,
}: UseComposeOptions) {
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeExpanded, setComposeExpanded] = useState(false);
  const [composeFields, setComposeFields] = useState<ComposeFields>(() => {
    const saved = readSavedDraft();
    return saved?.composeFields || initialCompose;
  });
  const [composeAttachments, setComposeAttachments] = useState<ComposeAttachment[]>(() => {
    const saved = readSavedDraft();
    return saved?.composeAttachments || [];
  });
  const [recipientEmails, setRecipientEmails] = useState<string[]>(() => {
    const saved = readSavedDraft();
    return saved?.recipientEmails || [];
  });
  const [draftId, setDraftId] = useState<string | null>(() => {
    const saved = readSavedDraft();
    return saved?.draftId || null;
  });
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [formatToolbarOpen, setFormatToolbarOpen] = useState(true);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const [sendOptionsOpen, setSendOptionsOpen] = useState(false);

  // Draft Auto-Save State
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>({
    status: 'idle',
    lastSavedAt: null,
  });
  const lastSavedContentRef = useRef<string>('');

  // Undo Send State
  const [undoSendState, setUndoSendState] = useState<UndoSendState | null>(null);
  const pendingSendRef = useRef<UndoSendState | null>(null);

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
    setDraftSaveState({ status: 'idle', lastSavedAt: null });
    lastSavedContentRef.current = '';
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    if (composeEditorRef.current) composeEditorRef.current.innerHTML = '';
  }, []);

  const hasDraftContent =
    composeRecipients.length > 0 ||
    composeFields.subject.trim() ||
    composeFields.body.trim() ||
    composeAttachments.length > 0;

  // Synchronize editor innerHTML if editor mounts with restored draft body
  useEffect(() => {
    if (composeOpen && composeEditorRef.current && composeFields.body) {
      if (!composeEditorRef.current.innerHTML) {
        composeEditorRef.current.innerHTML = composeFields.body;
      }
    }
  }, [composeOpen, composeFields.body]);

  // Periodic draft auto-save interval (every 4 seconds) & local backup
  useEffect(() => {
    if (!composeOpen || !canWrite) return;

    const interval = setInterval(() => {
      const body = currentComposeBody();
      const recipients = composeRecipients;
      const hasContent =
        recipients.length > 0 ||
        composeFields.subject.trim().length > 0 ||
        body.trim().length > 0;

      if (!hasContent || isSavingDraft || isSending) return;

      const currentContent = JSON.stringify({
        body,
        from: composeFrom,
        subject: composeFields.subject,
        to: recipients,
      });

      // Also persist to localStorage backup immediately
      try {
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            composeAttachments,
            composeFields: { ...composeFields, body },
            draftId,
            recipientEmails,
            updatedAt: Date.now(),
          }),
        );
      } catch {}

      // If content hasn't changed since last server save, skip network request
      if (currentContent === lastSavedContentRef.current) return;

      setDraftSaveState(prev => ({ ...prev, status: 'saving' }));
      lastSavedContentRef.current = currentContent;

      fetch(apiUrl('/flow/drafts'), {
        body: JSON.stringify({
          body,
          ...(draftId ? { draftId } : {}),
          from: composeFrom,
          subject: composeFields.subject,
          to: recipients,
        }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...flowHeaders() },
        method: 'POST',
      })
        .then(res => responseJson<{ draftId?: string }>(res))
        .then(saved => {
          if (saved.draftId && !draftId) {
            setDraftId(saved.draftId);
          }
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setDraftSaveState({ lastSavedAt: time, status: 'saved' });
        })
        .catch(err => {
          setDraftSaveState({
            error: err instanceof Error ? err.message : 'Draft sync error',
            lastSavedAt: null,
            status: 'error',
          });
        });
    }, 4000);

    return () => clearInterval(interval);
  }, [
    canWrite,
    composeAttachments,
    composeFields,
    composeFrom,
    composeOpen,
    composeRecipients,
    currentComposeBody,
    draftId,
    isSavingDraft,
    isSending,
    recipientEmails,
  ]);

  // Force manual draft save (Cmd/Ctrl + S)
  const saveDraftNow = useCallback(async () => {
    if (!canWrite || isSavingDraft) return;
    const body = currentComposeBody();
    const recipients = composeRecipients;
    const hasContent =
      recipients.length > 0 ||
      composeFields.subject.trim().length > 0 ||
      body.trim().length > 0;

    if (!hasContent) return;

    setDraftSaveState(prev => ({ ...prev, status: 'saving' }));
    setIsSavingDraft(true);
    try {
      const saved = await fetch(apiUrl('/flow/drafts'), {
        body: JSON.stringify({
          body,
          ...(draftId ? { draftId } : {}),
          from: composeFrom,
          subject: composeFields.subject,
          to: recipients,
        }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...flowHeaders() },
        method: 'POST',
      }).then(res => responseJson<{ draftId?: string }>(res));

      if (saved.draftId && !draftId) {
        setDraftId(saved.draftId);
      }
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setDraftSaveState({ lastSavedAt: time, status: 'saved' });
      onStatusChange({ kind: 'success', text: `Draft saved at ${time}` });
    } catch (error) {
      setDraftSaveState(prev => ({ ...prev, status: 'error' }));
      onStatusChange({
        kind: 'info',
        text: error instanceof Error ? error.message : 'Draft save failed.',
      });
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    canWrite,
    composeFields.subject,
    composeFrom,
    composeRecipients,
    currentComposeBody,
    draftId,
    isSavingDraft,
    onStatusChange,
  ]);

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

  // Execute actual network send
  const executeSend = useCallback(
    async (state: UndoSendState) => {
      pendingSendRef.current = null;
      setUndoSendState(null);
      sendLockRef.current = true;
      setIsSending(true);

      try {
        const response = await fetch(apiUrl('/flow/send'), {
          body: JSON.stringify({
            action: 'campaign',
            attachments: state.attachments.map(attachment => ({
              content: attachment.content,
              contentId: attachment.contentId,
              contentType: attachment.contentType,
              filename: attachment.filename,
              size: attachment.size,
            })),
            bodyFormat: 'html',
            from: state.from,
            html: state.body,
            recipients: state.recipients.map(email => ({
              email,
              firstName: email.split('@')[0],
              tags: ['manual'],
            })),
            subject: state.subject,
            tags: ['flow'],
          }),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...flowHeaders() },
          method: 'POST',
        });
        const data = await responseJson<{ count?: number; messageId?: string }>(response);

        // Optimistically publish new message to realtimeBus for all tabs
        const sentMessage: MailMessage = {
          attachments: state.attachments.length,
          body: state.body,
          clickCount: 0,
          contentLoaded: true,
          date: new Date().toISOString(),
          direction: 'outbound',
          folder: 'sent',
          from: state.from,
          html: state.body,
          id: data.messageId || `sent_${Date.now()}`,
          name: 'Flow Mail',
          openCount: 0,
          preview: state.body.replace(/<[^>]+>/g, '').slice(0, 120),
          references: [],
          starred: false,
          subject: state.subject || '(no subject)',
          to: state.recipients,
          unread: false,
        };
        realtimeBus.publish({ type: 'NEW_MESSAGE', message: sentMessage });

        // Clean up draft if this was an existing draft
        if (state.draftId) {
          fetch(apiUrl(`/flow/drafts/${state.draftId}`), {
            credentials: 'include',
            headers: flowHeaders(),
            method: 'DELETE',
          }).catch(() => {});
        }

        try {
          window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {}

        onStatusChange({
          kind: 'success',
          text: `Email sent to ${data.count || state.recipients.length} recipient${
            (data.count || state.recipients.length) === 1 ? '' : 's'
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
    [onMailSentSuccess, onStatusChange, resetCompose],
  );

  // Undo Send handlers
  const undoSend = useCallback(() => {
    if (!pendingSendRef.current) return;
    const state = pendingSendRef.current;
    clearTimeout(state.timeoutId);
    pendingSendRef.current = null;
    setUndoSendState(null);

    // Restore compose state
    setComposeFields({
      body: state.body,
      from: state.from,
      subject: state.subject,
      to: '',
    });
    setRecipientEmails(state.recipientEmails);
    setComposeAttachments(state.attachments);
    setDraftId(state.draftId);
    setComposeOpen(true);

    window.requestAnimationFrame(() => {
      if (composeEditorRef.current) {
        composeEditorRef.current.innerHTML = state.body;
      }
    });

    onStatusChange({ kind: 'info', text: 'Sending cancelled. Draft restored.' });
  }, [onStatusChange]);

  const sendImmediately = useCallback(() => {
    if (!pendingSendRef.current) return;
    const state = pendingSendRef.current;
    clearTimeout(state.timeoutId);
    void executeSend(state);
  }, [executeSend]);

  // Window beforeunload flush for pending send
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingSendRef.current) {
        const state = pendingSendRef.current;
        clearTimeout(state.timeoutId);
        void executeSend(state);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [executeSend]);

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

      // Snapshot compose state for Undo Send (5 second grace period)
      const currentAttachments = [...composeAttachments];
      const currentFields = { ...composeFields };
      const currentRecipientEmails = [...recipientEmails];
      const currentDraftId = draftId;
      const currentFrom = composeFrom;

      // Close composer immediately for instant feel
      setComposeOpen(false);

      const sendId = `send_${Date.now()}`;
      const timeoutId = setTimeout(() => {
        if (pendingSendRef.current?.id === sendId) {
          void executeSend(pendingSendRef.current);
        }
      }, 5000);

      const pendingState: UndoSendState = {
        attachments: currentAttachments,
        body,
        draftId: currentDraftId,
        from: currentFrom,
        id: sendId,
        recipientEmails: currentRecipientEmails,
        recipients,
        secondsRemaining: 5,
        subject: currentFields.subject,
        timeoutId,
      };

      pendingSendRef.current = pendingState;
      setUndoSendState(pendingState);
    },
    [
      canWrite,
      composeAttachments,
      composeFields,
      composeFrom,
      composeRecipients,
      currentComposeBody,
      draftId,
      executeSend,
      onStatusChange,
      recipientEmails,
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
    draftSaveState,
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
    saveDraftNow,
    sendImmediately,
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
    undoSend,
    undoSendState,
    updateComposeField,
  };
}
