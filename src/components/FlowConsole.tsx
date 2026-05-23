'use client';

import {
  AlertCircle,
  Archive,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  Inbox,
  Mail,
  MoreVertical,
  Paperclip,
  Plus,
  Reply,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Tags,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { apiUrl, flowHeaders } from '@/lib/api';
import type { FlowRecipient } from '@/lib/email-schema';
import { renderEmailShell, textToHtml } from '@/lib/email-templates';

type FolderName = 'inbox' | 'sent' | 'scheduled' | 'campaigns' | 'archived' | 'trash';

type Delivery = {
  action: string;
  count: number;
  id: string;
  sentAt: string;
  subject: string;
};

type FlowConfig = {
  defaultFrom: string;
  defaultReplyTo: string;
  inboundAddress?: string;
  inboundConfigured?: boolean;
  maxRecipients: number;
  resendConfigured: boolean;
  senders?: SenderIdentity[];
};

type SenderIdentity = {
  email: string;
  label: string;
};

type MailThread = {
  id: string;
  folder: FolderName;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string[];
  subject: string;
  preview: string;
  text?: string;
  html?: string;
  receivedAt?: string;
  sentAt?: string;
  unread: boolean;
  starred: boolean;
  label?: string;
  attachments: number;
};

type MessagesResponse = {
  counts?: Partial<Record<FolderName, number>>;
  messages: MailThread[];
};

const folderDefinitions: Array<{
  name: string;
  folder: FolderName;
  icon: ComponentType<{ className?: string }>;
}> = [
  { name: 'Inbox', folder: 'inbox', icon: Inbox },
  { name: 'Sent', folder: 'sent', icon: Send },
  { name: 'Scheduled', folder: 'scheduled', icon: Clock },
  { name: 'Campaigns', folder: 'campaigns', icon: Tags },
  { name: 'Archived', folder: 'archived', icon: Archive },
  { name: 'Trash', folder: 'trash', icon: Trash2 },
];

export default function FlowConsole() {
  const [activeFolder, setActiveFolder] = useState<FolderName>('inbox');
  const [audienceName, setAudienceName] = useState('Manual audience');
  const [body, setBody] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [config, setConfig] = useState<FlowConfig>({
    defaultFrom: 'Flow Mail <mail@flow.chefuinc.com>',
    defaultReplyTo: '',
    inboundAddress: '',
      inboundConfigured: false,
      maxRecipients: 100,
      resendConfigured: false,
      senders: [],
  });
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = window.localStorage.getItem('flow-deliveries');
    return stored ? JSON.parse(stored) : [];
  });
  const [from, setFrom] = useState('Flow Mail <mail@flow.chefuinc.com>');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [manualRecipient, setManualRecipient] = useState('');
  const [messages, setMessages] = useState<MailThread[]>([]);
  const [messageCounts, setMessageCounts] = useState<
    Partial<Record<FolderName, number>>
  >({});
  const [preheader, setPreheader] = useState('');
  const [recipients, setRecipients] = useState<FlowRecipient[]>([]);
  const [refreshSeq, setRefreshSeq] = useState(0);
  const [replyTo, setReplyTo] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [subject, setSubject] = useState('');
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    fetch(apiUrl('/flow/config'))
      .then(response => response.json())
      .then((nextConfig: FlowConfig) => {
        setConfig(nextConfig);
        setFrom(nextConfig.defaultFrom || nextConfig.senders?.[0]?.email || '');
        setReplyTo(nextConfig.defaultReplyTo);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch(apiUrl(`/flow/messages?folder=${activeFolder}`), {
      headers: flowHeaders(),
    })
      .then(response => response.json())
      .then((data: MessagesResponse) => {
        if (cancelled) return;
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setMessageCounts(data.counts || {});
        setSelectedThreadId(data.messages?.[0]?.id || null);
      })
      .catch(() => {
        if (cancelled) return;
        setMessages([]);
        setSelectedThreadId(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFolder, refreshSeq]);

  useEffect(() => {
    localStorage.setItem('flow-deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  const selectedThread = useMemo(
    () => messages.find(thread => thread.id === selectedThreadId) || null,
    [messages, selectedThreadId],
  );
  const previewHtml = useMemo(
    () =>
      renderEmailShell({
        body: textToHtml(body || 'Your message will appear here.'),
        ctaLabel,
        ctaUrl,
        preheader,
        title: subject || 'New message',
      }),
    [body, ctaLabel, ctaUrl, preheader, subject],
  );
  const readinessScore = useMemo(() => {
    let score = 100;
    if (!config.resendConfigured) score -= 35;
    if (!config.inboundConfigured) score -= 15;
    if (!from.includes('@')) score -= 20;
    if (!subject.trim()) score -= 15;
    if (!body.trim()) score -= 15;
    if (!testEmail && recipients.length === 0) score -= 10;
    return Math.max(0, score);
  }, [
    body,
    config.inboundConfigured,
    config.resendConfigured,
    from,
    recipients.length,
    subject,
    testEmail,
  ]);

  const importCsv = async (file?: File) => {
    if (!file) return;

    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .map(row => row.trim())
      .filter(Boolean);
    const imported = rows
      .slice(rows[0]?.toLowerCase().includes('email') ? 1 : 0)
      .map(row => {
        const [email, firstName = '', lastName = '', company = ''] = row
          .split(',')
          .map(cell => cell.trim());
        return { company, email, firstName, lastName, tags: ['csv'] };
      })
      .filter(row => /^\S+@\S+\.\S+$/.test(row.email));

    if (imported.length) {
      setRecipients(imported);
      setStatus({
        kind: 'success',
        text: `Imported ${imported.length} recipients.`,
      });
    }
  };

  const addRecipient = () => {
    const email = manualRecipient.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setStatus({ kind: 'error', text: 'Enter a valid recipient email.' });
      return;
    }

    setRecipients(prev => [
      ...prev,
      {
        company: 'CheFu Inc',
        email,
        firstName: email.split('@')[0],
        lastName: '',
        tags: ['manual'],
      },
    ]);
    setManualRecipient('');
    setStatus(null);
  };

  const sendEmail = async (action: 'test' | 'campaign') => {
    setIsSending(true);
    setStatus(null);

    try {
      const response = await fetch(apiUrl('/flow/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...flowHeaders() },
        body: JSON.stringify({
          action,
          audienceName,
          ctaLabel,
          ctaUrl,
          from,
          html: body,
          preheader,
          recipients,
          replyTo,
          subject,
          tags: ['flow'],
          testEmail,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Send failed.');
      }

      setDeliveries(prev => [
        {
          action,
          count: data.count,
          id: crypto.randomUUID(),
          sentAt: data.sentAt,
          subject: subject || '(no subject)',
        },
        ...prev,
      ]);
      setStatus({
        kind: 'success',
        text:
          action === 'test'
            ? 'Test email sent through Flow.'
            : `Email sent to ${data.count} recipients.`,
      });
      setActiveFolder('sent');
      setIsLoadingMessages(true);
      setRefreshSeq(value => value + 1);
    } catch (error) {
      setStatus({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Send failed.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="flow-shell">
      <aside className="mail-rail">
        <div className="brand-lockup">
          <div className="brand-mark">F</div>
          <div>
            <p className="brand-kicker">CheFu Inc</p>
            <h1>Flow Mail</h1>
          </div>
        </div>

        <Button
          type="button"
          className="compose-button"
          onClick={() => setComposeOpen(true)}
        >
          <Plus className="size-5" />
          Compose
        </Button>

        <nav className="folder-list" aria-label="Mail folders">
          {folderDefinitions.map(folder => (
            <button
              type="button"
              key={folder.name}
              className={activeFolder === folder.folder ? 'folder active' : 'folder'}
              onClick={() => {
                if (activeFolder === folder.folder) return;
                setIsLoadingMessages(true);
                setActiveFolder(folder.folder);
              }}
            >
              <folder.icon className="size-4" />
              <span>{folder.name}</span>
              <span className="folder-count">
                {messageCounts[folder.folder] || 0}
              </span>
            </button>
          ))}
        </nav>

        <div className="rail-card">
          <ConnectionRow
            connected={config.resendConfigured}
            label={config.resendConfigured ? 'Sending connected' : 'Sending pending'}
          />
          <ConnectionRow
            connected={Boolean(config.inboundConfigured)}
            label={
              config.inboundConfigured ? 'Inbound protected' : 'Inbound pending'
            }
          />
        </div>
      </aside>

      <section className="mail-list-pane">
        <header className="topbar">
          <div className="searchbox">
            <Search className="size-4" />
            <input placeholder="Search mail, recipients, subjects" />
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Settings">
            <Settings className="size-5" />
          </Button>
        </header>

        {status ? (
          <div className={`status-banner ${status.kind}`}>{status.text}</div>
        ) : null}

        <div className="section-heading">
          <div>
            <p>{activeFolder}</p>
            <h2>{folderDefinitions.find(item => item.folder === activeFolder)?.name}</h2>
          </div>
          <Badge variant="secondary">
            {messages.filter(thread => thread.unread).length} unread
          </Badge>
        </div>

        <div className="thread-list">
          {isLoadingMessages ? (
            <EmptyState title="Loading mail" body="Checking your Flow mailbox..." />
          ) : messages.length === 0 ? (
            <EmptyState
              title="No mail here yet"
              body={
                activeFolder === 'inbox'
                  ? 'Connect inbound mail when you are ready to receive messages here.'
                  : 'Messages you send or move to this folder will appear here.'
              }
            />
          ) : (
            messages.map(thread => (
              <button
                type="button"
                key={thread.id}
                className={
                  selectedThreadId === thread.id ? 'thread-row active' : 'thread-row'
                }
                onClick={() => setSelectedThreadId(thread.id)}
              >
                <span
                  className={thread.unread ? 'unread-dot visible' : 'unread-dot'}
                />
                <Star
                  className={thread.starred ? 'size-4 star active' : 'size-4 star'}
                  fill={thread.starred ? 'currentColor' : 'none'}
                />
                <div className="thread-copy">
                  <div className="thread-meta">
                    <strong>
                      {thread.direction === 'outbound'
                        ? `To ${thread.to.join(', ')}`
                        : thread.from}
                    </strong>
                    <span>
                      {formatMessageTime(thread.sentAt || thread.receivedAt)}
                    </span>
                  </div>
                  <p>{thread.subject}</p>
                  <small>{thread.preview}</small>
                </div>
                <span className="thread-label">{thread.label || thread.folder}</span>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="reading-pane">
        <header className="message-toolbar">
          <div>
            <p>{selectedThread?.label || 'Flow Mail'}</p>
            <h2>{selectedThread?.subject || 'Select a message'}</h2>
          </div>
          <div className="toolbar-actions">
            <Button type="button" variant="ghost" size="icon" aria-label="Archive">
              <Archive className="size-5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Reply">
              <Reply className="size-5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="More">
              <MoreVertical className="size-5" />
            </Button>
          </div>
        </header>

        {selectedThread ? (
          <article className="message-body">
            <div className="sender-avatar">
              {(selectedThread.from || 'F').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="message-from">
                <strong>{selectedThread.from}</strong>
                <span>
                  {formatMessageTime(
                    selectedThread.sentAt || selectedThread.receivedAt,
                  )}
                </span>
              </div>
              <p>{selectedThread.text || selectedThread.preview}</p>
            </div>
          </article>
        ) : (
          <div className="message-empty">
            <Mail className="size-10" />
            <h2>Your Flow mailbox is ready</h2>
            <p>
              Choose a message to read it, or compose a new email in plain text.
            </p>
            <Button type="button" onClick={() => setComposeOpen(true)}>
              <Plus className="size-4" />
              Write email
            </Button>
          </div>
        )}
      </section>

      <Sheet open={composeOpen} onOpenChange={setComposeOpen}>
        <SheetContent
          side="right"
          className="compose-sheet w-[min(760px,100vw)] sm:max-w-none"
        >
          <SheetHeader className="compose-sheet-header">
            <SheetTitle>New email</SheetTitle>
            <SheetDescription>
              Write naturally. Flow turns your plain text into a clean email.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="compose-scroll">
            <div className="compose-simple">
              <Field label="To">
                <div className="recipient-add">
                  <Input
                    value={manualRecipient}
                    onChange={event => setManualRecipient(event.target.value)}
                    placeholder="recipient@example.com"
                  />
                  <Button type="button" variant="secondary" onClick={addRecipient}>
                    <UserPlus className="size-4" />
                    Add
                  </Button>
                </div>
                <div className="recipient-chips">
                  {recipients.length === 0 ? (
                    <span>No campaign recipients added.</span>
                  ) : (
                    recipients.map(recipient => (
                      <Badge key={recipient.email} variant="secondary">
                        {recipient.email}
                      </Badge>
                    ))
                  )}
                </div>
              </Field>

              <Field label="Subject">
                <Input
                  value={subject}
                  onChange={event => setSubject(event.target.value)}
                  placeholder="Write a clear subject"
                  className="subject-input"
                />
              </Field>

              <Field label="Message">
                <Textarea
                  value={body}
                  onChange={event => setBody(event.target.value)}
                  placeholder="Hi there,\n\nWrite your email here in normal plain text.\n\nBest,\nCheFu Inc"
                  className="plain-message-input"
                />
              </Field>

              <Separator />

              <TaskSection
                icon={SlidersHorizontal}
                title="Sender and test settings"
                description="Use this when you need to change the sender or send yourself a test."
              >
                <div className="compose-grid">
                  <Field label="From">
                    {config.senders?.length ? (
                      <select
                        value={from}
                        onChange={event => setFrom(event.target.value)}
                        className="select-input"
                      >
                        {config.senders.map(sender => (
                          <option key={sender.email} value={sender.email}>
                            {sender.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={from}
                        onChange={event => setFrom(event.target.value)}
                        placeholder="Name <email@yourdomain.com>"
                      />
                    )}
                  </Field>
                  <Field label="Reply-to">
                    <Input
                      value={replyTo}
                      onChange={event => setReplyTo(event.target.value)}
                      placeholder="reply@flow.chefuinc.com"
                    />
                  </Field>
                  <Field label="Test recipient">
                    <Input
                      value={testEmail}
                      onChange={event => setTestEmail(event.target.value)}
                      placeholder="you@chefuinc.com"
                    />
                  </Field>
                  <Field label="Audience name">
                    <Input
                      value={audienceName}
                      onChange={event => setAudienceName(event.target.value)}
                    />
                  </Field>
                </div>
              </TaskSection>

              <TaskSection
                icon={Upload}
                title="Bulk recipients"
                description="Import a CSV only when sending to many people."
              >
                <label className="secondary-action">
                  <Upload className="size-4" />
                  Import CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={event => void importCsv(event.target.files?.[0])}
                  />
                </label>
              </TaskSection>

              <TaskSection
                icon={Eye}
                title="Preview and call-to-action"
                description="Optional button and formatted preview."
              >
                <div className="compose-grid">
                  <Field label="Preheader">
                    <Input
                      value={preheader}
                      onChange={event => setPreheader(event.target.value)}
                      placeholder="Short inbox preview text"
                    />
                  </Field>
                  <Field label="CTA label">
                    <Input
                      value={ctaLabel}
                      onChange={event => setCtaLabel(event.target.value)}
                      placeholder="Open link"
                    />
                  </Field>
                  <Field label="CTA URL">
                    <Input
                      value={ctaUrl}
                      onChange={event => setCtaUrl(event.target.value)}
                      placeholder="https://..."
                    />
                  </Field>
                </div>
                <iframe title="Email preview" srcDoc={previewHtml} />
              </TaskSection>

              <TaskSection
                icon={BarChart3}
                title="Activity and readiness"
                description="Check recent sends from this browser."
              >
                <div className="inspector-grid compact">
                  <MetricCard
                    icon={ShieldCheck}
                    label="Readiness"
                    value={`${readinessScore}%`}
                  />
                  <MetricCard
                    icon={Users}
                    label="Audience"
                    value={recipients.length.toString()}
                  />
                  <MetricCard
                    icon={BarChart3}
                    label="Limit"
                    value={config.maxRecipients.toString()}
                  />
                </div>
                {deliveries.length === 0 ? (
                  <p className="empty-copy">No sends from this browser yet.</p>
                ) : (
                  <div className="delivery-list">
                    {deliveries.map(item => (
                      <div key={item.id} className="delivery-row">
                        <strong>{item.subject}</strong>
                        <span>
                          {item.count} recipients -{' '}
                          {new Date(item.sentAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TaskSection>
            </div>
          </ScrollArea>

          <SheetFooter className="compose-sheet-footer">
            <div className="compose-icons">
              <Paperclip className="size-4" />
            </div>
            <div className="send-actions">
              <Button
                type="button"
                variant="outline"
                disabled={isSending}
                onClick={() => void sendEmail('test')}
              >
                Send test
              </Button>
              <Button
                type="button"
                disabled={isSending || !config.resendConfigured}
                onClick={() => void sendEmail('campaign')}
              >
                <Send className="size-4" />
                {isSending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </main>
  );
}

function ConnectionRow({
  connected,
  label,
}: {
  connected: boolean;
  label: string;
}) {
  return (
    <div className="connection-row">
      {connected ? (
        <CheckCircle2 className="size-4 text-emerald-600" />
      ) : (
        <AlertCircle className="size-4 text-amber-600" />
      )}
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="empty-state">
      <Mail className="size-8" />
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card">
      <Icon className="size-5" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TaskSection({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <Collapsible className="task-section">
      <CollapsibleTrigger className="task-trigger">
        <div className="task-title">
          <Icon className="size-4" />
          <div>
            <strong>{title}</strong>
            <span>{description}</span>
          </div>
        </div>
        <ChevronDown className="size-4 task-chevron" />
      </CollapsibleTrigger>
      <CollapsibleContent className="task-content">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function formatMessageTime(value?: string) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
