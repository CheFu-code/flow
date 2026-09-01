'use client';

import { Forward, Reply } from 'lucide-react';
import type { MailMessage } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export interface ReaderQuickReplyProps {
  latestMessage: MailMessage;
  onReply: (message: MailMessage) => void;
}

export function ReaderQuickReply({
  latestMessage,
  onReply,
}: ReaderQuickReplyProps) {
  return (
    <div className={styles.readerQuickReplyStrip}>
      <button
        className={styles.readerQuickReplyButton}
        onClick={() => onReply(latestMessage)}
        type="button"
      >
        <Reply size={16} />
        <span>Reply</span>
      </button>

      <button
        className={styles.readerQuickReplySecondary}
        onClick={() => onReply(latestMessage)}
        type="button"
      >
        <Forward size={16} />
        <span>Forward</span>
      </button>
    </div>
  );
}
