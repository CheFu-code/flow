'use client';

import {
  FileText,
  Inbox,
  Mail,
  Send,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import type { MailFolder } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export interface MailboxEmptyStateProps {
  emptyState: { heading: string; subHeading: string };
  folder?: MailFolder;
  onCompose?: () => void;
}

function getEmptyStateIcon(folder?: MailFolder) {
  switch (folder) {
    case 'starred':
      return <Star className={styles.emptyIconSvg} size={44} />;
    case 'sent':
      return <Send className={styles.emptyIconSvg} size={44} />;
    case 'drafts':
      return <FileText className={styles.emptyIconSvg} size={44} />;
    case 'bin':
      return <Trash2 className={styles.emptyIconSvg} size={44} />;
    case 'inbox':
      return <Inbox className={styles.emptyIconSvg} size={44} />;
    default:
      return <Mail className={styles.emptyIconSvg} size={44} />;
  }
}

export function MailboxEmptyState({
  emptyState,
  folder,
  onCompose,
}: MailboxEmptyStateProps) {
  return (
    <div className={styles.emptyState} role="status">
      <div className={styles.emptyIcon}>
        {getEmptyStateIcon(folder)}
      </div>
      <h2>{emptyState.heading}</h2>
      {emptyState.subHeading ? <p>{emptyState.subHeading}</p> : null}
      {folder === 'inbox' || folder === 'sent' || folder === 'drafts' ? (
        <button
          className={styles.emptyActionButton}
          onClick={onCompose}
          type="button"
        >
          <Sparkles size={16} />
          <span>Compose a message</span>
        </button>
      ) : null}
    </div>
  );
}
