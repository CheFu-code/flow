'use client';

import type { ChangeEvent, KeyboardEvent, MouseEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { MessageRow } from './MessageRow';
import { MailboxEmptyState } from './MailboxEmptyState';
import { MailboxSkeleton } from './MailboxSkeleton';
import { MailboxToolbar } from './MailboxToolbar';
import type {
  ContactPreview,
  MailFolder,
  MailThread,
  StatusMessage,
} from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export interface MailboxListProps {
  activeEmptyState: { heading: string; subHeading: string };
  activeFolder?: MailFolder;
  allThreadsCount: number;
  allVisibleSelected: boolean;
  hasSelection: boolean;
  isLoadingMessages: boolean;
  isLoadingMore: boolean;
  query: string;
  debouncedQuery: string;
  renderedThreads: MailThread[];
  selectedIdSet: Set<string>;
  status?: StatusMessage | null;
  totalThreads: number;
  virtualEnd: number;
  virtualStart: number;
  onDeleteSelected: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>, threadId: string) => void;
  onLoadMore: () => void;
  onOpenCompose: (contact: ContactPreview) => void;
  onSelect: (threadId: string) => void;
  onSelectAll: (event: ChangeEvent<HTMLInputElement>) => void;
  onShowStatus: (tool: string, contact: ContactPreview) => void;
  onScroll: (scrollTop: number) => void;
  onToggleSelect: (threadId: string) => void;
  onToggleStarred: (event: MouseEvent, messageId: string) => void;
  selectedFolderTitle: string;
}

export function MailboxList({
  activeEmptyState,
  activeFolder,
  allThreadsCount,
  allVisibleSelected,
  hasSelection,
  isLoadingMessages,
  isLoadingMore,
  query,
  debouncedQuery,
  renderedThreads,
  selectedIdSet,
  status,
  totalThreads,
  virtualEnd,
  virtualStart,
  onDeleteSelected,
  onKeyDown,
  onLoadMore,
  onOpenCompose,
  onSelect,
  onSelectAll,
  onShowStatus,
  onScroll,
  onToggleSelect,
  onToggleStarred,
  selectedFolderTitle,
}: MailboxListProps) {
  return (
    <div className={styles.listPane}>
      <MailboxToolbar
        allThreadsCount={allThreadsCount}
        allVisibleSelected={allVisibleSelected}
        hasSelection={hasSelection}
        onDeleteSelected={onDeleteSelected}
        onSelectAll={onSelectAll}
        selectedFolderTitle={selectedFolderTitle}
        totalThreads={totalThreads}
      />

      <div aria-label="Mailbox statistics" className={styles.insightBar}>
        <span>
          <strong>{allThreadsCount}</strong> conversations
        </span>
        {query !== debouncedQuery ? (
          <span className={styles.refiningBadge}>Refining search...</span>
        ) : null}
      </div>

      <div
        aria-busy={isLoadingMessages}
        aria-label="Message list"
        className={styles.messageList}
        onScroll={event => {
          const element = event.currentTarget;
          onScroll(element.scrollTop);
          if (
            element.scrollTop + element.clientHeight >=
            element.scrollHeight - 240
          ) {
            onLoadMore();
          }
        }}
      >
        {isLoadingMessages && renderedThreads.length === 0 ? (
          <MailboxSkeleton count={12} />
        ) : renderedThreads.length > 0 ? (
          <>
            <div style={{ height: virtualStart * 44 }} />
            {renderedThreads.map(thread => (
              <MessageRow
                isSelected={selectedIdSet.has(thread.id)}
                key={thread.id}
                onKeyDown={onKeyDown}
                onOpenCompose={onOpenCompose}
                onSelect={onSelect}
                onShowStatus={onShowStatus}
                onToggleSelect={onToggleSelect}
                onToggleStarred={onToggleStarred}
                thread={thread}
              />
            ))}
            <div
              style={{
                height: Math.max(0, (totalThreads - virtualEnd) * 44),
              }}
            />
          </>
        ) : (
          <MailboxEmptyState
            emptyState={activeEmptyState}
            folder={activeFolder}
            onCompose={() =>
              onOpenCompose({ email: '', name: '' })
            }
          />
        )}

        {isLoadingMore ? (
          <div
            aria-live="polite"
            className={styles.loadingMore}
            role="status"
          >
            <Loader2 className={styles.spin} size={16} />
            <span>Loading older messages...</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
