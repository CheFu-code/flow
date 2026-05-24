'use client';

import {
  Download,
  ExternalLink,
  File,
  FileImage,
  FileText,
  Loader2,
  Clock3,
  Mail,
  Paperclip,
  Send,
  UserRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { apiUrl, flowHeaders } from '@/lib/api';
import { formatMessageTime } from './date';
import type { FlowAttachment, MailThread } from './types';
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
  return (
    thread.text ||
    (thread.html ? htmlToReadableText(thread.html) : '') ||
    thread.preview ||
    'No readable message body was provided.'
  );
}

function formatFileSize(size?: number) {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentKind(attachment: FlowAttachment) {
  const type = attachment.contentType || '';
  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  return 'file';
}

function AttachmentIcon({ attachment }: { attachment: FlowAttachment }) {
  const kind = attachmentKind(attachment);

  if (kind === 'image') return <FileImage className="size-5" />;
  if (kind === 'pdf') return <FileText className="size-5" />;
  return <File className="size-5" />;
}

function renderEmailDocument(html: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base target="_blank" />
    <style>
      html,
      body {
        margin: 0;
        min-height: 100%;
        background: #ffffff;
      }

      body {
        padding: 0;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      a {
        color: #1457d9;
      }
    </style>
  </head>
  <body>${html}</body>
</html>`;
}

function htmlToReadableText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|section|article|blockquote|tr|h[1-6])>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

function isEmojiOnly(value: string) {
  const compact = value.replace(/\s|\uFE0F|\u200D/g, '');
  return compact.length > 0 && /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u.test(compact);
}

function isGmailReactionText(value: string) {
  return /\breacted via\s+Gmail\b/i.test(value);
}

function isReplyHeaderLine(value: string) {
  return /^(On .+ wrote:|From: .+|Sent: .+|To: .+|Subject: .+)/i.test(value.trim());
}

function renderLines(lines: string[], keyPrefix: string) {
  return lines.flatMap((line, lineIndex) => [
    ...([] as ReactNode[]).concat(renderLinkedText(line)),
    lineIndex < lines.length - 1 ? <br key={`${keyPrefix}-${lineIndex}`} /> : null,
  ]);
}

function renderPlainTextMessage(text: string, threadId: string) {
  const blocks = text
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean);
  const output: ReactNode[] = [];
  let quoteHistoryStarted = false;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const nextBlock = blocks[index + 1] || '';

    if (isEmojiOnly(block) && isGmailReactionText(nextBlock)) {
      output.push(
        <section className={styles.reactionCard} key={`${threadId}-reaction-${index}`}>
          <span className={styles.reactionEmoji} aria-hidden="true">
            {block}
          </span>
          <p>{renderLinkedText(nextBlock)}</p>
        </section>,
      );
      index += 1;
      continue;
    }

    const lines = block.split('\n');
    const firstLine = lines[0]?.trim() || '';
    const isPrefixedQuote = lines
      .filter(Boolean)
      .every(line => line.trim().startsWith('>'));
    const isReplyHeader = isReplyHeaderLine(firstLine);
    const isQuote = isPrefixedQuote || isReplyHeader || quoteHistoryStarted;

    if (isReplyHeader) quoteHistoryStarted = true;

    if (isQuote) {
      const cleanedBlock = block.replace(/^>\s?/gm, '').trim();
      const cleanedLines = cleanedBlock.split('\n');
      const headerIsReply = isReplyHeaderLine(cleanedLines[0] || '');
      const quoteBody = headerIsReply ? cleanedLines.slice(1) : cleanedLines;

      output.push(
        <blockquote key={`${threadId}-quote-${index}`}>
          {headerIsReply ? (
            <cite>{renderLinkedText(cleanedLines[0])}</cite>
          ) : null}
          {quoteBody.length ? (
            <span>{renderLines(quoteBody, `${threadId}-${index}`)}</span>
          ) : null}
        </blockquote>,
      );
      continue;
    }

    output.push(
      <p key={`${threadId}-paragraph-${index}`}>
        {renderLines(lines, `${threadId}-${index}`)}
      </p>,
    );
  }

  return output;
}

export function MessageReaderSheet({
  onOpenChange,
  open,
  thread,
}: MessageReaderSheetProps) {
  const [attachmentActionError, setAttachmentActionError] = useState<{
    message: string;
    threadId: string;
  } | null>(null);
  const [attachmentLookup, setAttachmentLookup] = useState<{
    error: string | null;
    items: FlowAttachment[];
    threadId: string;
  } | null>(null);
  const [pendingAttachmentKey, setPendingAttachmentKey] = useState<string | null>(null);
  const participant = thread ? getParticipantLabel(thread) : '';
  const sentAt = thread ? formatMessageTime(thread.sentAt || thread.receivedAt) : '';
  const showDesignedEmail = Boolean(thread?.html && thread.direction === 'outbound');
  const threadId = thread?.id || '';
  const storedAttachmentItems = thread?.attachmentItems || [];
  const hasAttachmentLookup = Boolean(
    threadId && attachmentLookup?.threadId === threadId,
  );
  const attachmentItems = storedAttachmentItems.length
    ? storedAttachmentItems
    : hasAttachmentLookup
      ? attachmentLookup?.items || []
      : [];
  const shouldLoadAttachmentItems = Boolean(
    threadId && thread?.attachments && !storedAttachmentItems.length,
  );
  const attachmentsLoading = shouldLoadAttachmentItems && !hasAttachmentLookup;
  const attachmentLoadError = hasAttachmentLookup
    ? attachmentLookup?.error || null
    : null;
  const currentAttachmentActionError =
    attachmentActionError?.threadId === threadId
      ? attachmentActionError.message
      : null;

  useEffect(() => {
    if (!threadId || !shouldLoadAttachmentItems || hasAttachmentLookup) return;

    let isActive = true;

    const loadAttachments = async () => {
      try {
        const response = await fetch(
          apiUrl(`/flow/messages/${threadId}/attachments`),
          {
            credentials: 'include',
            headers: flowHeaders(),
          },
        );
        const data = (await response.json().catch(() => ({}))) as {
          attachments?: FlowAttachment[];
          error?: string;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.message ||
              'Attachment details could not be loaded.',
          );
        }

        const attachments = Array.isArray(data.attachments)
          ? data.attachments
          : [];

        if (!isActive) return;

        setAttachmentLookup({
          error: attachments.length
            ? null
            : 'Attachment details could not be loaded for this message.',
          items: attachments,
          threadId,
        });
      } catch (error) {
        if (!isActive) return;

        setAttachmentLookup({
          error:
            error instanceof Error
              ? error.message
              : 'Attachment details could not be loaded.',
          items: [],
          threadId,
        });
      }
    };

    void loadAttachments();

    return () => {
      isActive = false;
    };
  }, [hasAttachmentLookup, shouldLoadAttachmentItems, threadId]);

  const openAttachment = async (attachment: FlowAttachment) => {
    if (!thread) return;

    setAttachmentActionError(null);
    setPendingAttachmentKey(`${thread.id}:${attachment.id}`);

    try {
      const response = await fetch(
        apiUrl(`/flow/messages/${thread.id}/attachments/${attachment.id}`),
        {
          credentials: 'include',
          headers: flowHeaders(),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        downloadUrl?: string;
        error?: string;
        message?: string;
      };

      if (!response.ok || !data.downloadUrl) {
        throw new Error(data.error || data.message || 'Attachment is unavailable.');
      }

      window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setAttachmentActionError({
        message:
          error instanceof Error ? error.message : 'Attachment is unavailable.',
        threadId: thread.id,
      });
    } finally {
      setPendingAttachmentKey(null);
    }
  };

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

              {attachmentItems.length || thread.attachments ? (
                <section className={styles.attachmentsPanel} aria-label="Attachments">
                  <div className={styles.attachmentsHeader}>
                    <div>
                      <Paperclip className="size-4" />
                      <strong>Attachments</strong>
                    </div>
                    <span>
                      {attachmentItems.length || thread.attachments} file
                      {(attachmentItems.length || thread.attachments) === 1
                        ? ''
                        : 's'}
                    </span>
                  </div>

                  {attachmentItems.length ? (
                    <div className={styles.attachmentGrid}>
                      {attachmentItems.map(attachment => {
                        const pending =
                          pendingAttachmentKey ===
                          `${thread.id}:${attachment.id}`;
                        const kind = attachmentKind(attachment);

                        return (
                          <div className={styles.attachmentCard} key={attachment.id}>
                            <div className={styles.attachmentIcon} aria-hidden="true">
                              <AttachmentIcon attachment={attachment} />
                            </div>
                            <div className={styles.attachmentCopy}>
                              <strong title={attachment.filename}>
                                {attachment.filename}
                              </strong>
                              <span>
                                {attachment.contentType || 'Attachment'}
                                {formatFileSize(attachment.size)
                                  ? ` - ${formatFileSize(attachment.size)}`
                                  : ''}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={styles.attachmentAction}
                              onClick={() => void openAttachment(attachment)}
                              disabled={pending}
                            >
                              {pending ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : kind === 'file' ? (
                                <Download className="size-4" />
                              ) : (
                                <ExternalLink className="size-4" />
                              )}
                              {kind === 'file' ? 'Download' : 'View'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.attachmentEmpty}>
                      {attachmentsLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Paperclip className="size-4" />
                      )}
                      <span>
                        {attachmentsLoading
                          ? 'Loading attachment details...'
                          : attachmentLoadError ||
                            'Attachment details could not be loaded for this message.'}
                      </span>
                    </div>
                  )}

                  {attachmentItems.length && currentAttachmentActionError ? (
                    <p className={styles.attachmentError}>
                      {currentAttachmentActionError}
                    </p>
                  ) : null}
                </section>
              ) : null}

              <article className={styles.messageCard}>
                <div className={styles.messageToolbar}>
                  <div>
                    <UserRound className="size-4" />
                    <span>
                      {showDesignedEmail ? 'Designed email' : 'Message body'}
                    </span>
                  </div>
                  {showDesignedEmail ? (
                    <span className={styles.openHint}>Original layout</span>
                  ) : null}
                </div>

                {showDesignedEmail && thread.html ? (
                  <iframe
                    className={styles.htmlPreview}
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                    srcDoc={renderEmailDocument(thread.html)}
                    title="Email message"
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
