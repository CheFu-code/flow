'use client';

import { useEffect, useRef, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { MessageRow } from './MessageRow';
import { MailboxEmptyState } from './MailboxEmptyState';
import { MailboxSkeleton } from './MailboxSkeleton';
import { MailboxToolbar } from './MailboxToolbar';
import type {
  ContactPreview,
  MailFolder,
  MailThread,
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
  totalThreads: number;
  virtualEnd: number;
  virtualStart: number;
  pageStart?: number;
  pageEnd?: number;
  currentPage?: number;
  totalPages?: number;
  focusedThreadId?: string | null;
  paginationMode?: 'virtual' | 'paginated';
  onNextPage?: () => void;
  onPrevPage?: () => void;
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
  totalThreads,
  virtualEnd,
  virtualStart,
  pageStart,
  pageEnd,
  currentPage,
  totalPages,
  focusedThreadId,
  paginationMode = 'virtual',
  onNextPage,
  onPrevPage,
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
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // IntersectionObserver sentinel for automatic seamless infinite scroll
  useEffect(() => {
    if (paginationMode === 'paginated') return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry?.isIntersecting && !isLoadingMore && !isLoadingMessages) {
          onLoadMore();
        }
      },
      { rootMargin: '300px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoadingMessages, isLoadingMore, onLoadMore, paginationMode]);

  return (
    <div className={styles.listPane}>
      <MailboxToolbar
        allThreadsCount={allThreadsCount}
        allVisibleSelected={allVisibleSelected}
        currentPage={currentPage}
        hasSelection={hasSelection}
        onDeleteSelected={onDeleteSelected}
        onNextPage={onNextPage}
        onPrevPage={onPrevPage}
        onSelectAll={onSelectAll}
        pageEnd={pageEnd}
        pageStart={pageStart}
        selectedFolderTitle={selectedFolderTitle}
        totalPages={totalPages}
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
            paginationMode === 'virtual' &&
            element.scrollTop + element.clientHeight >= element.scrollHeight - 280
          ) {
            onLoadMore();
          }
        }}
      >
        {isLoadingMessages && renderedThreads.length === 0 ? (
          <MailboxSkeleton count={12} />
        ) : renderedThreads.length > 0 ? (
          <>
            {paginationMode === 'virtual' ? (
              <div style={{ height: virtualStart * 44 }} />
            ) : null}

            {renderedThreads.map(thread => (
              <MessageRow
                isKeyboardFocused={thread.id === focusedThreadId}
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

            {paginationMode === 'virtual' ? (
              <div
                style={{
                  height: Math.max(0, (totalThreads - virtualEnd) * 44),
                }}
              />
            ) : null}

            {/* Infinite scroll sentinel */}
            {paginationMode === 'virtual' ? (
              <div ref={sentinelRef} style={{ height: 1, width: '100%' }} />
            ) : null}
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
