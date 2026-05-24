import {
  BarChart3,
  Eye,
  Paperclip,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { FlowRecipient } from '@/lib/email-schema';
import { Field, MetricCard, TaskSection } from './shared';
import type { Delivery, FlowConfig } from './types';

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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
                  onChange={event => onManualRecipientChange(event.target.value)}
                  placeholder="recipient@example.com"
                />
                <Button type="button" variant="secondary" onClick={onAddRecipient}>
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
                onChange={event => onSubjectChange(event.target.value)}
                placeholder="Write a clear subject"
                className="subject-input"
              />
            </Field>

            <Field label="Message">
              <Textarea
                value={body}
                onChange={event => onBodyChange(event.target.value)}
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
                      onChange={event => onFromChange(event.target.value)}
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
                      onChange={event => onFromChange(event.target.value)}
                      placeholder="Name <email@yourdomain.com>"
                    />
                  )}
                </Field>
                <Field label="Reply-to">
                  <Input
                    value={replyTo}
                    onChange={event => onReplyToChange(event.target.value)}
                    placeholder="reply@flow.chefuinc.com"
                  />
                </Field>
                <Field label="Test recipient">
                  <Input
                    value={testEmail}
                    onChange={event => onTestEmailChange(event.target.value)}
                    placeholder="you@chefuinc.com"
                  />
                </Field>
                <Field label="Audience name">
                  <Input
                    value={audienceName}
                    onChange={event => onAudienceNameChange(event.target.value)}
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
                  onChange={event => onImportCsv(event.target.files?.[0])}
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
                    onChange={event => onPreheaderChange(event.target.value)}
                    placeholder="Short inbox preview text"
                  />
                </Field>
                <Field label="CTA label">
                  <Input
                    value={ctaLabel}
                    onChange={event => onCtaLabelChange(event.target.value)}
                    placeholder="Open link"
                  />
                </Field>
                <Field label="CTA URL">
                  <Input
                    value={ctaUrl}
                    onChange={event => onCtaUrlChange(event.target.value)}
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
              onClick={() => onSend('test')}
            >
              Send test
            </Button>
            <Button
              type="button"
              disabled={isSending || !config.resendConfigured}
              onClick={() => onSend('campaign')}
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
