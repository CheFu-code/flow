'use client';

import {
  ArrowLeft,
  CircleHelp,
  Clock3,
  FileText,
  Grid3X3,
  Inbox,
  KeyRound,
  LogOut,
  Mail,
  Menu,
  Pencil,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Star,
  Trash2,
  UserCircle,
  X,
} from 'lucide-react';
import type { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { apiUrl, flowHeaders } from '@/lib/api';
import styles from './FlowConsole.module.css';

type MailFolder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'bin' | 'allmail';

type MessageFolder =
  | MailFolder
  | 'archived'
  | 'campaigns'
  | 'scheduled'
  | 'trash';

type MailMessage = {
  attachments: number;
  body: string;
  date: string;
  direction: 'inbound' | 'outbound';
  folder: MessageFolder;
  from: string;
  html?: string;
  id: string;
  name: string;
  preview: string;
  starred: boolean;
  subject: string;
  to: string[];
  unread: boolean;
};

type ComposeFields = {
  body: string;
  subject: string;
  to: string;
};

type StatusMessage = {
  kind: 'info' | 'success';
  text: string;
};

type AccessSession = {
  expiresAt: string;
  keyLabel: string;
};

type FlowConfig = {
  defaultFrom: string;
  defaultReplyTo: string;
  inboundAddress?: string;
  inboundConfigured?: boolean;
  maxRecipients: number;
  resendConfigured: boolean;
  senders?: Array<{ email: string; label: string }>;
};

type BackendMessage = {
  attachments?: number;
  createdAt?: string;
  direction: 'inbound' | 'outbound';
  folder: string;
  from: string;
  html?: string;
  id: string;
  preview?: string;
  receivedAt?: string;
  sentAt?: string;
  starred?: boolean;
  subject?: string;
  text?: string;
  to?: string[];
  unread?: boolean;
};

type BackendMessagesResponse = {
  counts?: Partial<Record<string, number>>;
  messages?: BackendMessage[];
};

type FlowConsoleProps = {
  accessSession: AccessSession;
  onLock: () => Promise<void>;
};

const folderItems: Array<{
  folder: MailFolder;
  icon: typeof Inbox;
  title: string;
}> = [
  { folder: 'inbox', icon: Inbox, title: 'Inbox' },
  { folder: 'starred', icon: Star, title: 'Starred' },
  { folder: 'sent', icon: Send, title: 'Sent' },
  { folder: 'drafts', icon: FileText, title: 'Drafts' },
  { folder: 'bin', icon: Trash2, title: 'Bin' },
  { folder: 'allmail', icon: Mail, title: 'All Mail' },
];

const emptyStates: Record<MailFolder, { heading: string; subHeading: string }> = {
  allmail: {
    heading: 'No mail yet',
    subHeading: 'Messages across folders will appear here.',
  },
  bin: {
    heading: 'No conversations in Bin.',
    subHeading: '',
  },
  drafts: {
    heading: "You don't have any saved drafts.",
    subHeading:
      "Saving a draft allows you to keep a message you aren't ready to send yet.",
  },
  inbox: {
    heading: 'Your inbox is empty',
    subHeading: "Mails that don't appear in other tabs will be shown here.",
  },
  sent: {
    heading: 'No sent messages!',
    subHeading: 'Send one now!',
  },
  starred: {
    heading: 'No starred messages',
    subHeading:
      'Stars let you give messages a special status to make them easier to find.',
  },
};

const emptyFolderCounts: Record<MailFolder, number> = {
  allmail: 0,
  bin: 0,
  drafts: 0,
  inbox: 0,
  sent: 0,
  starred: 0,
};

const defaultConfig: FlowConfig = {
  defaultFrom: 'Flow Mail <mail@flow.chefuinc.com>',
  defaultReplyTo: '',
  inboundAddress: '',
  inboundConfigured: false,
  maxRecipients: 100,
  resendConfigured: false,
  senders: [],
};

const initialCompose: ComposeFields = {
  body: '',
  subject: '',
  to: '',
};

function formatListDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(value));
}

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function formatSessionExpiry(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function getFolderLabel(folder: MailFolder) {
  return folderItems.find(item => item.folder === folder)?.title || 'Inbox';
}

function getMessageFolderLabel(folder: MessageFolder) {
  if (folder === 'trash') return 'Bin';
  if (folder === 'archived') return 'Archived';
  if (folder === 'campaigns') return 'Campaigns';
  if (folder === 'scheduled') return 'Scheduled';
  return getFolderLabel(folder);
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || 'F';
}

function backendFolderFor(folder: MailFolder) {
  if (folder === 'bin') return 'trash';
  return folder;
}

function uiFolderFor(folder: string): MessageFolder {
  if (folder === 'trash') return 'bin';
  if (
    ['inbox', 'sent', 'drafts', 'starred', 'allmail'].includes(folder)
  ) {
    return folder as MailFolder;
  }
  if (['archived', 'campaigns', 'scheduled'].includes(folder)) {
    return folder as MessageFolder;
  }
  return 'inbox';
}

function participantName(message: BackendMessage) {
  if (message.direction === 'outbound') return 'Flow Mail';
  const address = message.from || '';
  const match = address.match(/^(.+?)\s*<(.+?)>$/);
  if (match?.[1]) return match[1].replace(/^"|"$/g, '').trim();
  return address.split('@')[0] || 'Sender';
}

function toMailMessage(message: BackendMessage): MailMessage {
  return {
    attachments: Number(message.attachments) || 0,
    body: message.text || message.preview || '',
    date:
      message.sentAt ||
      message.receivedAt ||
      message.createdAt ||
      new Date().toISOString(),
    direction: message.direction === 'outbound' ? 'outbound' : 'inbound',
    folder: uiFolderFor(message.folder),
    from: message.from || '',
    html: message.html,
    id: message.id,
    name: participantName(message),
    preview: message.preview || message.text || '',
    starred: Boolean(message.starred),
    subject: message.subject || '(no subject)',
    to: Array.isArray(message.to) ? message.to : [],
    unread: Boolean(message.unread),
  };
}

function mapCounts(counts?: Partial<Record<string, number>>) {
  return {
    allmail: Number(counts?.allmail) || 0,
    bin: Number(counts?.trash || counts?.bin) || 0,
    drafts: Number(counts?.drafts) || 0,
    inbox: Number(counts?.inbox) || 0,
    sent: Number(counts?.sent) || 0,
    starred: Number(counts?.starred) || 0,
  };
}

function parseRecipients(value: string) {
  return [...new Set(
    value
      .split(/[,\s;]+/)
      .map(item => item.trim())
      .filter(item => /^\S+@\S+\.\S+$/.test(item)),
  )];
}

async function responseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Flow request failed.');
  }

  return data;
}

export default function FlowConsole({
  accessSession,
  onLock,
}: FlowConsoleProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeFolder, setActiveFolder] = useState<MailFolder>('inbox');
  const [composeFields, setComposeFields] =
    useState<ComposeFields>(initialCompose);
  const [composeOpen, setComposeOpen] = useState(false);
  const [config, setConfig] = useState<FlowConfig>(defaultConfig);
  const [folderCounts, setFolderCounts] =
    useState<Record<MailFolder, number>>(emptyFolderCounts);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [query, setQuery] = useState('');
  const [refreshSeq, setRefreshSeq] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const visibleMessages = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return messages.filter(message => {
      if (!cleanQuery) return true;

      return [
        message.body,
        message.from,
        message.name,
        message.preview,
        message.subject,
        message.to.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(cleanQuery);
    });
  }, [messages, query]);

  const selectedMessage = useMemo(
    () => messages.find(message => message.id === selectedMessageId) || null,
    [messages, selectedMessageId],
  );

  const allVisibleSelected =
    visibleMessages.length > 0 &&
    visibleMessages.every(message => selectedIds.includes(message.id));

  const selectedFolderTitle = getFolderLabel(activeFolder);
  const activeEmptyState = emptyStates[activeFolder];
  const accountInitial = getInitial(accessSession.keyLabel);
  const sessionExpiry = formatSessionExpiry(accessSession.expiresAt);

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

  const openMessage = (messageId: string) => {
    const message = messages.find(item => item.id === messageId);

    setSelectedMessageId(messageId);
    setSelectedIds([]);

    if (!message?.unread) return;

    setMessages(current =>
      current.map(item =>
        item.id === messageId ? { ...item, unread: false } : item,
      ),
    );

    fetch(apiUrl(`/flow/messages/${messageId}/read`), {
      credentials: 'include',
      headers: flowHeaders(),
      method: 'POST',
    }).catch(() => {
      setMessages(current =>
        current.map(item =>
          item.id === messageId ? { ...item, unread: true } : item,
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
    setSelectedIds(event.target.checked ? visibleMessages.map(item => item.id) : []);
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

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;

    try {
      await Promise.all(
        selectedIds.map(messageId =>
          fetch(
            apiUrl(
              activeFolder === 'bin'
                ? `/flow/messages/${messageId}`
                : `/flow/messages/${messageId}/trash`,
            ),
            {
              credentials: 'include',
              headers: flowHeaders(),
              method: activeFolder === 'bin' ? 'DELETE' : 'POST',
            },
          ).then(response => responseJson(response)),
        ),
      );

      setStatus(
        activeFolder === 'bin'
          ? { kind: 'success', text: 'Selected conversations deleted.' }
          : { kind: 'info', text: 'Selected conversations moved to Bin.' },
      );
      setSelectedIds([]);
      setSelectedMessageId(null);
      refreshMessages();
    } catch (error) {
      setStatus({
        kind: 'info',
        text:
          error instanceof Error ? error.message : 'Delete action failed.',
      });
    }
  };

  const deleteOpenMessage = async () => {
    if (!selectedMessage) return;

    try {
      await fetch(
        apiUrl(
          selectedMessage.folder === 'bin'
            ? `/flow/messages/${selectedMessage.id}`
            : `/flow/messages/${selectedMessage.id}/trash`,
        ),
        {
          credentials: 'include',
          headers: flowHeaders(),
          method: selectedMessage.folder === 'bin' ? 'DELETE' : 'POST',
        },
      ).then(response => responseJson(response));

      setStatus(
        selectedMessage.folder === 'bin'
          ? { kind: 'success', text: 'Conversation deleted.' }
          : { kind: 'info', text: 'Conversation moved to Bin.' },
      );
      setSelectedMessageId(null);
      refreshMessages();
    } catch (error) {
      setStatus({
        kind: 'info',
        text:
          error instanceof Error ? error.message : 'Delete action failed.',
      });
    }
  };

  const updateComposeField =
    (field: keyof ComposeFields) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setComposeFields(current => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const resetCompose = () => {
    setComposeFields(initialCompose);
  };

  const hasDraftContent =
    composeFields.to.trim() ||
    composeFields.subject.trim() ||
    composeFields.body.trim();

  const saveDraftAndClose = async () => {
    if (hasDraftContent) {
      try {
        await fetch(apiUrl('/flow/drafts'), {
          body: JSON.stringify({
            body: composeFields.body,
            from: config.defaultFrom,
            subject: composeFields.subject,
            to: parseRecipients(composeFields.to),
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

  const submitCompose = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const recipients = parseRecipients(composeFields.to);

    if (!recipients.length) {
      setStatus({ kind: 'info', text: 'Enter at least one valid recipient.' });
      return;
    }

    try {
      const response = await fetch(apiUrl('/flow/send'), {
        body: JSON.stringify({
          action: 'campaign',
          from: config.defaultFrom,
          html: composeFields.body,
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
    }
  };

  return (
    <main className={styles.mailShell}>
      <header className={styles.header}>
        <button
          aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          className={styles.iconButton}
          onClick={() => setSidebarOpen(open => !open)}
          type="button"
        >
          <Menu size={22} />
        </button>

        <div className={styles.brand} aria-label="Flow Mail">
          <span className={styles.brandMark}>
            <Mail size={24} />
          </span>
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
          <button aria-label="Help" className={styles.iconButton} type="button">
            <CircleHelp size={22} />
          </button>
          <button aria-label="Settings" className={styles.iconButton} type="button">
            <Settings size={22} />
          </button>
          <button aria-label="Apps" className={styles.iconButton} type="button">
            <Grid3X3 size={22} />
          </button>
          <div className={styles.accountWrap}>
            <button
              aria-expanded={accountOpen}
              aria-label="Account details"
              className={styles.accountButton}
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
          {selectedMessage ? (
            <article className={styles.reader}>
              <div className={styles.readerToolbar}>
                <button
                  aria-label="Back to message list"
                  className={styles.readerIconButton}
                  onClick={() => setSelectedMessageId(null)}
                  type="button"
                >
                  <ArrowLeft size={18} />
                </button>
                <button
                  aria-label="Delete conversation"
                  className={styles.readerIconButton}
                  onClick={deleteOpenMessage}
                  type="button"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <h1 className={styles.readerSubject}>
                {selectedMessage.subject}
                <span>{getMessageFolderLabel(selectedMessage.folder)}</span>
              </h1>

              <div className={styles.readerBody}>
                <div className={styles.readerAvatar}>
                  {selectedMessage.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.readerContent}>
                  <div className={styles.readerMeta}>
                    <div>
                      <strong>
                        {selectedMessage.folder === 'sent'
                          ? selectedMessage.to[0]?.split('@')[0] || 'recipient'
                          : selectedMessage.name}
                      </strong>
                      <span>
                        {' '}
                        &lt;
                        {selectedMessage.folder === 'sent'
                          ? selectedMessage.to.join(', ')
                          : selectedMessage.from}
                        &gt;
                      </span>
                    </div>
                    <time>{formatMessageDate(selectedMessage.date)}</time>
                  </div>
                  <p>{selectedMessage.body}</p>
                </div>
              </div>
            </article>
          ) : (
            <>
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
                    disabled={selectedIds.length === 0}
                    onClick={deleteSelected}
                    type="button"
                  >
                    <Trash2 size={19} />
                  </button>
                </div>
                <div className={styles.folderSummary}>
                  <strong>{selectedFolderTitle}</strong>
                  <span>
                    {visibleMessages.length} of {folderCounts[activeFolder]} shown
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
                ) : visibleMessages.length ? (
                  visibleMessages.map(message => (
                    <div
                      className={
                        message.unread
                          ? `${styles.messageRow} ${styles.messageUnread}`
                          : styles.messageRow
                      }
                      key={message.id}
                      onClick={() => openMessage(message.id)}
                      onKeyDown={event => openMessageFromKeyboard(event, message.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <input
                        aria-label={`Select ${message.subject}`}
                        checked={selectedIds.includes(message.id)}
                        className={styles.checkbox}
                        onChange={() => toggleSelected(message.id)}
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
                        onClick={event => toggleStarred(event, message.id)}
                        type="button"
                      >
                        <Star
                          fill={message.starred ? 'currentColor' : 'none'}
                          size={18}
                        />
                      </button>
                      <span className={styles.sender}>
                        {message.folder === 'sent'
                          ? `To:${message.to[0]?.split('@')[0] || 'recipient'}`
                          : message.name}
                      </span>
                      <span className={styles.preview}>
                        <span>{message.subject}</span>
                        {message.preview || message.body ? (
                          <em>- {message.preview || message.body}</em>
                        ) : null}
                      </span>
                      <time>{formatListDate(message.date)}</time>
                    </div>
                  ))
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
            </>
          )}
        </section>
      </section>

      {composeOpen ? (
        <div
          aria-label="Compose email"
          aria-modal="true"
          className={styles.composeOverlay}
          role="dialog"
        >
          <form className={styles.composeDialog} onSubmit={submitCompose}>
            <div className={styles.composeHeader}>
              <strong>New Message</strong>
              <button
                aria-label="Close compose"
                className={styles.composeIconButton}
                onClick={saveDraftAndClose}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <label className={styles.composeLine}>
              <span>Recipients</span>
              <input
                onChange={updateComposeField('to')}
                value={composeFields.to}
              />
            </label>
            <label className={styles.composeLine}>
              <span>Subject</span>
              <input
                onChange={updateComposeField('subject')}
                value={composeFields.subject}
              />
            </label>
            <textarea
              aria-label="Message body"
              className={styles.composeBody}
              onChange={updateComposeField('body')}
              value={composeFields.body}
            />

            <div className={styles.composeFooter}>
              <button className={styles.sendButton} type="submit">
                Send
              </button>
              <button
                aria-label="Discard draft"
                className={styles.composeIconButton}
                onClick={discardCompose}
                type="button"
              >
                <Trash2 size={19} />
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
