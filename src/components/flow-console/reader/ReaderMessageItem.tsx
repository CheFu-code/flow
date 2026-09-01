'use client';

import { useState, type MouseEvent } from 'react';
import {
  Copy,
  Download,
  EllipsisVertical,
  Reply,
  Smile,
  Star,
} from 'lucide-react';
import { ContactHoverCard } from '@/components/flow-console/modals/ContactHoverCard';
import { ReactionPicker } from './ReactionPicker';
import {
  formatMessageDate,
  getInitial,
  sentTrackingKind,
  sentTrackingLabel,
} from '@/lib/flow-console/format';
import { contactFromMessage, isLastVisibleMessage } from '@/lib/flow-console/mail';
import { renderReaderMessageHtml } from '@/lib/flow-console/reader';
import type {
  ContactPreview,
  MailMessage,
  MailThread,
} from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export interface ReaderMessageItemProps {
  message: MailMessage;
  onAddReaction: (messageId: string, emoji: string) => void;
  onCopyLink: (message: MailMessage) => void;
  onDownload: (message: MailMessage) => void;
  onOpenComposeToContact: (contact: ContactPreview) => void;
  onReply: (message: MailMessage) => void;
  onShowContactToolStatus: (tool: string, contact: ContactPreview) => void;
  onToggleStarred: (event: MouseEvent, messageId: string) => void;
  thread: MailThread;
}

export function ReaderMessageItem({
  message,
  onAddReaction,
  onCopyLink,
  onDownload,
  onOpenComposeToContact,
  onReply,
  onShowContactToolStatus,
  onToggleStarred,
  thread,
}: ReaderMessageItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);

  const contact = contactFromMessage(message);
  const initial = getInitial(message.name || message.from);
  const isLast = isLastVisibleMessage(thread, message);

  return (
    <section aria-label={`Message from ${contact.name}`} className={styles.readerMessage}>
      <div className={styles.readerBody}>
        <div aria-hidden="true" className={styles.readerAvatar}>
          {initial}
        </div>

        <div className={styles.readerContent}>
          <div className={styles.readerMeta}>
            <div
              className={styles.contactHover}
              onClick={event => event.stopPropagation()}
            >
              <button className={styles.readerSenderButton} type="button">
                <strong>{contact.name}</strong>
                <span className={styles.readerSenderEmail}>
                  &nbsp;&lt;{contact.email}&gt;
                </span>
              </button>
              <ContactHoverCard
                contact={contact}
                onCompose={onOpenComposeToContact}
                onTool={onShowContactToolStatus}
              />
            </div>

            <div className={styles.readerMessageActions}>
              <time dateTime={new Date(message.date).toISOString()}>
                {formatMessageDate(message.date)}
              </time>

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
                onClick={event => onToggleStarred(event, message.id)}
                type="button"
              >
                <Star
                  fill={message.starred ? 'currentColor' : 'none'}
                  size={18}
                />
              </button>

              <div className={styles.readerMenuWrap}>
                <button
                  aria-expanded={reactionOpen}
                  aria-label="Add emoji reaction"
                  className={styles.readerIconButton}
                  data-tooltip="Add reaction"
                  onClick={() => {
                    setMenuOpen(false);
                    setReactionOpen(open => !open);
                  }}
                  type="button"
                >
                  <Smile size={18} />
                </button>
                {reactionOpen ? (
                  <ReactionPicker
                    onSelectEmoji={emoji => {
                      setReactionOpen(false);
                      onAddReaction(message.id, emoji);
                    }}
                  />
                ) : null}
              </div>

              <button
                aria-label="Reply to sender"
                className={styles.readerIconButton}
                data-tooltip="Reply"
                onClick={() => onReply(message)}
                type="button"
              >
                <Reply size={18} />
              </button>

              <div className={styles.readerMenuWrap}>
                <button
                  aria-expanded={menuOpen}
                  aria-label="More message options"
                  className={styles.readerIconButton}
                  data-tooltip="More"
                  onClick={() => {
                    setReactionOpen(false);
                    setMenuOpen(open => !open);
                  }}
                  type="button"
                >
                  <EllipsisVertical size={18} />
                </button>
                {menuOpen ? (
                  <div
                    aria-label="Message options"
                    className={styles.inlineActionMenu}
                    role="menu"
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onCopyLink(message);
                      }}
                      type="button"
                    >
                      <Copy size={14} />
                      <span>Copy link</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDownload(message);
                      }}
                      type="button"
                    >
                      <Download size={14} />
                      <span>Download (.txt)</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onReply(message);
                      }}
                      type="button"
                    >
                      <Reply size={14} />
                      <span>Reply</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {message.direction === 'outbound' ? (
            <div
              className={`${styles.trackingLine} ${
                styles[`tracking${sentTrackingKind(message)}`]
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

          {isLast && thread.reactions.length > 0 ? (
            <div aria-label="Message reactions" className={styles.reactionRow}>
              {thread.reactions.map(reaction => (
                <span
                  className={styles.reactionChip}
                  key={`${reaction.emoji}-${reaction.from}`}
                >
                  <span aria-hidden="true">{reaction.emoji}</span>
                  <strong>{reaction.count}</strong>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
