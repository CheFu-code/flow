'use client';

import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  Inbox,
  LayoutTemplate,
  Mail,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  applyVariables,
  defaultVariables,
  flowTemplates,
  renderEmailShell,
  textToHtml,
} from '@/lib/email-templates';
import type { FlowRecipient } from '@/lib/email-schema';

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

const seedRecipients: FlowRecipient[] = [
  {
    company: 'CheFu Academy',
    email: 'learner@example.com',
    firstName: 'Learner',
    lastName: 'One',
    tags: ['demo'],
  },
];

export default function FlowConsole() {
  const [audienceName, setAudienceName] = useState('CheFu learners');
  const [body, setBody] = useState(flowTemplates[0].body);
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
  const [preheader, setPreheader] = useState('A useful update from CheFu Academy.');
  const [recipients, setRecipients] = useState<FlowRecipient[]>(seedRecipients);
  const [replyTo, setReplyTo] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(flowTemplates[0].id);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [subject, setSubject] = useState(flowTemplates[0].subject);
  const [testEmail, setTestEmail] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>(defaultVariables);

  useEffect(() => {
    fetch('/api/config')
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
      setStatus({ kind: 'success', text: `Imported ${imported.length} recipients.` });
    }
  };

  const addRecipient = () => {
    setRecipients(prev => [
      ...prev,
      {
        company: 'CheFu Academy',
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
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Mail className="size-5" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-teal-700">
                Flow
              </p>
              <h1 className="text-xl font-bold">Resend email command center</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
            {config.resendConfigured ? (
              <CheckCircle2 className="size-4 text-teal-700" />
            ) : (
              <AlertCircle className="size-4 text-amber-600" />
            )}
            {config.resendConfigured ? 'Resend connected' : 'Add RESEND_API_KEY'}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 xl:grid-cols-[290px_1fr_390px]">
        <aside className="space-y-4">
          <Panel title="Workspace" icon={Sparkles}>
            <Metric label="Deliverability score" value={`${healthScore}%`} />
            <Metric label="Audience size" value={recipients.length.toString()} />
            <Metric label="Max send limit" value={config.maxRecipients.toString()} />
          </Panel>

          <Panel title="Templates" icon={LayoutTemplate}>
            <div className="space-y-2">
              {flowTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => selectTemplate(template.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedTemplateId === template.id
                      ? 'border-teal-700 bg-teal-50'
                      : 'bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{template.name}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                      {template.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {template.preview}
                  </p>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Variables" icon={FileText}>
            <div className="space-y-2">
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
          </Panel>
        </aside>

        <section className="space-y-4">
          {status && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                status.kind === 'success'
                  ? 'border-teal-200 bg-teal-50 text-teal-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              {status.text}
            </div>
          )}

          <Panel title="Campaign setup" icon={ClipboardList}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Audience name">
                <input
                  value={audienceName}
                  onChange={event => setAudienceName(event.target.value)}
                  className="input"
                />
              </Field>
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
                  placeholder="support@example.com"
                />
              </Field>
              <Field label="Test recipient">
                <input
                  value={testEmail}
                  onChange={event => setTestEmail(event.target.value)}
                  className="input"
                  placeholder="you@example.com"
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Compose" icon={FileText}>
            <div className="space-y-3">
              <Field label="Subject">
                <input
                  value={subject}
                  onChange={event => setSubject(event.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Preheader">
                <input
                  value={preheader}
                  onChange={event => setPreheader(event.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Message">
                <textarea
                  value={body}
                  onChange={event => setBody(event.target.value)}
                  className="input min-h-72 resize-y font-mono text-sm leading-6"
                />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
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
            </div>
          </Panel>

          <Panel title="Audience" icon={Users}>
            <div className="mb-3 flex flex-wrap gap-2">
              <label className="button-secondary cursor-pointer">
                <Upload className="size-4" />
                Import CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={event => void importCsv(event.target.files?.[0])}
                />
              </label>
              <button className="button-secondary" onClick={addRecipient}>
                <Plus className="size-4" />
                Add recipient
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Company</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((recipient, index) => (
                    <tr key={`${recipient.email}-${index}`} className="border-t">
                      <td className="px-3 py-2">{recipient.email}</td>
                      <td className="px-3 py-2">
                        {[recipient.firstName, recipient.lastName]
                          .filter(Boolean)
                          .join(' ') || '-'}
                      </td>
                      <td className="px-3 py-2">{recipient.company || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>

        <aside className="space-y-4">
          <Panel title="Preview" icon={Inbox}>
            <div className="mb-3 rounded-lg border bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Subject</p>
              <p className="mt-1 font-semibold">{renderedSubject}</p>
            </div>
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              className="h-[520px] w-full rounded-lg border bg-white"
            />
          </Panel>

          <Panel title="Send controls" icon={ShieldCheck}>
            <div className="grid gap-2">
              <button
                className="button-secondary justify-center"
                disabled={isSending}
                onClick={() => void sendEmail('test')}
              >
                <Mail className="size-4" />
                Send test
              </button>
              <button
                className="button-primary justify-center"
                disabled={isSending || !config.resendConfigured}
                onClick={() => void sendEmail('campaign')}
              >
                <Send className="size-4" />
                {isSending ? 'Sending...' : 'Send campaign'}
              </button>
            </div>
          </Panel>

          <Panel title="Delivery history" icon={BarChart3}>
            <div className="space-y-2">
              {deliveries.length === 0 && (
                <p className="text-sm text-slate-500">No sends yet.</p>
              )}
              {deliveries.map(item => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{item.subject}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                      {item.action}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.count} recipients - {new Date(item.sentAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function Panel({
  children,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <Icon className="size-4" />
        </div>
        <h2 className="font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
