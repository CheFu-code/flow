'use client';

import type { ChangeEvent, KeyboardEvent, MouseEvent } from 'react';
import { Mail, Trash2 } from 'lucide-react';
import { MessageRow } from '@/components/MessageRow';
import type { ContactPreview, MailThread, StatusMessage } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

type MailboxListProps = {
    activeEmptyState: { heading: string; subHeading: string };
    allThreadsCount: number;
    allVisibleSelected: boolean;
    hasSelection: boolean;
    isLoadingMessages: boolean;
    isLoadingMore: boolean;
    query: string;
    debouncedQuery: string;
    renderedThreads: MailThread[];
    selectedIdSet: Set<string>;
    status: StatusMessage | null;
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
};

export function MailboxList({
    activeEmptyState,
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
            <div className={styles.listToolbar}>
                <div className={styles.listTools}>
                    <input
                        aria-label="Select all messages"
                        checked={allVisibleSelected}
                        className={styles.checkbox}
                        onChange={onSelectAll}
                        type="checkbox"
                    />
                    <button
                        aria-label="Delete selected messages"
                        className={styles.toolbarButton}
                        data-tooltip="Delete"
                        disabled={!hasSelection}
                        onClick={onDeleteSelected}
                        type="button"
                    >
                        <Trash2 aria-hidden="true" size={19} />
                    </button>
                </div>
                <div className={styles.folderSummary}>
                    <strong>{selectedFolderTitle}</strong>
                    <span>{totalThreads} of {allThreadsCount} shown</span>
                </div>
            </div>

            <div className={styles.insightBar} aria-label="Mailbox insights">
                <span><strong>{allThreadsCount}</strong> conversations</span>
                {query !== debouncedQuery ? <span>Refining search...</span> : null}
            </div>

            {status ? (
                <div className={status.kind === 'success' ? `${styles.status} ${styles.statusSuccess}` : styles.status} role="status">
                    {status.text}
                </div>
            ) : null}

            <div
                aria-busy={isLoadingMessages}
                className={styles.messageList}
                onScroll={event => {
                    const element = event.currentTarget;
                    onScroll(element.scrollTop);
                    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 240) onLoadMore();
                }}
            >
                {isLoadingMessages && renderedThreads.length === 0 ? (
                    <MailboxSkeleton />
                ) : renderedThreads.length ? (
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
                        <div style={{ height: Math.max(0, (totalThreads - virtualEnd) * 44) }} />
                    </>
                ) : (
                    <div className={styles.emptyState} role="status">
                        <div className={styles.emptyIcon}><Mail size={48} /></div>
                        <h2>{activeEmptyState.heading}</h2>
                        {activeEmptyState.subHeading ? <p>{activeEmptyState.subHeading}</p> : null}
                    </div>
                )}
                {isLoadingMore ? (
                    <div className={styles.loadingMore} role="status" aria-live="polite">
                        <span className={styles.loadingSpinner} aria-hidden="true" />
                        Loading older mail...
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function MailboxSkeleton() {
    return (
        <div className={styles.mailboxSkeleton} role="status" aria-live="polite">
            <p className={styles.loadingLabel}>Loading your mailbox</p>
            {Array.from({ length: 8 }, (_, index) => (
                <div className={styles.skeletonRow} style={{ animationDelay: `${index * 45}ms` }} key={index}>
                    <span className={styles.skeletonBlock} />
                    <span className={`${styles.skeletonBlock} ${styles.skeletonSender}`} />
                    <span className={`${styles.skeletonBlock} ${styles.skeletonPreview}`} />
                    <span className={`${styles.skeletonBlock} ${styles.skeletonDate}`} />
                </div>
            ))}
        </div>
    );
}
