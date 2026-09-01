'use client';

import { Pencil } from 'lucide-react';
import { folderItems } from '@/lib/flow-console/constants';
import type { MailFolder } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export type FlowSidebarProps = {
  activeFolder: MailFolder;
  canWrite: boolean;
  folderCounts: Record<MailFolder, number>;
  onCompose: () => void;
  onFolderChange: (folder: MailFolder) => void;
  onCloseMobile?: () => void;
};

export function FlowSidebar({
  activeFolder,
  canWrite,
  folderCounts,
  onCompose,
  onFolderChange,
  onCloseMobile,
}: FlowSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <button
        aria-label="Compose new message"
        className={styles.composeButton}
        disabled={!canWrite}
        onClick={() => {
          onCompose();
          onCloseMobile?.();
        }}
        type="button"
      >
        <Pencil className={styles.composeButtonIcon} size={19} />
        <span>Compose</span>
      </button>

      <nav aria-label="Mail folders" className={styles.folderList}>
        {folderItems.map(item => {
          const Icon = item.icon;
          const isActive = activeFolder === item.folder;
          const count = folderCounts[item.folder] || 0;

          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              className={
                isActive
                  ? `${styles.folderButton} ${styles.folderActive}`
                  : styles.folderButton
              }
              key={item.folder}
              onClick={() => {
                onFolderChange(item.folder);
                onCloseMobile?.();
              }}
              type="button"
            >
              <Icon className={styles.folderIcon} size={18} />
              <span className={styles.folderTitle}>{item.title}</span>
              {count > 0 ? (
                <strong
                  aria-label={`${count} messages in ${item.title}`}
                  className={styles.folderCount}
                >
                  {count}
                </strong>
              ) : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
