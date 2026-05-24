import { ArrowUpRight, Clock3, Mail, Paperclip, Send, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatMessageTime } from './date';
import type { MailThread } from './types';
import styles from './MessageReaderSheet.module.css';

type MessageReaderSheetProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  thread: MailThread | null;
};

function getRecipientLabel(thread: MailThread) {
  return thread.to.length ? thread.to.join(', ') : 'No recipients';
}

function getParticipantLabel(thread: MailThread) {
  return thread.direction === 'outbound' ? getRecipientLabel(thread) : thread.from;
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || 'F';
}

function getPlainText(thread: MailThread) {
  return thread.text || thread.preview || 'No readable message body was provided.';
}

const linkPattern = /((?:https?:\/\/|www\.)[^\s<>()]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g;

function normalizeHref(value: string) {
  if (value.includes('@') && !value.startsWith('http')) return `mailto:${value}`;
  if (value.startsWith('www.')) return `https://${value}`;
  return value;
}

function splitTrailingPunctuation(value: string) {
  const match = value.match(/^(.+?)([.,!?;:)]*)$/);
  return {
    punctuation: match?.[2] || '',
    text: match?.[1] || value,
  };
}

function renderLinkedText(text: string) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(linkPattern)) {
    const rawValue = match[0];
    const { punctuation, text: value } = splitTrailingPunctuation(rawValue);
    const index = match.index ?? 0;

    if (index > lastIndex) nodes.push(text.slice(lastIndex, index));

    nodes.push(
      <a
        href={normalizeHref(value)}
        key={`${value}-${index}`}
        rel="noreferrer"
        target={value.includes('@') && !value.startsWith('http') ? undefined : '_blank'}
      >
        {value}
      </a>,
    );
    if (punctuation) nodes.push(punctuation);
    lastIndex = index + rawValue.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : text;
}

function renderPlainTextMessage(text: string, threadId: string) {
  return text
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const isQuote = block
        .split('\n')
        .filter(Boolean)
        .every(line => line.trim().startsWith('>'));
      const cleanedBlock = isQuote
        ? block.replace(/^>\s?/gm, '').trim()
        : block;
      const lines = cleanedBlock.split('\n');
      const children = lines.flatMap((line, lineIndex) => [
        ...([] as ReactNode[]).concat(renderLinkedText(line)),
        lineIndex < lines.length - 1 ? <br key={`${threadId}-${index}-${lineIndex}`} /> : null,
      ]);

      if (isQuote) {
        return (
          <blockquote key={`${threadId}-quote-${index}`}>
            {children}
          </blockquote>
        );
      }

      return <p key={`${threadId}-paragraph-${index}`}>{children}</p>;
    });
}

export function MessageReaderSheet({
  onOpenChange,
  open,
  thread,
}: MessageReaderSheetProps) {
  const participant = thread ? getParticipantLabel(thread) : '';
  const sentAt = thread ? formatMessageTime(thread.sentAt || thread.receivedAt) : '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={styles.sheet}
      >
        {thread ? (
          <>
            <SheetHeader className={styles.header}>
              <div className={styles.headerTop}>
                <Badge className={styles.directionBadge}>
                  {thread.direction === 'outbound' ? (
                    <Send className="size-3.5" />
                  ) : (
                    <Mail className="size-3.5" />
                  )}
                  {thread.direction === 'outbound' ? 'Outbound' : 'Inbound'}
                </Badge>
                <span className={styles.time}>
                  <Clock3 className="size-3.5" />
                  {sentAt}
                </span>
              </div>
              <SheetTitle className={styles.title}>
                {thread.subject || '(no subject)'}
              </SheetTitle>
              <SheetDescription className={styles.description}>
                {thread.direction === 'outbound'
                  ? `Sent to ${getRecipientLabel(thread)}`
                  : `Received from ${thread.from}`}
              </SheetDescription>
            </SheetHeader>

            <div className={styles.content}>
              <section className={styles.metaCard} aria-label="Message details">
                <div className={styles.avatar} aria-hidden="true">
                  {getInitial(participant)}
                </div>
                <div className={styles.metaGrid}>
                  <div>
                    <span className={styles.metaLabel}>
                      {thread.direction === 'outbound' ? 'To' : 'From'}
                    </span>
                    <strong>{participant}</strong>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>
                      {thread.direction === 'outbound' ? 'From' : 'To'}
                    </span>
                    <strong>
                      {thread.direction === 'outbound'
                        ? thread.from
                        : getRecipientLabel(thread)}
                    </strong>
                  </div>
                </div>
                {thread.attachments ? (
                  <span className={styles.attachmentPill}>
                    <Paperclip className="size-3.5" />
                    {thread.attachments}
                  </span>
                ) : null}
              </section>

              <article className={styles.messageCard}>
                <div className={styles.messageToolbar}>
                  <div>
                    <UserRound className="size-4" />
                    <span>
                      {thread.html ? 'HTML email preview' : 'Plain text message'}
                    </span>
                  </div>
                  {thread.html ? (
                    <span className={styles.openHint}>
                      <ArrowUpRight className="size-3.5" />
                      HTML
                    </span>
                  ) : null}
                </div>

                {thread.html ? (
                  <iframe
                    className={styles.htmlPreview}
                    sandbox=""
                    srcDoc={thread.html}
                    title="Email HTML preview"
                  />
                ) : (
                  <div className={styles.plainText}>
                    {renderPlainTextMessage(getPlainText(thread), thread.id)}
                  </div>
                )}
              </article>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
