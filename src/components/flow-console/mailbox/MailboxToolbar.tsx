'use client';

import type { ChangeEvent } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import styles from '@/components/FlowConsole.module.css';

export interface MailboxToolbarProps {
  allThreadsCount: number;
  allVisibleSelected: boolean;
  hasSelection: boolean;
  onDeleteSelected: () => void;
  onSelectAll: (event: ChangeEvent<HTMLInputElement>) => void;
  selectedFolderTitle: string;
  totalThreads: number;
  pageStart?: number;
  pageEnd?: number;
  currentPage?: number;
  totalPages?: number;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

export function MailboxToolbar({
  allThreadsCount,
  allVisibleSelected,
  hasSelection,
  onDeleteSelected,
  onSelectAll,
  selectedFolderTitle,
  totalThreads,
  pageStart = 1,
  pageEnd = totalThreads,
  currentPage = 1,
  totalPages = 1,
  onNextPage,
  onPrevPage,
}: MailboxToolbarProps) {
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages || pageEnd < allThreadsCount;

  return (
    <div className={styles.listToolbar}>
      <div className={styles.listTools}>
        <input
          aria-label="Select all messages on page"
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
          <Trash2 aria-hidden="true" size={18} />
        </button>
      </div>

      <div className={styles.folderSummary}>
        <strong>{selectedFolderTitle}</strong>
        <div className={styles.paginationControls}>
          <span className={styles.paginationRange}>
            {allThreadsCount === 0
              ? '0 of 0'
              : `${pageStart}–${pageEnd} of ${allThreadsCount}`}
          </span>

          {onPrevPage && onNextPage ? (
            <div className="flex items-center gap-1 ml-1">
              <button
                aria-label="Previous page"
                className={styles.paginationButton}
                disabled={!canGoPrev}
                onClick={onPrevPage}
                title="Previous page"
                type="button"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                aria-label="Next page"
                className={styles.paginationButton}
                disabled={!canGoNext}
                onClick={onNextPage}
                title="Next page"
                type="button"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
