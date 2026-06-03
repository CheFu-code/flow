'use client';

import {
  AtSign,
  ArrowLeft,
  Bold,
  CaseSensitive,
  ChevronDown,
  CircleHelp,
  Clock3,
  EllipsisVertical,
  FileText,
  Grid3X3,
  Image as ImageIcon,
  Italic,
  KeyRound,
  Link2,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Maximize2,
  Menu,
  Minimize2,
  Minus,
  Palette,
  Paperclip,
  PenLine,
  Pencil,
  Quote,
  Redo2,
  RemoveFormatting,
  Search,
  Settings,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Star,
  Strikethrough,
  Triangle,
  Trash2,
  Type,
  Underline,
  Undo2,
  UserCircle,
  X,
} from 'lucide-react';
import type {
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
} from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlowMark } from '@/components/brand/FlowMark';
import { ContactHoverCard } from '@/components/flow-console/ContactHoverCard';
import { apiUrl, flowHeaders } from '@/lib/api';
import {
  composeEmojis,
  defaultConfig,
  emptyFolderCounts,
  emptyStates,
  folderItems,
  fontFamilies,
  fontSizes,
  initialCompose,
  maxAttachmentBytes,
} from '@/lib/flow-console/constants';
import {
  escapeEditorHtml,
  fileToComposeAttachment,
  normalizeUrl,
  parseRecipients,
} from '@/lib/flow-console/compose';
import {
  formatFileSize,
  formatListDate,
  formatMessageDate,
  formatSessionExpiry,
  getFolderLabel,
  getInitial,
  getMessageFolderLabel,
  sentTrackingKind,
  sentTrackingLabel,
} from '@/lib/flow-console/format';
import { responseJson } from '@/lib/flow-console/http';
import {
  backendFolderFor,
  contactFromMessage,
  groupMessagesIntoThreads,
  isLastVisibleMessage,
  mapCounts,
  threadDeleteCopy,
  toMailMessage,
} from '@/lib/flow-console/mail';
import { renderReaderMessageHtml } from '@/lib/flow-console/reader';
import { parseServerSentEvent } from '@/lib/flow-console/sse';
import type {
  BackendMessagesResponse,
  ComposeAttachment,
  ComposeFields,
  ContactPreview,
  DeleteConfirm,
  FlowConfig,
  FlowConsoleProps,
  MailFolder,
  MailMessage,
  StatusMessage,
} from '@/lib/flow-console/types';
import styles from './FlowConsole.module.css';

export default function FlowConsole({
  accessSession,
  onLock,
}: FlowConsoleProps) {
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const composeEditorRef = useRef<HTMLDivElement | null>(null);
  const composeFormRef = useRef<HTMLFormElement | null>(null);
  const deleteLockRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const sendLockRef = useRef(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeFolder, setActiveFolder] = useState<MailFolder>('inbox');
  const [composeAttachments, setComposeAttachments] = useState<
    ComposeAttachment[]
  >([]);
  const [composeExpanded, setComposeExpanded] = useState(false);
  const [composeFields, setComposeFields] =
    useState<ComposeFields>(initialCompose);
  const [composeOpen, setComposeOpen] = useState(false);
  const [config, setConfig] = useState<FlowConfig>(defaultConfig);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(
    null,
  );
  const [folderCounts, setFolderCounts] =
    useState<Record<MailFolder, number>>(emptyFolderCounts);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [formatToolbarOpen, setFormatToolbarOpen] = useState(true);
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [query, setQuery] = useState('');
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [refreshSeq, setRefreshSeq] = useState(0);
  const [sendOptionsOpen, setSendOptionsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const allThreads = useMemo(
    () => groupMessagesIntoThreads(messages),
    [messages],
  );

  const visibleThreads = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return allThreads.filter(thread => {
      if (!cleanQuery) return true;

      return thread.allMessages
        .flatMap(message => [
          message.body,
          message.from,
          message.name,
          message.preview,
          message.subject,
          message.to.join(' '),
        ])
        .join(' ')
        .toLowerCase()
        .includes(cleanQuery);
    });
  }, [allThreads, query]);

  const selectedThread = useMemo(
    () => allThreads.find(thread => thread.id === selectedMessageId) || null,
    [allThreads, selectedMessageId],
  );

  const allVisibleSelected =
    visibleThreads.length > 0 &&
    visibleThreads.every(thread => selectedIds.includes(thread.id));

  const selectedFolderTitle = getFolderLabel(activeFolder);
  const activeEmptyState = emptyStates[activeFolder];
  const accountInitial = getInitial(accessSession.keyLabel);
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
  const sessionExpiry = formatSessionExpiry(accessSession.expiresAt);

  useEffect(() => {
    if (!accountOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (accountMenuRef.current?.contains(event.target)) return;
      setAccountOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
    };
  }, [accountOpen]);

  useEffect(() => {
    let active = true;

    fetch(apiUrl('/flow/config'), {
      credentials: 'include',
      headers: flowHeaders(),
    })
      .then(response => responseJson<FlowConfig>(response))
      .then(nextConfig => {
        if (active) setConfig({ ...defaultConfig, ...nextConfig });
      })
      .catch(error => {
        if (!active) return;
        setStatus({
          kind: 'info',
          text:
            error instanceof Error
              ? error.message
              : 'Flow config could not be loaded.',
        });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetch(apiUrl(`/flow/messages?folder=${backendFolderFor(activeFolder)}`), {
      credentials: 'include',
      headers: flowHeaders(),
    })
      .then(response => responseJson<BackendMessagesResponse>(response))
      .then(data => {
        if (!active) return;
        setMessages((data.messages || []).map(toMailMessage));
        setFolderCounts(mapCounts(data.counts));
      })
      .catch(error => {
        if (!active) return;
        setMessages([]);
        setStatus({
          kind: 'info',
          text:
            error instanceof Error
              ? error.message
              : 'Messages could not be loaded.',
        });
      })
      .finally(() => {
        if (active) setIsLoadingMessages(false);
      });

    return () => {
      active = false;
    };
  }, [activeFolder, refreshSeq]);

  useEffect(() => {
    const controller = new AbortController();
    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const applyMessages = (data: BackendMessagesResponse) => {
      setMessages((data.messages || []).map(toMailMessage));
      setFolderCounts(mapCounts(data.counts));
      setIsLoadingMessages(false);
    };

    const handleEvent = (rawEvent: string) => {
      const parsed = parseServerSentEvent(rawEvent.trim());
      if (parsed.event !== 'messages' || !parsed.data) return;

      try {
        applyMessages(JSON.parse(parsed.data) as BackendMessagesResponse);
      } catch {
        // Ignore malformed stream frames; the normal fetch path remains active.
      }
    };

    const connect = async () => {
      try {
        const response = await fetch(
          apiUrl(`/flow/messages/stream?folder=${backendFolderFor(activeFolder)}`),
          {
            credentials: 'include',
            headers: { Accept: 'text/event-stream', ...flowHeaders() },
            signal: controller.signal,
          },
        );

        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          events.forEach(handleEvent);
        }
      } catch {
        if (stopped || controller.signal.aborted) return;
      }

      if (!stopped) {
        retryTimer = setTimeout(() => {
          void connect();
        }, 5_000);
      }
    };

    void connect();

    return () => {
      stopped = true;
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [activeFolder]);

  const changeFolder = (folder: MailFolder) => {
    setIsLoadingMessages(true);
    setActiveFolder(folder);
    setSelectedIds([]);
    setSelectedMessageId(null);
    setStatus(null);
  };

  const refreshMessages = () => {
    setIsLoadingMessages(true);
    setRefreshSeq(value => value + 1);
  };

  const openMessage = (threadId: string) => {
    const thread = allThreads.find(item => item.id === threadId);
    const unreadMessageIds =
      thread?.allMessages
        .filter(message => message.unread)
        .map(message => message.id) || [];

    setSelectedMessageId(threadId);
    setSelectedIds([]);

    if (!unreadMessageIds.length) return;

    setMessages(current =>
      current.map(item =>
        unreadMessageIds.includes(item.id) ? { ...item, unread: false } : item,
      ),
    );

    Promise.all(
      unreadMessageIds.map(messageId =>
        fetch(apiUrl(`/flow/messages/${messageId}/read`), {
          credentials: 'include',
          headers: flowHeaders(),
          method: 'POST',
        }).then(response => responseJson(response)),
      ),
    ).catch(() => {
      setMessages(current =>
        current.map(item =>
          unreadMessageIds.includes(item.id) ? { ...item, unread: true } : item,
        ),
      );
    });
  };

  const toggleSelected = (messageId: string) => {
    setSelectedIds(current =>
      current.includes(messageId)
        ? current.filter(id => id !== messageId)
        : [...current, messageId],
    );
  };

  const toggleAllSelected = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(event.target.checked ? visibleThreads.map(item => item.id) : []);
  };

  const toggleStarred = (event: MouseEvent, messageId: string) => {
    event.stopPropagation();
    const message = messages.find(item => item.id === messageId);
    const starred = !message?.starred;

    setMessages(current =>
      current.map(item =>
        item.id === messageId ? { ...item, starred } : item,
      ),
    );

    fetch(apiUrl(`/flow/messages/${messageId}/star`), {
      body: JSON.stringify({ starred }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...flowHeaders() },
      method: 'POST',
    })
      .then(response => responseJson<{ starred: boolean }>(response))
      .then(refreshMessages)
      .catch(error => {
        setMessages(current =>
          current.map(item =>
            item.id === messageId
              ? { ...item, starred: Boolean(message?.starred) }
              : item,
          ),
        );
        setStatus({
          kind: 'info',
          text:
            error instanceof Error ? error.message : 'Star update failed.',
        });
      });
  };

  const openMessageFromKeyboard = (
    event: KeyboardEvent<HTMLDivElement>,
    messageId: string,
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openMessage(messageId);
  };

  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const messageIds = visibleThreads
      .filter(thread => selectedIds.includes(thread.id))
      .flatMap(thread => thread.allMessages.map(message => message.id));

    if (!messageIds.length) return;

    const permanent = activeFolder === 'bin';
    setDeleteConfirm({
      ...threadDeleteCopy(messageIds.length, permanent),
      messageIds,
      permanent,
    });
  };

  const requestDeleteOpenMessage = () => {
    if (!selectedThread) return;
    const messageIds = selectedThread.allMessages.map(message => message.id);
    if (!messageIds.length) return;

    const permanent = selectedThread.allMessages.every(
      message => message.folder === 'bin',
    );
    setDeleteConfirm({
      ...threadDeleteCopy(messageIds.length, permanent),
      messageIds,
      permanent,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || deleteLockRef.current) return;

    deleteLockRef.current = true;
    setIsDeleting(true);
    try {
      await Promise.all(
        deleteConfirm.messageIds.map(messageId =>
          fetch(
            apiUrl(
              deleteConfirm.permanent
                ? `/flow/messages/${messageId}`
                : `/flow/messages/${messageId}/trash`,
            ),
            {
              credentials: 'include',
              headers: flowHeaders(),
              method: deleteConfirm.permanent ? 'DELETE' : 'POST',
            },
          ).then(response => responseJson(response)),
        ),
      );

      setStatus(
        deleteConfirm.permanent
          ? { kind: 'success', text: 'Selected conversations deleted.' }
          : { kind: 'info', text: 'Selected conversations moved to Bin.' },
      );
      setDeleteConfirm(null);
      setSelectedIds([]);
      setSelectedMessageId(null);
      refreshMessages();
    } catch (error) {
      setStatus({
        kind: 'info',
        text:
          error instanceof Error ? error.message : 'Delete action failed.',
      });
    } finally {
      deleteLockRef.current = false;
      setIsDeleting(false);
    }
  };

  const updateComposeField =
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
    };

  const currentComposeBody = () =>
    composeEditorRef.current?.innerHTML || composeFields.body;

  const syncComposeBody = () => {
    const body = currentComposeBody();
    setComposeFields(current => ({ ...current, body }));
  };

  const focusComposeEditor = () => {
    composeEditorRef.current?.focus();
  };

  const runEditorCommand = (command: string, value?: string) => {
    if (isSending) return;
    focusComposeEditor();
    document.execCommand(command, false, value);
    syncComposeBody();
  };

  const insertEditorHtml = (html: string) => {
    if (isSending) return;
    focusComposeEditor();
    document.execCommand('insertHTML', false, html);
    syncComposeBody();
  };

  const insertEditorText = (text: string) => {
    if (isSending) return;
    focusComposeEditor();
    document.execCommand('insertText', false, text);
    syncComposeBody();
  };

  const insertEditorList = (ordered: boolean) => {
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
  };

  const handleEditorPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    insertEditorText(event.clipboardData.getData('text/plain'));
  };

  const promptForLink = () => {
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
  };

  const insertDriveLink = () => {
    const rawUrl = window.prompt('Paste the Drive or file URL');
    const url = rawUrl ? normalizeUrl(rawUrl) : '';
    if (!url) return;

    insertEditorHtml(
      `<a href="${escapeEditorHtml(url)}">Attached file</a>`,
    );
  };

  const insertConfidentialNotice = () => {
    insertEditorHtml(
      '<div style="border-left:3px solid #0f766e;padding-left:12px;color:#0f766e;"><strong>Confidential</strong><br />This message is intended only for its recipients. Please do not share it without permission.</div><br />',
    );
  };

  const insertSignature = () => {
    insertEditorHtml('<br /><br />Best regards,<br />CheFu Inc');
  };

  const insertDivider = () => {
    insertEditorHtml('<hr /><br />');
  };

  const insertVariable = (name: string) => {
    insertEditorText(`{{${name}}}`);
    setMoreToolsOpen(false);
  };

  const clearEditorFormatting = () => {
    runEditorCommand('removeFormat');
    runEditorCommand('unlink');
  };

  const removeAllFormatting = () => {
    const text = composeEditorRef.current?.innerText || '';
    if (composeEditorRef.current) {
      composeEditorRef.current.textContent = text;
    }
    syncComposeBody();
    setMoreToolsOpen(false);
  };

  const addFilesToCompose = async (files: File[], inline = false) => {
    if (!files.length) return;

    const nextSize = files.reduce((total, file) => total + file.size, 0);
    if (totalAttachmentBytes + nextSize > maxAttachmentBytes) {
      setStatus({
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

      setStatus({
        kind: 'success',
        text: `${files.length} file${files.length === 1 ? '' : 's'} added.`,
      });
    } catch (error) {
      setStatus({
        kind: 'info',
        text:
          error instanceof Error ? error.message : 'File could not be added.',
      });
    }
  };

  const addAttachmentFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    void addFilesToCompose(files);
  };

  const addInlineImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    void addFilesToCompose(files, true);
  };

  const removeAttachment = (id: string) => {
    setComposeAttachments(current =>
      current.filter(attachment => attachment.id !== id),
    );
  };

  const addRecipients = () => {
    const recipients = parseRecipients(composeFields.to);

    if (!recipients.length) {
      setStatus({
        kind: 'info',
        text: 'Type a valid email address before adding it.',
      });
      return;
    }

    setRecipientEmails(current => [...new Set([...current, ...recipients])]);
    setComposeFields(current => ({ ...current, to: '' }));
  };

  const removeRecipient = (email: string) => {
    setRecipientEmails(current => current.filter(item => item !== email));
  };

  const addRecipientsFromKeyboard = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addRecipients();
  };

  const resetCompose = () => {
    setComposeFields(initialCompose);
    setComposeAttachments([]);
    setComposeExpanded(false);
    setEmojiPickerOpen(false);
    setMoreToolsOpen(false);
    setRecipientEmails([]);
    setSendOptionsOpen(false);
    if (composeEditorRef.current) composeEditorRef.current.innerHTML = '';
  };

  const hasDraftContent =
    composeRecipients.length > 0 ||
    composeFields.subject.trim() ||
    composeFields.body.trim() ||
    composeAttachments.length > 0;

  const saveDraftAndClose = async () => {
    const body = currentComposeBody();

    if (hasDraftContent) {
      try {
        await fetch(apiUrl('/flow/drafts'), {
          body: JSON.stringify({
            body,
            from: composeFrom,
            subject: composeFields.subject,
            to: composeRecipients,
          }),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...flowHeaders() },
          method: 'POST',
        }).then(response => responseJson(response));
        setStatus({ kind: 'success', text: 'Draft saved.' });
        if (activeFolder === 'drafts') refreshMessages();
      } catch (error) {
        setStatus({
          kind: 'info',
          text: error instanceof Error ? error.message : 'Draft save failed.',
        });
      }
    }

    setComposeOpen(false);
    resetCompose();
  };

  const discardCompose = () => {
    setComposeOpen(false);
    resetCompose();
  };

  const openComposeToContact = (contact: ContactPreview) => {
    if (!contact.email) return;

    resetCompose();
    setRecipientEmails([contact.email]);
    setComposeOpen(true);
    setStatus(null);
  };

  const showContactToolStatus = (tool: string, contact: ContactPreview) => {
    setStatus({
      kind: 'info',
      text: `${tool} for ${contact.name} is ready for integration.`,
    });
  };

  const submitCompose = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendLockRef.current) return;

    const recipients = composeRecipients;
    const body = currentComposeBody();

    if (!recipients.length) {
      setStatus({ kind: 'info', text: 'Enter at least one valid recipient.' });
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

      setIsLoadingMessages(true);
      setActiveFolder('sent');
      setSelectedMessageId(null);
      setSelectedIds([]);
      setComposeOpen(false);
      setStatus({
        kind: 'success',
        text: `Email sent to ${data.count || recipients.length} recipient${
          (data.count || recipients.length) === 1 ? '' : 's'
        }.`,
      });
      resetCompose();
      refreshMessages();
    } catch (error) {
      setStatus({
        kind: 'info',
        text: error instanceof Error ? error.message : 'Send failed.',
      });
    } finally {
      sendLockRef.current = false;
      setIsSending(false);
    }
  };

  return (
    <main className={styles.mailShell}>
      <header className={styles.header}>
        <button
          aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          className={styles.iconButton}
          data-tooltip={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          onClick={() => setSidebarOpen(open => !open)}
          type="button"
        >
          <Menu size={22} />
        </button>

        <div className={styles.brand} aria-label="Flow Mail">
          <FlowMark className={styles.brandMark} size="sm" />
          <span className={styles.brandText}>Flow Mail</span>
        </div>

        <label className={styles.searchBox}>
          <Search size={20} />
          <input
            aria-label="Search mail"
            onChange={event => setQuery(event.target.value)}
            placeholder="Search mail"
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear search"
              className={styles.searchAction}
              data-tooltip="Clear search"
              onClick={() => setQuery('')}
              type="button"
            >
              <X size={18} />
            </button>
          ) : (
            <SlidersHorizontal size={20} />
          )}
        </label>

        <div className={styles.headerActions} aria-label="Header actions">
          <button
            aria-label="Help"
            className={styles.iconButton}
            data-tooltip="Help"
            type="button"
          >
            <CircleHelp size={22} />
          </button>
          <button
            aria-label="Settings"
            className={styles.iconButton}
            data-tooltip="Settings"
            type="button"
          >
            <Settings size={22} />
          </button>
          <button
            aria-label="Apps"
            className={styles.iconButton}
            data-tooltip="Apps"
            type="button"
          >
            <Grid3X3 size={22} />
          </button>
          <div className={styles.accountWrap} ref={accountMenuRef}>
            <button
              aria-expanded={accountOpen}
              aria-label="Account details"
              className={styles.accountButton}
              data-tooltip="Account"
              onClick={() => setAccountOpen(open => !open)}
              type="button"
            >
              <span aria-hidden="true">{accountInitial}</span>
              <UserCircle size={25} />
            </button>

            {accountOpen ? (
              <section className={styles.accountMenu} aria-label="Account details">
                <div className={styles.accountSummary}>
                  <span className={styles.accountAvatar} aria-hidden="true">
                    {accountInitial}
                  </span>
                  <div>
                    <strong>{accessSession.keyLabel}</strong>
                    <span>Registered Flow access key</span>
                  </div>
                </div>

                <div className={styles.accountDetail}>
                  <KeyRound size={16} />
                  <div>
                    <span>Authenticated as</span>
                    <strong>{accessSession.keyLabel}</strong>
                  </div>
                </div>

                <div className={styles.accountDetail}>
                  <Clock3 size={16} />
                  <div>
                    <span>Session expires</span>
                    <strong>{sessionExpiry}</strong>
                  </div>
                </div>

                <button
                  className={styles.lockButton}
                  onClick={() => void onLock()}
                  type="button"
                >
                  <LogOut size={16} />
                  Lock Flow
                </button>
              </section>
            ) : null}
          </div>
        </div>
      </header>

      <section
        className={
          sidebarOpen
            ? `${styles.workspace} ${styles.workspaceWithSidebar}`
            : styles.workspace
        }
      >
        {sidebarOpen ? (
          <aside className={styles.sidebar}>
            <button
              className={styles.composeButton}
              onClick={() => setComposeOpen(true)}
              type="button"
            >
              <Pencil size={20} />
              Compose
            </button>

            <nav className={styles.folderList} aria-label="Mail folders">
              {folderItems.map(item => {
                const Icon = item.icon;
                const isActive = activeFolder === item.folder;

                return (
                  <button
                    className={
                      isActive
                        ? `${styles.folderButton} ${styles.folderActive}`
                        : styles.folderButton
                    }
                    key={item.folder}
                    onClick={() => changeFolder(item.folder)}
                    type="button"
                  >
                    <Icon size={18} />
                    <span>{item.title}</span>
                    {folderCounts[item.folder] ? (
                      <strong>{folderCounts[item.folder]}</strong>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </aside>
        ) : null}

        <section className={styles.contentPane}>
          {selectedThread ? (
            <article className={styles.reader}>
              <div className={styles.readerToolbar}>
                <button
                  aria-label="Back to message list"
                  className={styles.readerIconButton}
                  data-tooltip="Back"
                  onClick={() => setSelectedMessageId(null)}
                  type="button"
                >
                  <ArrowLeft size={18} />
                </button>
                <button
                  aria-label="Delete conversation"
                  className={styles.readerIconButton}
                  data-tooltip="Delete"
                  onClick={requestDeleteOpenMessage}
                  type="button"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <h1 className={styles.readerSubject}>
                {selectedThread.subject}
                <span>
                  {selectedThread.count > 1
                    ? `${selectedThread.count} messages`
                    : getMessageFolderLabel(selectedThread.latest.folder)}
                </span>
              </h1>

              <div className={styles.readerThread}>
                {selectedThread.messages.map(message => {
                  const contact = contactFromMessage(message);

                  return (
                    <section className={styles.readerMessage} key={message.id}>
                      <div className={styles.readerBody}>
                        <div className={styles.readerAvatar}>
                          {message.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.readerContent}>
                          <div className={styles.readerMeta}>
                            <div
                              className={styles.contactHover}
                              onClick={event => event.stopPropagation()}
                            >
                              <button
                                className={styles.readerSenderButton}
                                type="button"
                              >
                                <strong>{contact.name}</strong>
                                <span> &lt;{contact.email}&gt;</span>
                              </button>
                              <ContactHoverCard
                                contact={contact}
                                onCompose={openComposeToContact}
                                onTool={showContactToolStatus}
                              />
                            </div>
                            <time>{formatMessageDate(message.date)}</time>
                          </div>
                          {message.direction === 'outbound' ? (
                            <div
                              className={`${styles.trackingLine} ${
                                styles[
                                  `tracking${sentTrackingKind(message)}`
                                ]
                              }`}
                            >
                              {sentTrackingLabel(message)}
                            </div>
                          ) : null}
                          <div
                            className={styles.readerHtml}
                            dangerouslySetInnerHTML={{
                              __html: renderReaderMessageHtml(message),
                            }}
                          />
                          {isLastVisibleMessage(selectedThread, message) &&
                          selectedThread.reactions.length ? (
                            <div
                              className={styles.reactionRow}
                              aria-label="Message reactions"
                            >
                              {selectedThread.reactions.map(reaction => (
                                <span
                                  className={styles.reactionChip}
                                  key={`${reaction.emoji}-${reaction.from}`}
                                >
                                  <span aria-hidden="true">
                                    {reaction.emoji}
                                  </span>
                                  <strong>{reaction.count}</strong>
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            </article>
          ) : (
            <div className={styles.listPane}>
              <div className={styles.listToolbar}>
                <div className={styles.listTools}>
                  <input
                    aria-label="Select all messages"
                    checked={allVisibleSelected}
                    className={styles.checkbox}
                    onChange={toggleAllSelected}
                    type="checkbox"
                  />
                  <button
                    aria-label="Delete selected messages"
                    className={styles.toolbarButton}
                    data-tooltip="Delete"
                    disabled={selectedIds.length === 0}
                    onClick={requestDeleteSelected}
                    type="button"
                  >
                    <Trash2 size={19} />
                  </button>
                </div>
                <div className={styles.folderSummary}>
                  <strong>{selectedFolderTitle}</strong>
                  <span>
                    {visibleThreads.length} of {allThreads.length} shown
                  </span>
                </div>
              </div>

              {status ? (
                <div
                  className={
                    status.kind === 'success'
                      ? `${styles.status} ${styles.statusSuccess}`
                      : styles.status
                  }
                >
                  {status.text}
                </div>
              ) : null}

              <div className={styles.messageList}>
                {isLoadingMessages ? (
                  <div className={styles.loadingState}>Loading mail...</div>
                ) : visibleThreads.length ? (
                  visibleThreads.map(thread => {
                    const message = thread.latest;
                    const contact = contactFromMessage(message);

                    return (
                    <div
                      className={
                        thread.unread
                          ? `${styles.messageRow} ${styles.messageUnread}`
                          : styles.messageRow
                      }
                      key={thread.id}
                      onClick={() => openMessage(thread.id)}
                      onKeyDown={event => openMessageFromKeyboard(event, thread.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <input
                        aria-label={`Select ${thread.subject}`}
                        checked={selectedIds.includes(thread.id)}
                        className={styles.checkbox}
                        onChange={() => toggleSelected(thread.id)}
                        onClick={event => event.stopPropagation()}
                        type="checkbox"
                      />
                      <button
                        aria-label={
                          message.starred
                            ? 'Remove star from message'
                            : 'Star message'
                        }
                        className={
                          message.starred
                            ? `${styles.rowStar} ${styles.rowStarActive}`
                            : styles.rowStar
                        }
                        data-tooltip={message.starred ? 'Unstar' : 'Star'}
                        onClick={event => toggleStarred(event, message.id)}
                        type="button"
                      >
                        <Star
                          fill={message.starred ? 'currentColor' : 'none'}
                          size={18}
                        />
                      </button>
                      <span
                        className={styles.sender}
                        onClick={event => event.stopPropagation()}
                      >
                        <span className={styles.contactHover}>
                          <button
                            className={styles.senderButton}
                            type="button"
                          >
                            {message.folder === 'sent'
                              ? `To:${contact.name}`
                              : contact.name}
                          </button>
                          <ContactHoverCard
                            contact={contact}
                            onCompose={openComposeToContact}
                            onTool={showContactToolStatus}
                          />
                        </span>
                      </span>
                      <span className={styles.preview}>
                        <span>{thread.subject}</span>
                        {message.preview || message.body ? (
                          <em>- {message.preview || message.body}</em>
                        ) : null}
                        {message.direction === 'outbound' ? (
                          <strong
                            className={`${styles.trackingBadge} ${
                              styles[`tracking${sentTrackingKind(message)}`]
                            }`}
                          >
                            {sentTrackingLabel(message, true)}
                          </strong>
                        ) : null}
                        {thread.count > 1 ? (
                          <strong className={styles.threadCount}>
                            {thread.count}
                          </strong>
                        ) : null}
                      </span>
                      <time>{formatListDate(message.date)}</time>
                    </div>
                    );
                  })
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                      <Mail size={48} />
                    </div>
                    <h2>{activeEmptyState.heading}</h2>
                    {activeEmptyState.subHeading ? (
                      <p>{activeEmptyState.subHeading}</p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </section>

      {deleteConfirm ? (
        <div
          aria-label={deleteConfirm.title}
          aria-modal="true"
          className={styles.confirmOverlay}
          role="dialog"
        >
          <section className={styles.confirmDialog}>
            <h2>{deleteConfirm.title}</h2>
            <p>{deleteConfirm.body}</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelButton}
                disabled={isDeleting}
                onClick={() => setDeleteConfirm(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={styles.dangerConfirmButton}
                disabled={isDeleting}
                onClick={confirmDelete}
                type="button"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className={styles.spin} size={16} />
                    Deleting
                  </>
                ) : deleteConfirm.permanent ? (
                  'Delete forever'
                ) : (
                  'Move to Bin'
                )}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {composeOpen ? (
        <div
          aria-label="Compose email"
          aria-modal="true"
          className={styles.composeOverlay}
          role="dialog"
        >
          <form
            className={
              composeExpanded
                ? `${styles.composeDialog} ${styles.composeDialogExpanded}`
                : styles.composeDialog
            }
            onSubmit={submitCompose}
            ref={composeFormRef}
          >
            <div className={styles.composeHeader}>
              <strong>New Message</strong>
              <div className={styles.composeHeaderActions}>
                <button
                  aria-label="Minimize compose"
                  className={styles.composeIconButton}
                  data-tooltip="Minimize"
                  disabled={isSending}
                  onClick={saveDraftAndClose}
                  type="button"
                >
                  <Minus size={17} />
                </button>
                <button
                  aria-label={
                    composeExpanded ? 'Exit full screen' : 'Full screen'
                  }
                  className={styles.composeIconButton}
                  data-tooltip={
                    composeExpanded ? 'Exit full screen' : 'Full screen'
                  }
                  disabled={isSending}
                  onClick={() => setComposeExpanded(value => !value)}
                  type="button"
                >
                  {composeExpanded ? (
                    <Minimize2 size={17} />
                  ) : (
                    <Maximize2 size={17} />
                  )}
                </button>
                <button
                  aria-label="Close compose"
                  className={styles.composeIconButton}
                  data-tooltip="Save and close"
                  disabled={isSending}
                  onClick={saveDraftAndClose}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <label className={styles.composeLine}>
              <span>From</span>
              {config.senders?.length ? (
                <select
                  aria-label="Sender"
                  className={styles.composeSelect}
                  disabled={isSending}
                  onChange={updateComposeField('from')}
                  value={composeFrom}
                >
                  {config.senders.map(sender => (
                    <option key={sender.email} value={sender.email}>
                      {sender.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  aria-label="Sender"
                  disabled={isSending}
                  onChange={updateComposeField('from')}
                  placeholder="Name <email@chefuinc.com>"
                  value={composeFrom}
                />
              )}
            </label>
            <div className={styles.composeLine}>
              <span>Recipients</span>
              <div className={styles.recipientComposer}>
                <div className={styles.recipientInputRow}>
                  <input
                    aria-label="Recipient email"
                    disabled={isSending}
                    onChange={updateComposeField('to')}
                    onKeyDown={addRecipientsFromKeyboard}
                    placeholder="name@company.com"
                    value={composeFields.to}
                  />
                  <button
                    className={styles.addRecipientButton}
                    disabled={isSending || !composeFields.to.trim()}
                    onClick={addRecipients}
                    type="button"
                  >
                    Add
                  </button>
                </div>
                {recipientEmails.length ? (
                  <div className={styles.recipientChips}>
                    {recipientEmails.map(email => (
                      <button
                        aria-label={`Remove ${email}`}
                        className={styles.recipientChip}
                        disabled={isSending}
                        key={email}
                        onClick={() => removeRecipient(email)}
                        type="button"
                      >
                        <span>{email}</span>
                        <X size={14} />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <label className={styles.composeLine}>
              <span>Subject</span>
              <input
                disabled={isSending}
                onChange={updateComposeField('subject')}
                value={composeFields.subject}
              />
            </label>
            <div
              aria-label="Message body"
              className={styles.composeBody}
              contentEditable={!isSending}
              data-placeholder="Write your message"
              onInput={syncComposeBody}
              onPaste={handleEditorPaste}
              ref={composeEditorRef}
              role="textbox"
              suppressContentEditableWarning
            />

            {composeAttachments.length ? (
              <div className={styles.attachmentStrip}>
                {composeAttachments.map(attachment => (
                  <div className={styles.attachmentChip} key={attachment.id}>
                    <FileText size={15} />
                    <span>
                      {attachment.filename}
                      <small>
                        {attachment.inline ? 'Inline image' : 'Attachment'} ·{' '}
                        {formatFileSize(attachment.size)}
                      </small>
                    </span>
                    <button
                      aria-label={`Remove ${attachment.filename}`}
                      className={styles.attachmentRemove}
                      disabled={isSending}
                      onClick={() => removeAttachment(attachment.id)}
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {formatToolbarOpen ? (
              <div
                className={styles.formatToolbar}
                aria-label="Formatting toolbar"
              >
                <button
                  aria-label="Undo"
                  className={styles.formatButton}
                  data-tooltip="Undo"
                  disabled={isSending}
                  onClick={() => runEditorCommand('undo')}
                  onMouseDown={event => event.preventDefault()}
                  type="button"
                >
                  <Undo2 size={17} />
                </button>
                <button
                  aria-label="Redo"
                  className={styles.formatButton}
                  data-tooltip="Redo"
                  disabled={isSending}
                  onClick={() => runEditorCommand('redo')}
                  onMouseDown={event => event.preventDefault()}
                  type="button"
                >
                  <Redo2 size={17} />
                </button>
                <span className={styles.formatDivider} />
                <label className={styles.formatSelectWrap}>
                  <span>Font</span>
                  <select
                    aria-label="Font"
                    className={styles.formatSelect}
                    defaultValue="Sans Serif"
                    disabled={isSending}
                    onChange={event =>
                      runEditorCommand('fontName', event.target.value)
                    }
                  >
                    {fontFamilies.map(font => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.formatSelectWrap}>
                  <span>Size</span>
                  <select
                    aria-label="Text size"
                    className={styles.formatSelect}
                    defaultValue="3"
                    disabled={isSending}
                    onChange={event =>
                      runEditorCommand('fontSize', event.target.value)
                    }
                  >
                    {fontSizes.map(size => (
                      <option key={size.value} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </label>
                <span className={styles.formatDivider} />
                <button
                  aria-label="Bold"
                  className={styles.formatButton}
                  data-tooltip="Bold"
                  disabled={isSending}
                  onClick={() => runEditorCommand('bold')}
                  onMouseDown={event => event.preventDefault()}
                  type="button"
                >
                  <Bold size={18} />
                </button>
                <button
                  aria-label="Italic"
                  className={styles.formatButton}
                  data-tooltip="Italic"
                  disabled={isSending}
                  onClick={() => runEditorCommand('italic')}
                  onMouseDown={event => event.preventDefault()}
                  type="button"
                >
                  <Italic size={18} />
                </button>
                <button
                  aria-label="Underline"
                  className={styles.formatButton}
                  data-tooltip="Underline"
                  disabled={isSending}
                  onClick={() => runEditorCommand('underline')}
                  onMouseDown={event => event.preventDefault()}
                  type="button"
                >
                  <Underline size={18} />
                </button>
                <label
                  aria-label="Text color"
                  className={styles.colorTool}
                  data-tooltip="Text color"
                >
                  <Palette size={17} />
                  <input
                    aria-label="Text color"
                    disabled={isSending}
                    onChange={event =>
                      runEditorCommand('foreColor', event.target.value)
                    }
                    type="color"
                  />
                </label>
                <span className={styles.formatDivider} />
                <label className={styles.formatSelectWrap}>
                  <span>Align</span>
                  <select
                    aria-label="Text alignment"
                    className={styles.formatSelect}
                    defaultValue="justifyLeft"
                    disabled={isSending}
                    onChange={event => runEditorCommand(event.target.value)}
                  >
                    <option value="justifyLeft">Left</option>
                    <option value="justifyCenter">Center</option>
                    <option value="justifyRight">Right</option>
                  </select>
                </label>
                <button
                  aria-label="Numbered list"
                  className={styles.formatButton}
                  data-tooltip="Numbered list"
                  disabled={isSending}
                  onClick={() => insertEditorList(true)}
                  onMouseDown={event => event.preventDefault()}
                  type="button"
                >
                  <ListOrdered size={18} />
                </button>
                <button
                  aria-label="Bulleted list"
                  className={styles.formatButton}
                  data-tooltip="Bulleted list"
                  disabled={isSending}
                  onClick={() => insertEditorList(false)}
                  onMouseDown={event => event.preventDefault()}
                  type="button"
                >
                  <List size={18} />
                </button>
                <button
                  aria-label="Decrease indent"
                  className={styles.formatButton}
                  data-tooltip="Decrease indent"
                  disabled={isSending}
                  onClick={() => runEditorCommand('outdent')}
                  onMouseDown={event => event.preventDefault()}
                  type="button"
                >
                  <ListIndentDecrease size={18} />
                </button>
                <button
                  aria-label="Increase indent"
                  className={styles.formatButton}
                  data-tooltip="Increase indent"
                  disabled={isSending}
                  onClick={() => runEditorCommand('indent')}
                  onMouseDown={event => event.preventDefault()}
                  type="button"
                >
                  <ListIndentIncrease size={18} />
                </button>
                <button
                  aria-label="Quote"
                  className={styles.formatButton}
                  data-tooltip="Quote"
                  disabled={isSending}
                  onClick={() => runEditorCommand('formatBlock', 'blockquote')}
                  onMouseDown={event => event.preventDefault()}
                  type="button"
                >
                  <Quote size={18} />
                </button>
                <button
                  aria-label="Strikethrough"
                  className={styles.formatButton}
                  data-tooltip="Strikethrough"
                  disabled={isSending}
                  onClick={() => runEditorCommand('strikeThrough')}
                  onMouseDown={event => event.preventDefault()}
                  type="button"
                >
                  <Strikethrough size={18} />
                </button>
                <button
                  aria-label="Remove formatting"
                  className={styles.formatButton}
                  data-tooltip="Remove formatting"
                  disabled={isSending}
                  onClick={clearEditorFormatting}
                  onMouseDown={event => event.preventDefault()}
                  type="button"
                >
                  <RemoveFormatting size={18} />
                </button>
              </div>
            ) : null}

            <div className={styles.composeFooter}>
              <div className={styles.composeFooterLeft}>
                <div className={styles.sendSplitWrap}>
                  <div className={styles.sendSplit}>
                    <button
                      className={styles.sendButton}
                      disabled={isSending}
                      type="submit"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className={styles.spin} size={16} />
                          Sending
                        </>
                      ) : (
                        'Send'
                      )}
                    </button>
                    <button
                      aria-label="Send options"
                      className={styles.sendOptionsButton}
                      data-tooltip="Send options"
                      disabled={isSending}
                      onClick={() => setSendOptionsOpen(open => !open)}
                      type="button"
                    >
                      <ChevronDown size={17} />
                    </button>
                  </div>
                  {sendOptionsOpen ? (
                    <div className={styles.composeMenu}>
                      <button
                        onClick={() => composeFormRef.current?.requestSubmit()}
                        type="button"
                      >
                        Send now
                      </button>
                      <button onClick={saveDraftAndClose} type="button">
                        Save draft and close
                      </button>
                    </div>
                  ) : null}
                </div>
                <button
                  aria-label="Formatting options"
                  className={
                    formatToolbarOpen
                      ? `${styles.footerToolButton} ${styles.footerToolActive}`
                      : styles.footerToolButton
                  }
                  data-tooltip="Formatting options"
                  disabled={isSending}
                  onClick={() => setFormatToolbarOpen(open => !open)}
                  type="button"
                >
                  <CaseSensitive size={19} />
                </button>
                <button
                  aria-label="Attach files"
                  className={styles.footerToolButton}
                  data-tooltip="Attach files"
                  disabled={isSending}
                  onClick={() => attachmentInputRef.current?.click()}
                  type="button"
                >
                  <Paperclip size={19} />
                </button>
                <button
                  aria-label="Insert link"
                  className={styles.footerToolButton}
                  data-tooltip="Insert link"
                  disabled={isSending}
                  onClick={promptForLink}
                  type="button"
                >
                  <Link2 size={19} />
                </button>
                <div className={styles.footerMenuWrap}>
                  <button
                    aria-label="Insert emoji"
                    className={styles.footerToolButton}
                    data-tooltip="Insert emoji"
                    disabled={isSending}
                    onClick={() => setEmojiPickerOpen(open => !open)}
                    type="button"
                  >
                    <Smile size={19} />
                  </button>
                  {emojiPickerOpen ? (
                    <div className={styles.emojiMenu}>
                      {composeEmojis.map(emoji => (
                        <button
                          aria-label={`Insert ${emoji}`}
                          key={emoji}
                          onClick={() => {
                            insertEditorText(emoji);
                            setEmojiPickerOpen(false);
                          }}
                          type="button"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  aria-label="Insert Drive link"
                  className={styles.footerToolButton}
                  data-tooltip="Insert Drive link"
                  disabled={isSending}
                  onClick={insertDriveLink}
                  type="button"
                >
                  <Triangle size={18} />
                </button>
                <button
                  aria-label="Insert photo"
                  className={styles.footerToolButton}
                  data-tooltip="Insert photo"
                  disabled={isSending}
                  onClick={() => imageInputRef.current?.click()}
                  type="button"
                >
                  <ImageIcon size={19} />
                </button>
                <button
                  aria-label="Confidential mode"
                  className={styles.footerToolButton}
                  data-tooltip="Confidential mode"
                  disabled={isSending}
                  onClick={insertConfidentialNotice}
                  type="button"
                >
                  <LockKeyhole size={19} />
                </button>
                <button
                  aria-label="Insert signature"
                  className={styles.footerToolButton}
                  data-tooltip="Insert signature"
                  disabled={isSending}
                  onClick={insertSignature}
                  type="button"
                >
                  <PenLine size={19} />
                </button>
                <div className={styles.footerMenuWrap}>
                  <button
                    aria-label="More options"
                    className={styles.footerToolButton}
                    data-tooltip="More options"
                    disabled={isSending}
                    onClick={() => setMoreToolsOpen(open => !open)}
                    type="button"
                  >
                    <EllipsisVertical size={19} />
                  </button>
                  {moreToolsOpen ? (
                    <div className={styles.composeMenu}>
                      <button onClick={() => insertVariable('firstName')} type="button">
                        <AtSign size={15} />
                        Insert first name
                      </button>
                      <button onClick={() => insertVariable('company')} type="button">
                        <Sparkles size={15} />
                        Insert company
                      </button>
                      <button onClick={insertDivider} type="button">
                        <Minus size={15} />
                        Insert divider
                      </button>
                      <button onClick={removeAllFormatting} type="button">
                        <Type size={15} />
                        Plain text cleanup
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <button
                aria-label="Discard draft"
                className={styles.composeIconButton}
                data-tooltip="Discard draft"
                disabled={isSending}
                onClick={discardCompose}
                type="button"
              >
                <Trash2 size={19} />
              </button>
            </div>
            <input
              className={styles.hiddenFileInput}
              multiple
              onChange={addAttachmentFiles}
              ref={attachmentInputRef}
              type="file"
            />
            <input
              accept="image/*"
              className={styles.hiddenFileInput}
              multiple
              onChange={addInlineImages}
              ref={imageInputRef}
              type="file"
            />
          </form>
        </div>
      ) : null}
    </main>
  );
}
