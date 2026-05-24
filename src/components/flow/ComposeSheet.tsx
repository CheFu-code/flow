import {
  BarChart3,
  ChevronDown,
  Eye,
  Paperclip,
  PenLine,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { FlowRecipient } from '@/lib/email-schema';
import type { Delivery, FlowConfig } from './types';
import styles from './ComposeSheet.module.css';

type ComposeSheetProps = {
  audienceName: string;
  body: string;
  config: FlowConfig;
  ctaLabel: string;
  ctaUrl: string;
  deliveries: Delivery[];
  from: string;
  isSending: boolean;
  manualRecipient: string;
  onAddRecipient: () => void;
  onAudienceNameChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onCtaLabelChange: (value: string) => void;
  onCtaUrlChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onImportCsv: (file?: File) => void;
  onManualRecipientChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onPreheaderChange: (value: string) => void;
  onReplyToChange: (value: string) => void;
  onSend: (action: 'test' | 'campaign') => void;
  onSubjectChange: (value: string) => void;
  onTestEmailChange: (value: string) => void;
  open: boolean;
  preheader: string;
  previewHtml: string;
  readinessScore: number;
  recipients: FlowRecipient[];
  replyTo: string;
  subject: string;
  testEmail: string;
};

export function ComposeSheet({
  audienceName,
  body,
  config,
  ctaLabel,
  ctaUrl,
  deliveries,
  from,
  isSending,
  manualRecipient,
  onAddRecipient,
  onAudienceNameChange,
  onBodyChange,
  onCtaLabelChange,
  onCtaUrlChange,
  onFromChange,
  onImportCsv,
  onManualRecipientChange,
  onOpenChange,
  onPreheaderChange,
  onReplyToChange,
  onSend,
  onSubjectChange,
  onTestEmailChange,
  open,
  preheader,
  previewHtml,
  readinessScore,
  recipients,
  replyTo,
  subject,
  testEmail,
}: ComposeSheetProps) {
  const bodyWordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const bodyCharacterCount = body.length;
  const recipientCount = recipients.length;
  const canSendCampaign = !isSending && config.resendConfigured;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={styles.sheet}
      >
        <SheetHeader className={styles.header}>
          <div className={styles.titleBlock}>
            <span className={styles.headerIcon} aria-hidden="true">
              <PenLine className="size-4" />
            </span>
            <div>
              <SheetTitle className={styles.title}>New email</SheetTitle>
              <SheetDescription className={styles.description}>
                Campaign draft
              </SheetDescription>
            </div>
          </div>
          <div className={styles.headerStats} aria-label="Draft status">
            <span>{readinessScore}% ready</span>
            <span>{recipientCount} recipients</span>
          </div>
        </SheetHeader>

        <ScrollArea className={styles.scroll}>
          <div className={styles.body}>
            <section className={styles.editorPanel} aria-label="Email draft">
              <div className={styles.lineField}>
                <span className={styles.fieldLabel}>To</span>
                <div className={styles.recipientControl}>
                <Input
                  value={manualRecipient}
                  onChange={event => onManualRecipientChange(event.target.value)}
                  placeholder="recipient@example.com"
                  className={styles.lineInput}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onAddRecipient}
                  className={styles.addButton}
                >
                  <UserPlus className="size-4" />
                  Add
                </Button>
              </div>
              </div>

              <div className={styles.recipientChips}>
                {recipients.length === 0 ? (
                  <span>No recipients added</span>
                ) : (
                  recipients.map(recipient => (
                    <Badge
                      key={recipient.email}
                      variant="secondary"
                      className={styles.recipientChip}
                    >
                      {recipient.email}
                    </Badge>
                  ))
                )}
              </div>

              <label className={styles.lineField}>
                <span className={styles.fieldLabel}>Subject</span>
                <Input
                  value={subject}
                  onChange={event => onSubjectChange(event.target.value)}
                  placeholder="Write a clear subject"
                  className={styles.subjectInput}
                />
              </label>

              <label className={styles.messageField}>
                <div className={styles.messageHeader}>
                  <span className={styles.fieldLabel}>Message</span>
                  <span>
                    {bodyWordCount} words - {bodyCharacterCount} chars
                  </span>
                </div>
                <Textarea
                  value={body}
                  onChange={event => onBodyChange(event.target.value)}
                  placeholder="Hi there,\n\nWrite your email here in normal plain text.\n\nBest,\nCheFu Inc"
                  className={styles.messageInput}
                />
              </label>
            </section>

            <ComposeSection
              description="Sender, reply-to, test recipient, and audience label."
              icon={<SlidersHorizontal className="size-4" />}
              title="Sender and test settings"
            >
              <div className={styles.grid}>
                <Field label="From">
                  {config.senders?.length ? (
                    <select
                      value={from}
                      onChange={event => onFromChange(event.target.value)}
                      className={styles.selectInput}
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
                      onChange={event => onFromChange(event.target.value)}
                      placeholder="Name <email@yourdomain.com>"
                      className={styles.input}
                    />
                  )}
                </Field>
                <Field label="Reply-to">
                  <Input
                    value={replyTo}
                    onChange={event => onReplyToChange(event.target.value)}
                    placeholder="reply@chefuinc.com"
                    className={styles.input}
                  />
                </Field>
                <Field label="Test recipient">
                  <Input
                    value={testEmail}
                    onChange={event => onTestEmailChange(event.target.value)}
                    placeholder="you@chefuinc.com"
                    className={styles.input}
                  />
                </Field>
                <Field label="Audience name">
                  <Input
                    value={audienceName}
                    onChange={event => onAudienceNameChange(event.target.value)}
                    className={styles.input}
                  />
                </Field>
              </div>
            </ComposeSection>

            <ComposeSection
              description="Upload a recipient list when this becomes a campaign."
              icon={<Upload className="size-4" />}
              title="Bulk recipients"
            >
              <label className={styles.secondaryAction}>
                <Upload className="size-4" />
                Import CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className={styles.hidden}
                  onChange={event => onImportCsv(event.target.files?.[0])}
                />
              </label>
            </ComposeSection>

            <ComposeSection
              description="Inbox text, optional button, and rendered email output."
              icon={<Eye className="size-4" />}
              title="Preview and call-to-action"
            >
              <div className={styles.grid}>
                <Field label="Preheader">
                  <Input
                    value={preheader}
                    onChange={event => onPreheaderChange(event.target.value)}
                    placeholder="Short inbox preview text"
                    className={styles.input}
                  />
                </Field>
                <Field label="CTA label">
                  <Input
                    value={ctaLabel}
                    onChange={event => onCtaLabelChange(event.target.value)}
                    placeholder="Open link"
                    className={styles.input}
                  />
                </Field>
                <Field label="CTA URL">
                  <Input
                    value={ctaUrl}
                    onChange={event => onCtaUrlChange(event.target.value)}
                    placeholder="https://..."
                    className={styles.input}
                  />
                </Field>
              </div>
              <div className={styles.previewFrame}>
                <iframe title="Email preview" srcDoc={previewHtml} />
              </div>
            </ComposeSection>

            <ComposeSection
              description="Readiness, audience size, sending limit, and recent sends."
              icon={<BarChart3 className="size-4" />}
              title="Activity and readiness"
            >
              <div className={styles.metrics}>
                <MetricCard
                  icon={<ShieldCheck className="size-5" />}
                  label="Readiness"
                  value={`${readinessScore}%`}
                />
                <MetricCard
                  icon={<Users className="size-5" />}
                  label="Audience"
                  value={recipients.length.toString()}
                />
                <MetricCard
                  icon={<BarChart3 className="size-5" />}
                  label="Limit"
                  value={config.maxRecipients.toString()}
                />
              </div>
              {deliveries.length === 0 ? (
                <p className={styles.emptyCopy}>No sends from this browser yet.</p>
              ) : (
                <div className={styles.deliveryList}>
                  {deliveries.map(item => (
                    <div key={item.id} className={styles.deliveryRow}>
                      <strong>{item.subject}</strong>
                      <span>
                        {item.count} recipients -{' '}
                        {new Date(item.sentAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ComposeSection>
          </div>
        </ScrollArea>

        <SheetFooter className={styles.footer}>
          <div className={styles.footerMeta}>
            <Paperclip className="size-4" />
            <span>{config.resendConfigured ? 'Resend connected' : 'Sending disabled'}</span>
          </div>
          <div className={styles.sendActions}>
            <Button
              type="button"
              variant="outline"
              disabled={isSending}
              onClick={() => onSend('test')}
              className={styles.secondaryButton}
            >
              Send test
            </Button>
            <Button
              type="button"
              disabled={!canSendCampaign}
              onClick={() => onSend('campaign')}
              className={styles.primaryButton}
            >
              <Send className="size-4" />
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function ComposeSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Collapsible className={styles.section}>
      <CollapsibleTrigger className={styles.sectionTrigger}>
        <div className={styles.sectionTitle}>
          <span aria-hidden="true">{icon}</span>
          <div>
            <strong>{title}</strong>
            <small>{description}</small>
          </div>
        </div>
        <ChevronDown className={styles.sectionChevron} />
      </CollapsibleTrigger>
      <CollapsibleContent className={styles.sectionContent}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.metricCard}>
      <span aria-hidden="true">{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
