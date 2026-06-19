'use client';

import { Star } from 'lucide-react';
import type { MouseEvent } from 'react';
import { memo } from 'react';
import { ContactHoverCard } from '@/components/flow-console/ContactHoverCard';
import { formatListDate, getMessageFolderLabel, sentTrackingKind, sentTrackingLabel } from '@/lib/flow-console/format';
import { contactFromMessage } from '@/lib/flow-console/mail';
import type { MailThread } from '@/lib/flow-console/types';
import styles from './FlowConsole.module.css';

interface MessageRowProps {
  thread: MailThread;
  isSelected: boolean;
  onSelect: (threadId: string) => void;
  onToggleSelect: (threadId: string) => void;
  onToggleStarred: (event: MouseEvent, messageId: string) => void;
import { Star } from 'lucide-react';
import type { MouseEvent } from 'react';
import { memo } from 'react';
import { ContactHoverCard } from '`@/components/flow-console/ContactHoverCard`';
import type { ContactPreview } from '`@/lib/flow-console/types`';
import { formatListDate, getMessageFolderLabel, sentTrackingKind, sentTrackingLabel } from '`@/lib/flow-console/format`';
import { contactFromMessage } from '`@/lib/flow-console/mail`';
import type { MailThread } from '`@/lib/flow-console/types`';
import styles from './FlowConsole.module.css';

interface MessageRowProps {
  thread: MailThread;
  isSelected: boolean;
  onSelect: (threadId: string) => void;
  onToggleSelect: (threadId: string) => void;
  onToggleStarred: (event: MouseEvent, messageId: string) => void;
  onOpenCompose: (contact: ContactPreview) => void;
  onShowStatus: (tool: string, contact: ContactPreview) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, threadId: string) => void;
}
}

export const MessageRow = memo(function MessageRow({
  thread,
  isSelected,
  onSelect,
  onToggleSelect,
  onToggleStarred,
  onOpenCompose,
  onShowStatus,
  onKeyDown,
}: MessageRowProps) {
  const message = thread.latest;
  const contact = contactFromMessage(message);

  return (
    <div
      className={
        thread.unread
          ? `${styles.messageRow} ${styles.messageUnread}`
          : styles.messageRow
      }
      onClick={() => onSelect(thread.id)}
      onKeyDown={(event) => onKeyDown(event, thread.id)}
      role="button"
      tabIndex={0}
    >
      <input
        aria-label={`Select ${thread.subject}`}
        checked={isSelected}
        className={styles.checkbox}
        onChange={() => onToggleSelect(thread.id)}
        onClick={(event) => event.stopPropagation()}
        type="checkbox"
      />
      <button
        aria-label={message.starred ? 'Remove star from message' : 'Star message'}
        className={
          message.starred ? `${styles.rowStar} ${styles.rowStarActive}` : styles.rowStar
        }
        data-tooltip={message.starred ? 'Unstar' : 'Star'}
        onClick={(event) => onToggleStarred(event, message.id)}
        type="button"
      >
        <Star fill={message.starred ? 'currentColor' : 'none'} size={18} />
      </button>
      <span className={styles.sender} onClick={(event) => event.stopPropagation()}>
        <span className={styles.contactHover}>
          <button className={styles.senderButton} type="button">
            {message.folder === 'sent' ? `To:${contact.name}` : contact.name}
          </button>
          <ContactHoverCard
            contact={contact}
            onCompose={onOpenCompose}
            onTool={onShowStatus}
          />
        </span>
      </span>
      <span className={styles.preview}>
        <span>{thread.subject}</span>
        {message.preview || message.body ? (
          <em>- {message.preview || message.body}</em>
        ) : null}
        {message.direction === 'outbound' ? (
          <strong
            className={`${styles.trackingBadge} ${
              styles[`tracking${sentTrackingKind(message)}`]
            }`}
          >
            {sentTrackingLabel(message, true)}
          </strong>
        ) : null}
        {thread.count > 1 ? (
          <strong className={styles.threadCount}>{thread.count}</strong>
        ) : null}
      </span>
      <time>{formatListDate(message.date)}</time>
    </div>
  );
});
