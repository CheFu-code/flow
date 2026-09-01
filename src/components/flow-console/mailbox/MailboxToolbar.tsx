'use client';

import type { ChangeEvent } from 'react';
import { Trash2 } from 'lucide-react';
import styles from '@/components/FlowConsole.module.css';

export interface MailboxToolbarProps {
  allThreadsCount: number;
  allVisibleSelected: boolean;
  hasSelection: boolean;
  onDeleteSelected: () => void;
  onSelectAll: (event: ChangeEvent<HTMLInputElement>) => void;
  selectedFolderTitle: string;
  totalThreads: number;
}

export function MailboxToolbar({
  allThreadsCount,
  allVisibleSelected,
  hasSelection,
  onDeleteSelected,
  onSelectAll,
  selectedFolderTitle,
  totalThreads,
}: MailboxToolbarProps) {
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
        <span>
          {totalThreads} of {allThreadsCount} shown
        </span>
      </div>
    </div>
  );
}
