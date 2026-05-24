import {
  AlertCircle,
  CheckCircle2,
  SearchX,
  Inbox,
  Paperclip,
  RefreshCcw,
  Star,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatInboxTime } from './date';
import { EmptyState } from './shared';
import type { FolderName, MailThread, StatusMessage } from './types';

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

  return (
    <section className={`gmail-inbox-panel ${density}`}>
      {status ? (
        <Alert
          variant={status.kind === 'error' ? 'destructive' : 'default'}
          className={`status-banner ${status.kind}`}
        >
          {status.kind === 'error' ? (
            <AlertCircle className="size-4" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          <AlertDescription>{status.text}</AlertDescription>
        </Alert>
      ) : null}

      <div className="gmail-toolbar">
        <div className="toolbar-left">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Refresh"
            onClick={onRefresh}
          >
            <RefreshCcw className="size-4" />
          </Button>
          <div>
            <strong>{activeFolder[0].toUpperCase() + activeFolder.slice(1)}</strong>
            {hasQuery ? (
              <span>
                {filteredCount} of {totalCount} matching &quot;{query}&quot;
              </span>
            ) : (
              <span>{messageCounts[activeFolder] || messages.length} messages</span>
            )}
          </div>
        </div>
        <div className="toolbar-right">
          {hasQuery ? (
            <Button type="button" variant="ghost" size="sm" onClick={onSearchClear}>
              <SearchX className="size-4" />
              Clear search
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flow-mail-strip" aria-label="Current mailbox">
        <div>
          <Inbox className="size-5" />
          <span>
            {hasQuery
              ? 'Search is filtering the live mailbox below.'
              : 'Messages below come from the selected Flow folder.'}
          </span>
        </div>
      </div>

      <div className="gmail-message-list">
        {isLoadingMessages ? (
          <div className="gmail-skeleton-list" aria-label="Loading mail">
            {Array.from({ length: 8 }).map((_, index) => (
              <div className="gmail-skeleton-row" key={index}>
                <Skeleton className="size-4 rounded-sm" />
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="h-4 w-[18%]" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            title="No mail here yet"
            body={
              activeFolder === 'inbox'
                ? 'New messages sent to your Flow address will appear here.'
                : 'Messages you send or move to this folder will appear here.'
            }
          />
        ) : (
          messages.map(thread => (
            <Button
              type="button"
              key={thread.id}
              variant="ghost"
              className={thread.unread ? 'gmail-row unread' : 'gmail-row'}
              onClick={() => onOpenMessage(thread.id)}
            >
              <span className="gmail-checkbox" />
              <Star
                className={thread.starred ? 'size-5 star active' : 'size-5 star'}
                fill={thread.starred ? 'currentColor' : 'none'}
              />
              <span className="gmail-sender">
                {thread.direction === 'outbound'
                  ? `To ${thread.to.join(', ')}`
                  : thread.from}
              </span>
              <span className="gmail-subject">
                <strong>{thread.subject || '(no subject)'}</strong>
                <span>{thread.preview ? ` - ${thread.preview}` : ''}</span>
              </span>
              {thread.attachments ? <Paperclip className="size-4" /> : <span />}
              <time>{formatInboxTime(thread.sentAt || thread.receivedAt)}</time>
            </Button>
          ))
        )}
      </div>
    </section>
  );
}
