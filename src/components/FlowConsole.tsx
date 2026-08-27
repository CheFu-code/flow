'use client';

import {
  Archive,
  AtSign,
  ArrowLeft,
  Bold,
  CaseSensitive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  EllipsisVertical,
  ExternalLink,
  FileText,
  FolderInput,
  Grid3X3,
  Image as ImageIcon,
  Italic,
  Keyboard,
  Link2,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  Loader2,
  LockKeyhole,
  Mail,
  Maximize2,
  Menu,
  MailOpen,
  Minimize2,
  Minus,
  OctagonAlert,
  Palette,
  Paperclip,
  PenLine,
  Printer,
  Quote,
  Redo2,
  RemoveFormatting,
  Reply,
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
import { AccountMenu } from '@/components/flow-console/AccountMenu';
import { DeleteConfirmDialog } from '@/components/flow-console/DeleteConfirmDialog';
import { FlowSidebar } from '@/components/flow-console/FlowSidebar';
import { ManageSendersModal } from '@/components/flow-console/ManageSendersModal';
import { MessageRow } from '@/components/MessageRow';
import { useDebounce } from '@/hooks/useDebounce';
import { apiUrl, flowHeaders } from '@/lib/api';
import {
  composeEmojis,
  defaultConfig,
  emptyFolderCounts,
  emptyStates,
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
  formatMessageDate,
  getFolderLabel,
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
import {
  renderReaderMessageHtml,
  renderReaderPrintDocument,
} from '@/lib/flow-console/reader';
import { parseServerSentEvent } from '@/lib/flow-console/sse';
import type {
  BackendMessage,
  BackendMessagesResponse,
  ComposeAttachment,
  ComposeFields,
  ContactPreview,
  DeleteConfirm,
  FlowConfig,
  FlowConsoleProps,
  FlowSender,
  MailFolder,
  MailMessage,
  MessageFolder,
  StatusMessage,
} from '@/lib/flow-console/types';
import styles from './FlowConsole.module.css';

const MAILBOX_CACHE_KEY = 'flow-mailbox-cache-v1';

function readMailboxCache(folder: MailFolder): MailMessage[] {
  if (typeof window === 'undefined') return [];

  try {
    const cached = JSON.parse(
      window.sessionStorage.getItem(MAILBOX_CACHE_KEY) || '{}',
    ) as Record<string, MailMessage[]>;
    return Array.isArray(cached[folder]) ? cached[folder] : [];
  } catch {
    return [];
  }
}

function writeMailboxCache(folder: MailFolder, messages: MailMessage[]) {
  if (typeof window === 'undefined') return;

  try {
    const cached = JSON.parse(
      window.sessionStorage.getItem(MAILBOX_CACHE_KEY) || '{}',
    ) as Record<string, MailMessage[]>;
    cached[folder] = messages.slice(0, 100);
    window.sessionStorage.setItem(MAILBOX_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Session storage is optional and may be unavailable or full.
  }
}

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
  const detailLoadedRef = useRef(new Set<string>());
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeFolder, setActiveFolder] = useState<MailFolder>('inbox');
  const [activeHeaderPanel, setActiveHeaderPanel] = useState<
    'apps' | 'help' | 'settings' | null
  >(null);
  const [composeAttachments, setComposeAttachments] = useState<
    ComposeAttachment[]
  >([]);
  const [composeExpanded, setComposeExpanded] = useState(false);
  const [composeFields, setComposeFields] =
    useState<ComposeFields>(initialCompose);
  const [composeOpen, setComposeOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [config, setConfig] = useState<FlowConfig>(defaultConfig);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(
    null,
  );
  const [folderCounts, setFolderCounts] =
    useState<Record<MailFolder, number>>(emptyFolderCounts);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [listScrollTop, setListScrollTop] = useState(0);
  const [manageSendersOpen, setManageSendersOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [formatToolbarOpen, setFormatToolbarOpen] = useState(true);
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const [messages, setMessages] = useState<MailMessage[]>(() =>
    readMailboxCache('inbox'),
  );
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [readerMoreOpen, setReaderMoreOpen] = useState(false);
  const [readerMoveOpen, setReaderMoveOpen] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [sendOptionsOpen, setSendOptionsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [themeDensity, setThemeDensity] = useState<'comfortable' | 'compact'>(
    'comfortable',
  );

  const debouncedQuery = useDebounce(query, 140);

  const allThreads = useMemo(
    () => groupMessagesIntoThreads(messages),
    [messages],
  );

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const visibleThreads = useMemo(() => {
    const cleanQuery = debouncedQuery.trim().toLowerCase();

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
  }, [allThreads, debouncedQuery]);

  const virtualStart = Math.max(0, Math.floor(listScrollTop / 44) - 5);
  const virtualEnd = Math.min(visibleThreads.length, virtualStart + 30);
  const renderedThreads = visibleThreads.slice(virtualStart, virtualEnd);

  const selectedThread = useMemo(
    () => allThreads.find(thread => thread.id === selectedMessageId) || null,
    [allThreads, selectedMessageId],
  );

  const allVisibleSelected =
    visibleThreads.length > 0 &&
    visibleThreads.every(thread => selectedIdSet.has(thread.id));
  const selectedThreadIndex = visibleThreads.findIndex(
    thread => thread.id === selectedMessageId,
  );
  const readerPositionLabel =
    selectedThreadIndex >= 0
      ? `${selectedThreadIndex + 1} of ${visibleThreads.length}`
      : visibleThreads.length
        ? `1 of ${visibleThreads.length}`
        : '0 of 0';
  const canOpenNewerThread = selectedThreadIndex > 0;
  const canOpenOlderThread =
    selectedThreadIndex >= 0 && selectedThreadIndex < visibleThreads.length - 1;

  const selectedFolderTitle = getFolderLabel(activeFolder);
  const activeEmptyState = emptyStates[activeFolder];
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
  const canWrite = accessSession.permission !== 'read';
  const unreadCount = useMemo(
    () => allThreads.filter(thread => thread.unread).length,
    [allThreads],
  );
  const starredCount = useMemo(
    () => allThreads.filter(thread => thread.starred).length,
    [allThreads],
  );

  const handleSenderAdded = (newSender: FlowSender) => {
    setConfig(prev => {
      const existing = prev.senders || [];
      const filtered = existing.filter(
        s => s.email.toLowerCase() !== newSender.email.toLowerCase(),
      );
      return {
        ...prev,
        senders: [newSender, ...filtered],
      };
    });
    setComposeFields(prev => ({
      ...prev,
      from: newSender.email,
    }));
  };

  const handleSenderRemoved = (bareEmail: string) => {
    setConfig(prev => {
      const filtered = (prev.senders || []).filter(s => {
        const match = s.email.match(/<([^>]+)>/);
        const email = (match?.[1] || s.email).trim().toLowerCase();
        return email !== bareEmail.toLowerCase();
      });
      return {
        ...prev,
        senders: filtered,
      };
    });
  };

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
    const controller = new AbortController();

    fetch(apiUrl('/flow/config'), {
      credentials: 'include',
      headers: flowHeaders(),
      signal: controller.signal,
    })
      .then(response => responseJson<FlowConfig>(response))
      .then(nextConfig => {
        if (active) setConfig({ ...defaultConfig, ...nextConfig });
      })
      .catch(error => {
        if (!active || controller.signal.aborted) return;
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
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!selectedThread) return;

    const pending = selectedThread.messages.filter(
      message => !detailLoadedRef.current.has(message.id) && !message.contentLoaded,
    );
    if (!pending.length) return;

    pending.forEach(message => detailLoadedRef.current.add(message.id));
    Promise.all(
      pending.map(async message => {
        try {
          const response = await fetch(apiUrl(`/flow/messages/${message.id}`), {
            credentials: 'include',
            headers: flowHeaders(),
          });
          const data = await responseJson<{ message: BackendMessage }>(response);
          return toMailMessage(data.message);
        } catch (error) {
          detailLoadedRef.current.delete(message.id);
          throw error;
        }
      }),
    )
      .then(details => {
        setMessages(current => current.map(message => {
          const detail = details.find(item => item.id === message.id);
          return detail ? { ...message, ...detail } : message;
        }));
        const draft = details.find(message => message.folder === 'drafts');
        if (draft && selectedThread.latest.folder === 'drafts') {
          setDraftId(draft.id);
          setComposeFields({
            body: draft.body,
            from: draft.from,
            subject: draft.subject === '(no subject)' ? '' : draft.subject,
            to: '',
          });
          setRecipientEmails(draft.to);
          setComposeOpen(true);
          window.requestAnimationFrame(() => {
            if (composeEditorRef.current) composeEditorRef.current.innerHTML = draft.body;
          });
        }
      })
      .catch(error => {
        setStatus({ kind: 'info', text: error instanceof Error ? error.message : 'Message details could not be loaded.' });
      });
  }, [selectedThread]);

  useEffect(() => {
    const controller = new AbortController();
    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const applyMessages = (data: BackendMessagesResponse) => {
      const nextMessages = (data.messages || []).map(toMailMessage);
      setMessages(current => {
        const incomingIds = new Set(nextMessages.map(message => message.id));
        return [...nextMessages, ...current.filter(message => !incomingIds.has(message.id))];
      });
      setFolderCounts(mapCounts(data.counts));
      setNextCursor(data.nextCursor || null);
      setIsLoadingMessages(false);
      writeMailboxCache(activeFolder, nextMessages);
    };

    const loadMailboxFallback = async () => {
      try {
        const response = await fetch(
          apiUrl(`/flow/messages?folder=${backendFolderFor(activeFolder)}`),
          {
            credentials: 'include',
            headers: flowHeaders(),
            signal: controller.signal,
          },
        );
        applyMessages(await responseJson<BackendMessagesResponse>(response));
      } catch (error) {
        if (stopped || controller.signal.aborted) return;
        setIsLoadingMessages(false);
        setStatus({
          kind: 'info',
          text:
            error instanceof Error
              ? error.message
              : 'Mailbox could not be loaded.',
        });
      }
    };

    const handleEvent = (rawEvent: string) => {
      const parsed = parseServerSentEvent(rawEvent.trim());
      if (parsed.event === 'error') {
        let errorMessage = 'Live mailbox updates failed.';
        try {
          const payload = JSON.parse(parsed.data) as { message?: string };
          if (payload.message) errorMessage = payload.message;
        } catch {
          // Keep the user-facing fallback message for malformed error frames.
        }
        setStatus({
          kind: 'info',
          text: `${errorMessage} Showing the latest available mail.`,
        });
        void loadMailboxFallback();
        return;
      }
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

        if (!response.ok || !response.body) {
          setStatus({ kind: 'info', text: 'Live mailbox updates could not be connected.' });
          void loadMailboxFallback();
          return;
        }

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
        setIsLoadingMessages(false);
        setStatus({
          kind: 'info',
          text: 'Mailbox updates are temporarily unavailable.',
        });
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
    const cachedMessages = readMailboxCache(folder);
    setMessages(cachedMessages);
    setNextCursor(null);
    setIsLoadingMessages(cachedMessages.length === 0);
    setActiveFolder(folder);
    setReaderMoreOpen(false);
    setReaderMoveOpen(false);
    setMessageMenuId(null);
    setSelectedIds([]);
    setSelectedMessageId(null);
    setStatus(null);
  };

  const loadNextPage = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch(
        apiUrl(`/flow/messages?folder=${backendFolderFor(activeFolder)}&cursor=${encodeURIComponent(nextCursor)}`),
        { credentials: 'include', headers: flowHeaders() },
      );
      const data = await responseJson<BackendMessagesResponse>(response);
      const olderMessages = (data.messages || []).map(toMailMessage);
      setMessages(current => {
        const ids = new Set(current.map(message => message.id));
        return [...current, ...olderMessages.filter(message => !ids.has(message.id))];
      });
      setNextCursor(data.nextCursor || null);
    } catch (error) {
      setStatus({ kind: 'info', text: error instanceof Error ? error.message : 'Older messages could not be loaded.' });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openMessage = (threadId: string) => {
    const thread = allThreads.find(item => item.id === threadId);
    const unreadMessageIds =
      thread?.allMessages
        .filter(message => message.unread)
        .map(message => message.id) || [];

    setSelectedMessageId(threadId);
    setReaderMoreOpen(false);
    setReaderMoveOpen(false);
    setMessageMenuId(null);
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
      .then(() => undefined)
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

    setReaderMoreOpen(false);
    setReaderMoveOpen(false);
    const permanent = selectedThread.allMessages.every(
      message => message.folder === 'bin',
    );
    setDeleteConfirm({
      ...threadDeleteCopy(messageIds.length, permanent),
      messageIds,
      permanent,
    });
  };

  const openThreadByOffset = (offset: number) => {
    if (selectedThreadIndex < 0) return;
    const target = visibleThreads[selectedThreadIndex + offset];
    if (target) openMessage(target.id);
  };

  const mutateOpenThread = async ({
    body,
    endpoint,
    folder,
    keepOpen = false,
    success,
    unread,
  }: {
    body?: Record<string, string>;
    endpoint: string;
    folder?: MessageFolder;
    keepOpen?: boolean;
    success: string;
    unread?: boolean;
  }) => {
    if (!selectedThread) return;

    const messageIds = selectedThread.allMessages.map(message => message.id);
    if (!messageIds.length) return;

    setReaderMoreOpen(false);
    setReaderMoveOpen(false);

    try {
      await Promise.all(
        messageIds.map(messageId =>
          fetch(apiUrl(`/flow/messages/${messageId}/${endpoint}`), {
            body: body ? JSON.stringify(body) : undefined,
            credentials: 'include',
            headers: body
              ? { 'Content-Type': 'application/json', ...flowHeaders() }
              : flowHeaders(),
            method: 'POST',
          }).then(response => responseJson(response)),
        ),
      );

      setMessages(current =>
        current.map(message =>
          messageIds.includes(message.id)
            ? {
                ...message,
                ...(folder ? { folder } : {}),
                ...(typeof unread === 'boolean' ? { unread } : {}),
              }
            : message,
        ),
      );
      setStatus({ kind: 'success', text: success });
      if (!keepOpen) setSelectedMessageId(null);
    } catch (error) {
      setStatus({
        kind: 'info',
        text: error instanceof Error ? error.message : 'Message update failed.',
      });
    }
  };

  const archiveOpenThread = () =>
    mutateOpenThread({
      endpoint: 'archive',
      folder: 'archived',
      success: 'Conversation archived.',
      unread: false,
    });

  const reportOpenThread = () =>
    mutateOpenThread({
      endpoint: 'report',
      folder: 'archived',
      success: 'Conversation reported and archived.',
      unread: false,
    });

  const markOpenThreadUnread = () =>
    mutateOpenThread({
      endpoint: 'unread',
      success: 'Conversation marked as unread.',
      unread: true,
    });

  const moveOpenThreadTo = (folder: MessageFolder) =>
    mutateOpenThread({
      body: { folder },
      endpoint: 'folder',
      folder,
      success: `Conversation moved to ${getMessageFolderLabel(folder)}.`,
      unread: false,
    });

  const showReaderToolStatus = (text: string) => {
    setReaderMoreOpen(false);
    setReaderMoveOpen(false);
    setMessageMenuId(null);
    setStatus({ kind: 'info', text });
  };

  const downloadTextFile = (
    filename: string,
    content: string,
    type = 'text/plain',
  ) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename.replace(/[\\/:*?"<>|]+/g, '-');
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const threadToPlainText = () =>
    selectedThread?.allMessages
      .map(message => {
        const recipients = message.to.join(', ');
        return [
          `From: ${message.from}`,
          `To: ${recipients}`,
          `Date: ${formatMessageDate(message.date)}`,
          `Subject: ${message.subject}`,
          '',
          message.body || message.preview,
        ].join('\n');
      })
      .join('\n\n---\n\n') || '';

  const showOriginalSource = () => {
    if (!selectedThread) return;

    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) {
      showReaderToolStatus('Allow pop-ups to view the original source.');
      return;
    }

    const pre = popup.document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.wordBreak = 'break-word';
    pre.style.font = '13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace';
    pre.textContent = threadToPlainText();
    popup.document.title = `Original source - ${selectedThread.subject}`;
    popup.document.body.style.margin = '24px';
    popup.document.body.append(pre);
    setReaderMoreOpen(false);
  };

  const downloadThread = () => {
    if (!selectedThread) return;

    downloadTextFile(
      `${selectedThread.subject || 'conversation'}.txt`,
      threadToPlainText(),
    );
    setReaderMoreOpen(false);
    setStatus({ kind: 'success', text: 'Conversation downloaded.' });
  };

  const openThreadDocument = (print = false) => {
    if (!selectedThread) return;

    const popup = window.open('', '_blank');
    if (!popup) {
      showReaderToolStatus('Allow pop-ups to open this conversation.');
      return;
    }

    popup.document.open();
    popup.document.write(renderReaderPrintDocument(selectedThread));
    popup.document.close();

    if (print) {
      window.setTimeout(() => {
        popup.focus();
        popup.print();
      }, 250);
    }
  };

  const replyToMessage = (message: MailMessage) => {
    const contact = contactFromMessage(message);
    if (!contact.email) return;

    resetCompose();
    setRecipientEmails([contact.email]);
    setComposeFields({
      ...initialCompose,
      subject: /^re:/i.test(message.subject)
        ? message.subject
        : `Re: ${message.subject}`,
    });
    setComposeOpen(true);
    setStatus(null);
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
    insertEditorHtml('<br /><br />Best regards,<br />CHEFU Technologies');
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
    setDraftId(null);
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
        setStatus({ kind: 'success', text: 'Draft saved.' });
      } catch (error) {
        setStatus({
          kind: 'info',
          text: error instanceof Error ? error.message : 'Draft save failed.',
        });
      } finally {
        setIsSavingDraft(false);
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
    if (!canWrite || !contact.email) return;

    resetCompose();
    setRecipientEmails([contact.email]);
    setComposeOpen(true);
    setStatus(null);
  };

  const savedContactsFromStorage = () => {
    const rawContacts = window.localStorage.getItem('flowSavedContacts');
    if (!rawContacts) return [] as ContactPreview[];

    try {
      const parsed = JSON.parse(rawContacts) as ContactPreview[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as ContactPreview[];
    }
  };

  const showContactToolStatus = (tool: string, contact: ContactPreview) => {
    const safeEmail = encodeURIComponent(contact.email);
    const safeName = encodeURIComponent(contact.name || contact.email);

    if (tool === 'Contact card') {
      const savedContacts = savedContactsFromStorage();
      const nextContacts = [
        ...savedContacts.filter(item => item.email !== contact.email),
        contact,
      ];
      window.localStorage.setItem(
        'flowSavedContacts',
        JSON.stringify(nextContacts),
      );
      setStatus({ kind: 'success', text: `${contact.name} saved to contacts.` });
      return;
    }

    if (tool === 'Chat') {
      window.location.href = `mailto:${safeEmail}?subject=${encodeURIComponent(
        'Quick chat',
      )}`;
      return;
    }

    if (tool === 'Video call') {
      window.open(
        `https://meet.google.com/new?hs=180&authuser=0&pli=1&email=${safeEmail}`,
        '_blank',
        'noopener,noreferrer',
      );
      return;
    }

    if (tool === 'Calendar') {
      const details = encodeURIComponent(
        `Meeting with ${contact.name} <${contact.email}>`,
      );
      window.open(
        `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Meeting%20with%20${safeName}&details=${details}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  };

  const addReactionToMessage = (messageId: string, emoji: string) => {
    setMessages(current =>
      current.map(message =>
        message.id === messageId
          ? {
              ...message,
              reactionCount: (message.reactionCount || 0) + 1,
              reactionEmoji: emoji,
              reactionFrom: accessSession.keyLabel,
            }
          : message,
      ),
    );
    setMessageMenuId(null);
    setStatus({ kind: 'success', text: `Reaction ${emoji} added.` });
  };

  const copyMessageLink = async (message: MailMessage) => {
    const url = `${window.location.origin}${
      window.location.pathname
    }#${encodeURIComponent(message.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatus({ kind: 'success', text: 'Message link copied.' });
    } catch {
      window.location.hash = message.id;
      setStatus({ kind: 'info', text: 'Message link added to the address bar.' });
    }
    setMessageMenuId(null);
  };

  const downloadMessage = (message: MailMessage) => {
    downloadTextFile(
      `${message.subject || message.id}.txt`,
      [
        `From: ${message.from}`,
        `To: ${message.to.join(', ')}`,
        `Date: ${formatMessageDate(message.date)}`,
        `Subject: ${message.subject}`,
        '',
        message.body || message.preview,
      ].join('\n'),
    );
    setMessageMenuId(null);
    setStatus({ kind: 'success', text: 'Message downloaded.' });
  };

  const openHelpPanel = () => {
    setActiveHeaderPanel(panel => (panel === 'help' ? null : 'help'));
  };

  const openSettingsPanel = () => {
    setActiveHeaderPanel(panel => (panel === 'settings' ? null : 'settings'));
  };

  const openAppsPanel = () => {
    setActiveHeaderPanel(panel => (panel === 'apps' ? null : 'apps'));
  };

  const submitCompose = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite) return;
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
    <main
      className={`${styles.mailShell} ${
        themeDensity === 'compact' ? styles.compactDensity : ''
      }`}
    >
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
            onClick={openHelpPanel}
            type="button"
          >
            <CircleHelp size={22} />
          </button>
          <button
            aria-label="Settings"
            className={styles.iconButton}
            data-tooltip="Settings"
            onClick={openSettingsPanel}
            type="button"
          >
            <Settings size={22} />
          </button>
          <button
            aria-label="Apps"
            className={styles.iconButton}
            data-tooltip="Apps"
            onClick={openAppsPanel}
            type="button"
          >
            <Grid3X3 size={22} />
          </button>
          {activeHeaderPanel ? (
            <section
              className={styles.headerPanel}
              aria-label={`${activeHeaderPanel} panel`}
            >
              {activeHeaderPanel === 'help' ? (
                <>
                  <strong>Flow shortcuts</strong>
                  <button onClick={() => setComposeOpen(true)} type="button">
                    Compose a message
                  </button>
                  <button onClick={() => setQuery('')} type="button">
                    Reset search
                  </button>
                  <button onClick={() => setSidebarOpen(true)} type="button">
                    Show folders
                  </button>
                </>
              ) : null}
              {activeHeaderPanel === 'settings' ? (
                <>
                  <strong>Settings & Senders</strong>
                  <button
                    onClick={() => {
                      setActiveHeaderPanel(null);
                      setManageSendersOpen(true);
                    }}
                    type="button"
                  >
                    Manage sender addresses (@chefu.co.za)
                  </button>
                  <button
                    onClick={() => setThemeDensity('comfortable')}
                    type="button"
                  >
                    Comfortable density
                  </button>
                  <button onClick={() => setThemeDensity('compact')} type="button">
                    Compact density
                  </button>
                  <button
                    onClick={() => setFormatToolbarOpen(open => !open)}
                    type="button"
                  >
                    Toggle compose toolbar
                  </button>
                </>
              ) : null}
              {activeHeaderPanel === 'apps' ? (
                <>
                  <strong>Flow apps</strong>
                  <button onClick={() => setComposeOpen(true)} type="button">
                    Mail composer
                  </button>
                  <button onClick={() => setActiveFolder('starred')} type="button">
                    Starred mail
                  </button>
                  <button onClick={() => setAccountOpen(true)} type="button">
                    Account
                  </button>
                </>
              ) : null}
            </section>
          ) : null}
          <AccountMenu
            containerRef={accountMenuRef}
            isOpen={accountOpen}
            onLock={onLock}
            onToggle={() => setAccountOpen(open => !open)}
            session={accessSession}
          />
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
          <FlowSidebar
            activeFolder={activeFolder}
            canWrite={canWrite}
            folderCounts={folderCounts}
            onCompose={() => setComposeOpen(true)}
            onFolderChange={changeFolder}
          />
        ) : null}

        <section className={styles.contentPane}>
          {selectedThread ? (
            <article className={styles.reader}>
              <div className={styles.readerToolbar}>
                <div className={styles.readerToolbarGroup}>
                  <button
                    aria-label="Back to message list"
                    className={styles.readerIconButton}
                    data-tooltip="Back"
                    onClick={() => {
                      setReaderMoreOpen(false);
                      setReaderMoveOpen(false);
                      setSelectedMessageId(null);
                    }}
                    type="button"
                  >
                    <ArrowLeft size={18} />
                  </button>
                </div>

                <div className={styles.readerToolbarGroup}>
                  <button
                    aria-label="Archive conversation"
                    className={styles.readerIconButton}
                    data-tooltip="Archive"
                    onClick={archiveOpenThread}
                    type="button"
                  >
                    <Archive size={18} />
                  </button>
                  <button
                    aria-label="Report conversation"
                    className={styles.readerIconButton}
                    data-tooltip="Report spam"
                    onClick={reportOpenThread}
                    type="button"
                  >
                    <OctagonAlert size={18} />
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

                <span className={styles.readerToolbarDivider} />

                <div className={styles.readerToolbarGroup}>
                  <button
                    aria-label="Mark conversation as unread"
                    className={styles.readerIconButton}
                    data-tooltip="Mark as unread"
                    onClick={markOpenThreadUnread}
                    type="button"
                  >
                    <MailOpen size={18} />
                  </button>
                  <div className={styles.readerMenuWrap}>
                    <button
                      aria-expanded={readerMoveOpen}
                      aria-label="Move conversation"
                      className={styles.readerIconButton}
                      data-tooltip="Move to"
                      onClick={() => {
                        setReaderMoreOpen(false);
                        setReaderMoveOpen(open => !open);
                      }}
                      type="button"
                    >
                      <FolderInput size={18} />
                    </button>
                    {readerMoveOpen ? (
                      <div className={styles.readerMenu}>
                        <button onClick={() => moveOpenThreadTo('inbox')} type="button">
                          Inbox
                        </button>
                        <button onClick={() => moveOpenThreadTo('sent')} type="button">
                          Sent
                        </button>
                        <button onClick={() => moveOpenThreadTo('drafts')} type="button">
                          Drafts
                        </button>
                        <button
                          onClick={() => moveOpenThreadTo('archived')}
                          type="button"
                        >
                          Archive
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.readerMenuWrap}>
                    <button
                      aria-expanded={readerMoreOpen}
                      aria-label="More message actions"
                      className={styles.readerIconButton}
                      data-tooltip="More"
                      onClick={() => {
                        setReaderMoveOpen(false);
                        setReaderMoreOpen(open => !open);
                      }}
                      type="button"
                    >
                      <EllipsisVertical size={18} />
                    </button>
                    {readerMoreOpen ? (
                      <div className={styles.readerMenu}>
                        <button onClick={markOpenThreadUnread} type="button">
                          Mark unread
                        </button>
                        <button
                          onClick={showOriginalSource}
                          type="button"
                        >
                          Show original
                        </button>
                        <button
                          onClick={downloadThread}
                          type="button"
                        >
                          Download message
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <span className={styles.readerToolbarSpacer} />

                <span className={styles.readerToolbarCount}>
                  {readerPositionLabel}
                </span>
                <button
                  aria-label="Newer conversation"
                  className={styles.readerIconButton}
                  data-tooltip="Newer"
                  disabled={!canOpenNewerThread}
                  onClick={() => openThreadByOffset(-1)}
                  type="button"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  aria-label="Older conversation"
                  className={styles.readerIconButton}
                  data-tooltip="Older"
                  disabled={!canOpenOlderThread}
                  onClick={() => openThreadByOffset(1)}
                  type="button"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  aria-label="Keyboard shortcuts"
                  className={`${styles.readerIconButton} ${styles.readerIconButtonWide}`}
                  data-tooltip="Keyboard shortcuts"
                  onClick={openHelpPanel}
                  type="button"
                >
                  <Keyboard size={18} />
                  <ChevronDown size={13} />
                </button>
              </div>

              {status ? (
                <div
                  className={
                    status.kind === 'success'
                      ? `${styles.status} ${styles.statusSuccess} ${styles.readerStatus}`
                      : `${styles.status} ${styles.readerStatus}`
                  }
                >
                  {status.text}
                </div>
              ) : null}

              <div className={styles.readerHeaderLine}>
                <h1 className={styles.readerSubject}>
                  {selectedThread.subject}
                  <span>
                    {selectedThread.count > 1
                      ? `${selectedThread.count} messages`
                      : getMessageFolderLabel(selectedThread.latest.folder)}
                  </span>
                </h1>
                <div className={styles.readerSubjectActions}>
                  <button
                    aria-label="Print conversation"
                    className={styles.readerIconButton}
                    data-tooltip="Print all"
                    onClick={() => openThreadDocument(true)}
                    type="button"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    aria-label="Open conversation in new window"
                    className={styles.readerIconButton}
                    data-tooltip="Open in new window"
                    onClick={() => openThreadDocument()}
                    type="button"
                  >
                    <ExternalLink size={18} />
                  </button>
                </div>
              </div>

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
                            <div className={styles.readerMessageActions}>
                              <time>{formatMessageDate(message.date)}</time>
                              <button
                                aria-label={
                                  message.starred
                                    ? 'Remove star from message'
                                    : 'Star message'
                                }
                                className={
                                  message.starred
                                    ? `${styles.readerIconButton} ${styles.rowStarActive}`
                                    : styles.readerIconButton
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
                              <button
                                aria-label="Add reaction"
                                className={styles.readerIconButton}
                                data-tooltip="Add reaction"
                                onClick={() => setMessageMenuId(messageMenuId === `reaction-${message.id}` ? null : `reaction-${message.id}`)}
                                type="button"
                              >
                                <Smile size={18} />
                              </button>
                              <button
                                aria-label="Reply"
                                className={styles.readerIconButton}
                                data-tooltip="Reply"
                                onClick={() => replyToMessage(message)}
                                type="button"
                              >
                                <Reply size={18} />
                              </button>
                              <button
                                aria-label="More message options"
                                className={styles.readerIconButton}
                                data-tooltip="More"
                                onClick={() => setMessageMenuId(messageMenuId === message.id ? null : message.id)}
                                type="button"
                              >
                                <EllipsisVertical size={18} />
                              </button>
                            </div>
                          </div>
                          {messageMenuId === `reaction-${message.id}` ? (
                            <div className={styles.inlineActionMenu} aria-label="Choose reaction">
                              {composeEmojis.slice(0, 8).map(emoji => (
                                <button
                                  aria-label={`React with ${emoji}`}
                                  key={emoji}
                                  onClick={() => addReactionToMessage(message.id, emoji)}
                                  type="button"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          ) : null}
                          {messageMenuId === message.id ? (
                            <div className={styles.inlineActionMenu} aria-label="Message actions">
                              <button onClick={() => void copyMessageLink(message)} type="button">Copy link</button>
                              <button onClick={() => downloadMessage(message)} type="button">Download</button>
                              <button onClick={() => replyToMessage(message)} type="button">Reply</button>
                            </div>
                          ) : null}
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

              <div className={styles.insightBar} aria-label="Mailbox insights">
                <span><strong>{unreadCount}</strong> unread</span>
                <span><strong>{starredCount}</strong> starred</span>
                <span><strong>{visibleThreads.length}</strong> conversations</span>
                {query !== debouncedQuery ? <span>Refining search...</span> : null}
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

              <div
                className={styles.messageList}
                onScroll={event => {
                  const element = event.currentTarget;
                  setListScrollTop(element.scrollTop);
                  if (element.scrollTop + element.clientHeight >= element.scrollHeight - 240) {
                    void loadNextPage();
                  }
                }}
              >
                {isLoadingMessages && messages.length === 0 ? (
                  <div className={styles.loadingState}>Loading mail...</div>
                ) : visibleThreads.length ? (
                  <>
                    <div style={{ height: virtualStart * 44 }} />
                    {renderedThreads.map(thread => (
                      <MessageRow
                        isSelected={selectedIdSet.has(thread.id)}
                        key={thread.id}
                        onKeyDown={openMessageFromKeyboard}
                        onOpenCompose={openComposeToContact}
                        onSelect={openMessage}
                        onShowStatus={showContactToolStatus}
                        onToggleSelect={toggleSelected}
                        onToggleStarred={toggleStarred}
                        thread={thread}
                      />
                    ))}
                    <div style={{ height: Math.max(0, (visibleThreads.length - virtualEnd) * 44) }} />
                  </>
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
                {isLoadingMore ? <div className={styles.loadingState}>Loading older mail...</div> : null}
              </div>
            </div>
          )}
        </section>
      </section>

      {deleteConfirm ? (
        <DeleteConfirmDialog
          confirm={deleteConfirm}
          isDeleting={isDeleting}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={confirmDelete}
        />
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
                  disabled={isSending || isSavingDraft}
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
                  disabled={isSending || isSavingDraft}
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
                  disabled={isSending || isSavingDraft}
                  onClick={saveDraftAndClose}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className={styles.composeLine}>
              <span>From</span>
              <div className={styles.composeFromWrap}>
                {config.senders?.length ? (
                  <select
                    aria-label="Sender"
                    className={styles.composeSelect}
                    disabled={isSending}
                    onChange={e => {
                      if (e.target.value === '__add_new__') {
                        setManageSendersOpen(true);
                      } else {
                        updateComposeField('from')(e);
                      }
                    }}
                    value={composeFrom}
                  >
                    {config.senders.map(sender => (
                      <option key={sender.email} value={sender.email}>
                        {sender.label}
                      </option>
                    ))}
                    <option value="__add_new__">
                      + Manage / Add @chefu.co.za address...
                    </option>
                  </select>
                ) : (
                  <input
                    aria-label="Sender"
                    disabled={isSending}
                    onChange={updateComposeField('from')}
                    placeholder="Name <email@chefu.co.za>"
                    value={composeFrom}
                  />
                )}
                <button
                  type="button"
                  className={styles.manageSendersButton}
                  onClick={() => setManageSendersOpen(true)}
                  data-tooltip="Manage sender addresses (@chefu.co.za)"
                  aria-label="Manage sender addresses"
                >
                  <AtSign size={14} />
                  <span>Addresses</span>
                </button>
              </div>
            </div>
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

      <ManageSendersModal
        isOpen={manageSendersOpen}
        onClose={() => setManageSendersOpen(false)}
        onSenderAdded={handleSenderAdded}
        onSenderRemoved={handleSenderRemoved}
        onSelectSender={email => {
          setComposeFields(prev => ({ ...prev, from: email }));
        }}
        senders={config.senders || []}
      />
    </main>
  );
}
