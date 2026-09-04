'use client';

import { memo, type KeyboardEvent, type MouseEvent } from 'react';
import { Paperclip, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ContactHoverCard } from '@/components/flow-console/modals/ContactHoverCard';
import {
  formatListDate,
  sentTrackingKind,
  sentTrackingLabel,
} from '@/lib/flow-console/format';
import { contactFromMessage } from '@/lib/flow-console/mail';
import type { ContactPreview, MailThread } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export interface MessageRowProps {
  thread: MailThread;
  isSelected: boolean;
  isKeyboardFocused?: boolean;
  onSelect: (threadId: string) => void;
  onToggleSelect: (threadId: string) => void;
  onToggleStarred: (event: MouseEvent, messageId: string) => void;
  onOpenCompose: (contact: ContactPreview) => void;
  onShowStatus: (tool: string, contact: ContactPreview) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>, threadId: string) => void;
}

function getTrackingVariant(kind: string): 'success' | 'info' | 'secondary' | 'destructive' {
  switch (kind) {
    case 'open':
      return 'success';
    case 'delivered':
      return 'info';
    case 'warning':
      return 'destructive';
    case 'pending':
    default:
      return 'secondary';
  }
}

export const MessageRow = memo(function MessageRow({
  thread,
  isSelected,
  isKeyboardFocused = false,
  onSelect,
  onToggleSelect,
  onToggleStarred,
  onOpenCompose,
  onShowStatus,
  onKeyDown,
}: MessageRowProps) {
  const message = thread.latest;
  const contact = contactFromMessage(message);
  const trackingKind = sentTrackingKind(message);

  return (
    <div
      aria-label={`Conversation: ${thread.subject} from ${contact.name}`}
      aria-pressed={isSelected}
      className={`${styles.messageRow} ${
        thread.unread ? styles.messageUnread : ''
      } ${isSelected ? styles.messageSelected : ''} ${
        isKeyboardFocused ? styles.rowFocused : ''
      }`}
      onClick={() => onSelect(thread.id)}
      onKeyDown={event => onKeyDown(event, thread.id)}
      role="button"
      tabIndex={0}
    >
      <div className={styles.rowControls} onClick={e => e.stopPropagation()}>
        <input
          aria-label={`Select conversation: ${thread.subject}`}
          checked={isSelected}
          className={styles.checkbox}
          onChange={() => onToggleSelect(thread.id)}
          type="checkbox"
        />
        <button
          aria-label={
            message.starred
              ? `Remove star from ${thread.subject}`
              : `Star ${thread.subject}`
          }
          className={
            message.starred
              ? `${styles.rowStar} ${styles.rowStarActive}`
              : styles.rowStar
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
      </div>

      <div
        className={styles.sender}
        onClick={event => event.stopPropagation()}
      >
        {thread.unread ? <span className={styles.unreadDot} title="Unread" /> : null}
        <ContactHoverCard
          contact={contact}
          onCompose={onOpenCompose}
          onTool={onShowStatus}
        >
          <button className={styles.senderButton} type="button">
            {message.folder === 'sent' ? `To: ${contact.name}` : contact.name}
          </button>
        </ContactHoverCard>
      </div>

      <div className={styles.preview}>
        <span className={styles.subjectText}>{thread.subject}</span>
        {message.preview || message.body ? (
          <span className={styles.previewSnippet}>
            &nbsp;— {message.preview || message.body}
          </span>
        ) : null}

        {message.direction === 'outbound' ? (
          <Badge
            variant={getTrackingVariant(trackingKind)}
            className="text-[11px] font-semibold px-2 py-0 h-5"
          >
            {sentTrackingLabel(message, true)}
          </Badge>
        ) : null}

        {message.attachments > 0 ? (
          <span
            aria-label={`${message.attachments} attachments`}
            className={styles.attachmentBadge}
            title={`${message.attachments} attachments`}
          >
            <Paperclip size={14} />
          </span>
        ) : null}

        {thread.count > 1 ? (
          <Badge
            variant="count"
            className="h-5 text-[11px]"
            aria-label={`${thread.count} messages in thread`}
          >
            {thread.count}
          </Badge>
        ) : null}
      </div>

      <time
        className={styles.timestamp}
        dateTime={new Date(message.date).toISOString()}
      >
        {formatListDate(message.date)}
      </time>
    </div>
  );
});
