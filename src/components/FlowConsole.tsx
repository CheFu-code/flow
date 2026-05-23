'use client';

import {
  AlertCircle,
  Archive,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  LayoutTemplate,
  Mail,
  MoreVertical,
  Paperclip,
  Plus,
  Reply,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Star,
  Tags,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { apiUrl, flowHeaders } from '@/lib/api';
import type { FlowRecipient } from '@/lib/email-schema';
import {
  applyVariables,
  defaultVariables,
  flowTemplates,
  renderEmailShell,
  textToHtml,
} from '@/lib/email-templates';

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
  maxRecipients: number;
  resendConfigured: boolean;
};

type MailThread = {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  receivedAt: string;
  unread?: boolean;
  starred?: boolean;
  label: string;
};

const seedRecipients: FlowRecipient[] = [
  {
    company: 'CheFu Academy',
    email: 'learner@example.com',
    firstName: 'Learner',
    lastName: 'One',
    tags: ['demo'],
  },
];

const inboxThreads: MailThread[] = [
  {
    id: 'support-1',
    sender: 'Naledi M.',
    subject: 'Question about my course certificate',
    preview:
      'I completed the course yesterday and wanted to confirm when the certificate is available.',
    receivedAt: '09:42',
    unread: true,
    starred: true,
    label: 'Support',
  },
  {
    id: 'academy-1',
    sender: 'CheFu Academy',
    subject: 'Weekly learner digest is ready',
    preview:
      'The new weekly progress summary campaign is ready to review before sending.',
    receivedAt: '08:18',
    unread: true,
    label: 'Campaigns',
  },
  {
    id: 'billing-1',
    sender: 'Stripe',
    subject: 'Payment update for CheFu Inc',
    preview:
      'A learner upgraded to Pro. The account event has been synchronized.',
    receivedAt: 'Yesterday',
    label: 'Billing',
  },
  {
    id: 'security-1',
    sender: 'Security Alerts',
    subject: 'New sign-in from a trusted device',
    preview:
      'A user signed in successfully. The alert email was sent through Resend.',
    receivedAt: 'May 22',
    starred: true,
    label: 'Security',
  },
];

const folders = [
  { name: 'Inbox', count: 12, icon: Inbox },
  { name: 'Sent', count: 38, icon: Send },
  { name: 'Scheduled', count: 4, icon: Clock },
  { name: 'Campaigns', count: 7, icon: Tags },
  { name: 'Archived', count: 92, icon: Archive },
  { name: 'Trash', count: 0, icon: Trash2 },
];

export default function FlowConsole() {
  const [audienceName, setAudienceName] = useState('CheFu learners');
  const [body, setBody] = useState(flowTemplates[0].body);
  const [composeOpen, setComposeOpen] = useState(true);
  const [config, setConfig] = useState<FlowConfig>({
    defaultFrom: 'Flow <onboarding@resend.dev>',
    defaultReplyTo: '',
    maxRecipients: 100,
    resendConfigured: false,
  });
  const [ctaLabel, setCtaLabel] = useState('Open dashboard');
  const [ctaUrl, setCtaUrl] = useState('https://academy.chefuinc.com/dashboard');
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = window.localStorage.getItem('flow-deliveries');
    return stored ? JSON.parse(stored) : [];
  });
  const [from, setFrom] = useState('Flow <onboarding@resend.dev>');
  const [isSending, setIsSending] = useState(false);
  const [preheader, setPreheader] = useState(
    'A useful update from CheFu Academy.',
  );
  const [recipients, setRecipients] =
    useState<FlowRecipient[]>(seedRecipients);
  const [replyTo, setReplyTo] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    flowTemplates[0].id,
  );
  const [selectedThreadId, setSelectedThreadId] = useState(inboxThreads[0].id);
  const [status, setStatus] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [subject, setSubject] = useState(flowTemplates[0].subject);
  const [testEmail, setTestEmail] = useState('');
  const [variables, setVariables] =
    useState<Record<string, string>>(defaultVariables);

  useEffect(() => {
    fetch(apiUrl('/flow/config'))
      .then(response => response.json())
      .then((nextConfig: FlowConfig) => {
        setConfig(nextConfig);
        setFrom(nextConfig.defaultFrom);
        setReplyTo(nextConfig.defaultReplyTo);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    localStorage.setItem('flow-deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  const selectedThread = useMemo(
    () => inboxThreads.find(thread => thread.id === selectedThreadId),
    [selectedThreadId],
  );
  const renderedSubject = useMemo(
    () => applyVariables(subject, variables),
    [subject, variables],
  );
  const renderedBody = useMemo(
    () => applyVariables(body, variables),
    [body, variables],
  );
  const previewHtml = useMemo(
    () =>
      renderEmailShell({
        body: textToHtml(renderedBody),
        ctaLabel,
        ctaUrl,
        preheader,
        title: renderedSubject,
      }),
    [ctaLabel, ctaUrl, preheader, renderedBody, renderedSubject],
  );
  const healthScore = useMemo(() => {
    let score = 100;
    if (!config.resendConfigured) score -= 35;
    if (!from.includes('@')) score -= 20;
    if (!subject.trim()) score -= 20;
    if (recipients.length === 0) score -= 25;
    if (body.length < 80) score -= 10;
    return Math.max(0, score);
  }, [body.length, config.resendConfigured, from, recipients.length, subject]);

  const selectTemplate = (id: string) => {
    const template = flowTemplates.find(item => item.id === id);
    if (!template) return;

    setSelectedTemplateId(id);
    setSubject(template.subject);
    setBody(template.body);
    setPreheader(template.preview);
    setComposeOpen(true);
  };

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
    setRecipients(prev => [
      ...prev,
      {
        company: 'CheFu Inc',
        email: `person${prev.length + 1}@example.com`,
        firstName: `Person ${prev.length + 1}`,
        lastName: '',
        tags: ['manual'],
      },
    ]);
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
          tags: ['flow', selectedTemplateId],
          testEmail,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Send failed.');
      }

      setDeliveries(prev => [
        {
          action,
          count: data.count,
          id: crypto.randomUUID(),
          sentAt: data.sentAt,
          subject: renderedSubject,
        },
        ...prev,
      ]);
      setStatus({
        kind: 'success',
        text:
          action === 'test'
            ? 'Test email sent through Resend.'
            : `Campaign sent to ${data.count} recipients.`,
      });
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

        <button
          type="button"
          className="compose-button"
          onClick={() => setComposeOpen(true)}
        >
          <Plus className="size-5" />
          Compose
        </button>

        <nav className="folder-list" aria-label="Mail folders">
          {folders.map(folder => (
            <button
              type="button"
              key={folder.name}
              className={folder.name === 'Inbox' ? 'folder active' : 'folder'}
            >
              <folder.icon className="size-4" />
              <span>{folder.name}</span>
              <span className="folder-count">{folder.count}</span>
            </button>
          ))}
        </nav>

        <div className="rail-card">
          <div className="connection-row">
            {config.resendConfigured ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <AlertCircle className="size-4 text-amber-600" />
            )}
            <span>
              {config.resendConfigured ? 'Resend connected' : 'Resend pending'}
            </span>
          </div>
          <p>
            {config.resendConfigured
              ? 'Flow is ready to send from your verified CheFu identities.'
              : 'Add RESEND_API_KEY on the backend before sending campaigns.'}
          </p>
        </div>
      </aside>

      <section className="mail-list-pane">
        <header className="topbar">
          <div className="searchbox">
            <Search className="size-4" />
            <input placeholder="Search CheFu mail, campaigns, users" />
          </div>
          <button type="button" className="icon-button" aria-label="Settings">
            <Settings className="size-5" />
          </button>
        </header>

        {status ? (
          <div className={`status-banner ${status.kind}`}>{status.text}</div>
        ) : null}

        <div className="section-heading">
          <div>
            <p>Unified inbox</p>
            <h2>All CheFu email activity</h2>
          </div>
          <span>{inboxThreads.filter(thread => thread.unread).length} unread</span>
        </div>

        <div className="thread-list">
          {inboxThreads.map(thread => (
            <button
              type="button"
              key={thread.id}
              className={
                selectedThreadId === thread.id ? 'thread-row active' : 'thread-row'
              }
              onClick={() => setSelectedThreadId(thread.id)}
            >
              <span className={thread.unread ? 'unread-dot visible' : 'unread-dot'} />
              <Star
                className={thread.starred ? 'size-4 star active' : 'size-4 star'}
                fill={thread.starred ? 'currentColor' : 'none'}
              />
              <div className="thread-copy">
                <div className="thread-meta">
                  <strong>{thread.sender}</strong>
                  <span>{thread.receivedAt}</span>
                </div>
                <p>{thread.subject}</p>
                <small>{thread.preview}</small>
              </div>
              <span className="thread-label">{thread.label}</span>
            </button>
          ))}
        </div>

        <div className="section-heading compact">
          <div>
            <p>Templates</p>
            <h2>Reusable CheFu messages</h2>
          </div>
        </div>

        <div className="template-grid">
          {flowTemplates.map(template => (
            <button
              type="button"
              key={template.id}
              onClick={() => selectTemplate(template.id)}
              className={
                selectedTemplateId === template.id
                  ? 'template-tile active'
                  : 'template-tile'
              }
            >
              <span>{template.category}</span>
              <strong>{template.name}</strong>
              <small>{template.preview}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="reading-pane">
        <header className="message-toolbar">
          <div>
            <p>{selectedThread?.label || 'Inbox'}</p>
            <h2>{selectedThread?.subject}</h2>
          </div>
          <div className="toolbar-actions">
            <button type="button" className="icon-button" aria-label="Archive">
              <Archive className="size-5" />
            </button>
            <button type="button" className="icon-button" aria-label="Reply">
              <Reply className="size-5" />
            </button>
            <button type="button" className="icon-button" aria-label="More">
              <MoreVertical className="size-5" />
            </button>
          </div>
        </header>

        <article className="message-body">
          <div className="sender-avatar">
            {(selectedThread?.sender || 'F').slice(0, 1)}
          </div>
          <div>
            <div className="message-from">
              <strong>{selectedThread?.sender}</strong>
              <span>{selectedThread?.receivedAt}</span>
            </div>
            <p>{selectedThread?.preview}</p>
            <p>
              Flow brings transactional alerts, learner campaigns, support replies,
              billing updates, and security notifications into one CheFu Inc email
              workspace. Sending is powered by Resend through your backend API.
            </p>
          </div>
        </article>

        <section className="inspector-grid">
          <MetricCard
            icon={ShieldCheck}
            label="Deliverability"
            value={`${healthScore}%`}
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
        </section>

        <section className="preview-panel">
          <div className="preview-header">
            <div>
              <p>Live preview</p>
              <h2>{renderedSubject}</h2>
            </div>
            <Mail className="size-5" />
          </div>
          <iframe title="Email preview" srcDoc={previewHtml} />
        </section>

        <section className="delivery-panel">
          <div className="preview-header">
            <div>
              <p>Delivery history</p>
              <h2>Recent sends</h2>
            </div>
            <Clock className="size-5" />
          </div>
          {deliveries.length === 0 ? (
            <p className="empty-copy">No sends yet. Send a test to create history.</p>
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
        </section>
      </section>

      {composeOpen ? (
        <section className="compose-dock" aria-label="Compose email">
          <header>
            <div>
              <p>New campaign</p>
              <h2>Compose email</h2>
            </div>
            <button
              type="button"
              className="icon-button dark"
              aria-label="Close compose"
              onClick={() => setComposeOpen(false)}
            >
              <X className="size-5" />
            </button>
          </header>

          <div className="compose-fields">
            <Field label="From">
              <input
                value={from}
                onChange={event => setFrom(event.target.value)}
                className="input"
              />
            </Field>
            <Field label="Reply-to">
              <input
                value={replyTo}
                onChange={event => setReplyTo(event.target.value)}
                className="input"
                placeholder="support@chefuinc.com"
              />
            </Field>
            <Field label="To audience">
              <input
                value={audienceName}
                onChange={event => setAudienceName(event.target.value)}
                className="input"
              />
            </Field>
            <Field label="Test recipient">
              <input
                value={testEmail}
                onChange={event => setTestEmail(event.target.value)}
                className="input"
                placeholder="you@chefuinc.com"
              />
            </Field>
            <Field label="Subject">
              <input
                value={subject}
                onChange={event => setSubject(event.target.value)}
                className="input subject-input"
              />
            </Field>
            <Field label="Preheader">
              <input
                value={preheader}
                onChange={event => setPreheader(event.target.value)}
                className="input"
              />
            </Field>
            <div className="compose-split">
              <Field label="CTA label">
                <input
                  value={ctaLabel}
                  onChange={event => setCtaLabel(event.target.value)}
                  className="input"
                />
              </Field>
              <Field label="CTA URL">
                <input
                  value={ctaUrl}
                  onChange={event => setCtaUrl(event.target.value)}
                  className="input"
                />
              </Field>
            </div>
            <Field label="Message">
              <textarea
                value={body}
                onChange={event => setBody(event.target.value)}
                className="input message-input"
              />
            </Field>
          </div>

          <div className="audience-tools">
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
            <button type="button" className="secondary-action" onClick={addRecipient}>
              <Users className="size-4" />
              Add recipient
            </button>
            <span>{recipients.length} recipients</span>
          </div>

          <details className="variable-drawer">
            <summary>
              <FileText className="size-4" />
              Personalization variables
            </summary>
            <div className="variable-grid">
              {Object.entries(variables).map(([key, value]) => (
                <Field key={key} label={key}>
                  <input
                    value={value}
                    onChange={event =>
                      setVariables(prev => ({
                        ...prev,
                        [key]: event.target.value,
                      }))
                    }
                    className="input"
                  />
                </Field>
              ))}
            </div>
          </details>

          <div className="compose-footer">
            <div className="compose-icons">
              <Paperclip className="size-4" />
              <LayoutTemplate className="size-4" />
            </div>
            <div className="send-actions">
              <button
                type="button"
                className="secondary-action"
                disabled={isSending}
                onClick={() => void sendEmail('test')}
              >
                Send test
              </button>
              <button
                type="button"
                className="primary-action"
                disabled={isSending || !config.resendConfigured}
                onClick={() => void sendEmail('campaign')}
              >
                <Send className="size-4" />
                {isSending ? 'Sending...' : 'Send campaign'}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
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
