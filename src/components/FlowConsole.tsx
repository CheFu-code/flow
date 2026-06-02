'use client';

import {
  ArrowLeft,
  CircleHelp,
  FileText,
  Grid3X3,
  Inbox,
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
import { useMemo, useState } from 'react';
import styles from './FlowConsole.module.css';

type MailFolder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'bin' | 'allmail';

type StoredFolder = Exclude<MailFolder, 'starred' | 'allmail'>;

type MailMessage = {
  body: string;
  date: string;
  folder: StoredFolder;
  from: string;
  id: string;
  name: string;
  starred: boolean;
  subject: string;
  to: string;
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

const initialMessages: MailMessage[] = [
  {
    body:
      'Hi team,\n\nThe first Flow interface draft is ready for review. Please check the inbox, compose window, and folder navigation before we connect the sender backend.',
    date: '2026-06-02T10:30:00+02:00',
    folder: 'inbox',
    from: 'design@chefuinc.com',
    id: 'flow-001',
    name: 'Design Team',
    starred: true,
    subject: 'Flow UI review',
    to: 'flow@chefuinc.com',
    unread: true,
  },
  {
    body:
      'The campaign copy has been trimmed and is ready to drop into a test message. We can wire the actual delivery endpoint after the UI feels right.',
    date: '2026-06-01T16:15:00+02:00',
    folder: 'inbox',
    from: 'marketing@chefuinc.com',
    id: 'flow-002',
    name: 'Marketing',
    starred: false,
    subject: 'June campaign copy',
    to: 'flow@chefuinc.com',
    unread: false,
  },
  {
    body:
      'Thanks for the quick turn-around. I moved the contact list cleanup to tomorrow so the UI can land first.',
    date: '2026-05-31T12:45:00+02:00',
    folder: 'sent',
    from: 'flow@chefuinc.com',
    id: 'flow-003',
    name: 'Flow Mail',
    starred: false,
    subject: 'Re: Recipient cleanup',
    to: 'ops@chefuinc.com',
    unread: false,
  },
  {
    body:
      'Hi,\n\nI wanted to share a short product update with the CheFu audience. The final link and CTA still need polish.',
    date: '2026-05-30T09:10:00+02:00',
    folder: 'drafts',
    from: 'flow@chefuinc.com',
    id: 'flow-004',
    name: 'Draft',
    starred: false,
    subject: 'Product update draft',
    to: 'subscribers@chefuinc.com',
    unread: false,
  },
  {
    body:
      'This older test message is parked in the bin while we reset the sender interface.',
    date: '2026-05-28T14:20:00+02:00',
    folder: 'bin',
    from: 'qa@chefuinc.com',
    id: 'flow-005',
    name: 'QA',
    starred: false,
    subject: 'Old test message',
    to: 'flow@chefuinc.com',
    unread: false,
  },
];

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

function getFolderLabel(folder: MailFolder) {
  return folderItems.find(item => item.folder === folder)?.title || 'Inbox';
}

function isMessageInFolder(message: MailMessage, folder: MailFolder) {
  if (folder === 'starred') return message.starred;
  if (folder === 'allmail') return message.folder !== 'bin';
  return message.folder === folder;
}

function makeMessageId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `flow-${Date.now()}`;
}

export default function FlowConsole() {
  const [activeFolder, setActiveFolder] = useState<MailFolder>('inbox');
  const [composeFields, setComposeFields] =
    useState<ComposeFields>(initialCompose);
  const [composeOpen, setComposeOpen] = useState(false);
  const [messages, setMessages] = useState<MailMessage[]>(initialMessages);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const folderCounts = useMemo(
    () =>
      folderItems.reduce(
        (counts, item) => ({
          ...counts,
          [item.folder]: messages.filter(message =>
            isMessageInFolder(message, item.folder),
          ).length,
        }),
        {} as Record<MailFolder, number>,
      ),
    [messages],
  );

  const visibleMessages = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return messages.filter(message => {
      if (!isMessageInFolder(message, activeFolder)) return false;
      if (!cleanQuery) return true;

      return [
        message.body,
        message.from,
        message.name,
        message.subject,
        message.to,
      ]
        .join(' ')
        .toLowerCase()
        .includes(cleanQuery);
    });
  }, [activeFolder, messages, query]);

  const selectedMessage = useMemo(
    () => messages.find(message => message.id === selectedMessageId) || null,
    [messages, selectedMessageId],
  );

  const allVisibleSelected =
    visibleMessages.length > 0 &&
    visibleMessages.every(message => selectedIds.includes(message.id));

  const selectedFolderTitle = getFolderLabel(activeFolder);
  const activeEmptyState = emptyStates[activeFolder];

  const changeFolder = (folder: MailFolder) => {
    setActiveFolder(folder);
    setSelectedIds([]);
    setSelectedMessageId(null);
    setStatus(null);
  };

  const openMessage = (messageId: string) => {
    setSelectedMessageId(messageId);
    setSelectedIds([]);
    setMessages(current =>
      current.map(message =>
        message.id === messageId ? { ...message, unread: false } : message,
      ),
    );
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
    setMessages(current =>
      current.map(message =>
        message.id === messageId
          ? { ...message, starred: !message.starred }
          : message,
      ),
    );
  };

  const openMessageFromKeyboard = (
    event: KeyboardEvent<HTMLDivElement>,
    messageId: string,
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openMessage(messageId);
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;

    if (activeFolder === 'bin') {
      setMessages(current =>
        current.filter(message => !selectedIds.includes(message.id)),
      );
      setStatus({ kind: 'success', text: 'Selected conversations deleted.' });
    } else {
      setMessages(current =>
        current.map(message =>
          selectedIds.includes(message.id)
            ? { ...message, folder: 'bin', unread: false }
            : message,
        ),
      );
      setStatus({ kind: 'info', text: 'Selected conversations moved to Bin.' });
    }

    setSelectedIds([]);
    setSelectedMessageId(null);
  };

  const deleteOpenMessage = () => {
    if (!selectedMessage) return;

    if (selectedMessage.folder === 'bin') {
      setMessages(current =>
        current.filter(message => message.id !== selectedMessage.id),
      );
      setStatus({ kind: 'success', text: 'Conversation deleted.' });
    } else {
      setMessages(current =>
        current.map(message =>
          message.id === selectedMessage.id
            ? { ...message, folder: 'bin', unread: false }
            : message,
        ),
      );
      setStatus({ kind: 'info', text: 'Conversation moved to Bin.' });
    }

    setSelectedMessageId(null);
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

  const saveDraftAndClose = () => {
    if (hasDraftContent) {
      const now = new Date().toISOString();

      setMessages(current => [
        {
          body: composeFields.body,
          date: now,
          folder: 'drafts',
          from: 'flow@chefuinc.com',
          id: makeMessageId(),
          name: 'Draft',
          starred: false,
          subject: composeFields.subject || '(no subject)',
          to: composeFields.to || 'recipient@example.com',
          unread: false,
        },
        ...current,
      ]);
      setStatus({ kind: 'success', text: 'Draft saved locally.' });
    }

    setComposeOpen(false);
    resetCompose();
  };

  const discardCompose = () => {
    setComposeOpen(false);
    resetCompose();
  };

  const submitCompose = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const now = new Date().toISOString();

    setMessages(current => [
      {
        body: composeFields.body,
        date: now,
        folder: 'sent',
        from: 'flow@chefuinc.com',
        id: makeMessageId(),
        name: 'Flow Mail',
        starred: false,
        subject: composeFields.subject || '(no subject)',
        to: composeFields.to || 'recipient@example.com',
        unread: false,
      },
      ...current,
    ]);
    setActiveFolder('sent');
    setSelectedMessageId(null);
    setSelectedIds([]);
    setComposeOpen(false);
    setStatus({ kind: 'success', text: 'Message added to Sent.' });
    resetCompose();
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
          <button aria-label="Account" className={styles.iconButton} type="button">
            <UserCircle size={25} />
          </button>
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
                <span>{getFolderLabel(selectedMessage.folder)}</span>
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
                          ? selectedMessage.to.split('@')[0]
                          : selectedMessage.name}
                      </strong>
                      <span>
                        {' '}
                        &lt;
                        {selectedMessage.folder === 'sent'
                          ? selectedMessage.to
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
                {visibleMessages.length ? (
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
                          ? `To:${message.to.split('@')[0]}`
                          : message.name}
                      </span>
                      <span className={styles.preview}>
                        <span>{message.subject}</span>
                        {message.body ? <em>- {message.body}</em> : null}
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
