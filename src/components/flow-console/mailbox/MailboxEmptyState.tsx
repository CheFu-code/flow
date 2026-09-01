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
import { Button } from '@/components/ui/button';
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
      return <Star className="size-10 text-teal-600 dark:text-teal-400" />;
    case 'sent':
      return <Send className="size-10 text-teal-600 dark:text-teal-400" />;
    case 'drafts':
      return <FileText className="size-10 text-teal-600 dark:text-teal-400" />;
    case 'bin':
      return <Trash2 className="size-10 text-teal-600 dark:text-teal-400" />;
    case 'inbox':
      return <Inbox className="size-10 text-teal-600 dark:text-teal-400" />;
    default:
      return <Mail className="size-10 text-teal-600 dark:text-teal-400" />;
  }
}

export function MailboxEmptyState({
  emptyState,
  folder,
  onCompose,
}: MailboxEmptyStateProps) {
  return (
    <div className={styles.emptyState} role="status">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-teal-500/10 dark:bg-teal-950/40 mb-2">
        {getEmptyStateIcon(folder)}
      </div>
      <h2 className="text-xl font-semibold text-foreground tracking-tight">{emptyState.heading}</h2>
      {emptyState.subHeading ? (
        <p className="text-sm text-muted-foreground max-w-md text-center">{emptyState.subHeading}</p>
      ) : null}
      {folder === 'inbox' || folder === 'sent' || folder === 'drafts' ? (
        <Button
          className="mt-3 gap-2 bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-700 shadow-sm"
          onClick={onCompose}
          size="default"
          type="button"
        >
          <Sparkles className="size-4" />
          <span>Compose a message</span>
        </Button>
      ) : null}
    </div>
  );
}
