import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  MailOpen,
  Paperclip,
  RefreshCcw,
  SearchX,
  Star,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatInboxTime } from './date';
import type { FolderName, MailThread, StatusMessage } from './types';
import styles from './InboxPanel.module.css';

type InboxPanelProps = {
  activeFolder: FolderName;
  density: 'comfortable' | 'compact';
  filteredCount: number;
  isLoadingMessages: boolean;
  messageCounts: Partial<Record<FolderName, number>>;
  messages: MailThread[];
  onOpenMessage: (threadId: string) => void;
  onRefresh: () => void;
  onSearchClear: () => void;
  query: string;
  status: StatusMessage | null;
  totalCount: number;
};

const folderLabels: Record<FolderName, string> = {
  archived: 'Archived',
  campaigns: 'Campaigns',
  inbox: 'Inbox',
  scheduled: 'Scheduled',
  sent: 'Sent',
  trash: 'Trash',
};

function getParticipant(thread: MailThread) {
  return thread.direction === 'outbound'
    ? `To ${thread.to.join(', ')}`
    : thread.from;
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || 'F';
}

export function InboxPanel({
  activeFolder,
  density,
  filteredCount,
  isLoadingMessages,
  messageCounts,
  messages,
  onOpenMessage,
  onRefresh,
  onSearchClear,
  query,
  status,
  totalCount,
}: InboxPanelProps) {
  const hasQuery = query.trim().length > 0;
  const visibleCount = messageCounts[activeFolder] || messages.length;
  const panelClassName = [
    styles.panel,
    density === 'compact' ? styles.compact : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={panelClassName} aria-label={`${folderLabels[activeFolder]} mail`}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.iconMark} aria-hidden="true">
            <Inbox className="size-5" />
          </div>
          <div>
            <h2>{folderLabels[activeFolder]}</h2>
            <p>
              {hasQuery
                ? `${filteredCount} of ${totalCount} messages match "${query}"`
                : `${visibleCount} messages in this folder`}
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          {hasQuery ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={styles.clearButton}
              onClick={onSearchClear}
            >
              <SearchX className="size-4" />
              Clear
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={styles.iconButton}
            aria-label="Refresh messages"
            onClick={onRefresh}
          >
            <RefreshCcw className="size-4" />
          </Button>
        </div>
      </header>

      {status ? (
        <Alert
          variant={status.kind === 'error' ? 'destructive' : 'default'}
          className={
            status.kind === 'error'
              ? `${styles.status} ${styles.errorStatus}`
              : `${styles.status} ${styles.successStatus}`
          }
        >
          {status.kind === 'error' ? (
            <AlertCircle className="size-4" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          <AlertDescription>{status.text}</AlertDescription>
        </Alert>
      ) : null}

      <div className={styles.list}>
        {isLoadingMessages ? (
          <div className={styles.skeletonList} aria-label="Loading mail">
            {Array.from({ length: 8 }).map((_, index) => (
              <div className={styles.skeletonRow} key={index}>
                <Skeleton className={styles.skeletonAvatar} />
                <div>
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyMark} aria-hidden="true">
              <MailOpen className="size-6" />
            </div>
            <h3>{hasQuery ? 'No matching messages' : 'No mail here yet'}</h3>
            <p>
              {hasQuery
                ? 'Try a different sender, subject, preview, or recipient.'
                : activeFolder === 'inbox'
                  ? 'New messages sent to your Flow address will appear here.'
                  : 'Messages you send or move to this folder will appear here.'}
            </p>
            {hasQuery ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSearchClear}
              >
                <SearchX className="size-4" />
                Clear search
              </Button>
            ) : null}
          </div>
        ) : (
          messages.map((thread, index) => {
            const participant = getParticipant(thread);

            return (
              <Button
                type="button"
                key={thread.id}
                variant="ghost"
                style={{ animationDelay: `${Math.min(index * 24, 180)}ms` }}
                className={
                  thread.unread
                    ? `${styles.row} ${styles.unreadRow}`
                    : styles.row
                }
                onClick={() => onOpenMessage(thread.id)}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {getInitial(participant)}
                </span>
                <span className={styles.messageMain}>
                  <span className={styles.rowTop}>
                    <strong>{participant}</strong>
                    {thread.unread ? (
                      <Badge className={styles.unreadBadge}>New</Badge>
                    ) : null}
                  </span>
                  <span className={styles.subjectLine}>
                    <strong>{thread.subject || '(no subject)'}</strong>
                    {thread.preview ? <span>{thread.preview}</span> : null}
                  </span>
                </span>
                <span className={styles.rowMeta}>
                  <span className={styles.metaIcons}>
                    {thread.starred ? (
                      <Star className={styles.starred} fill="currentColor" />
                    ) : (
                      <Star className={styles.star} />
                    )}
                    {thread.attachments ? (
                      <Paperclip className={styles.attachment} />
                    ) : null}
                  </span>
                  <time>{formatInboxTime(thread.sentAt || thread.receivedAt)}</time>
                </span>
              </Button>
            );
          })
        )}
      </div>
    </section>
  );
}
