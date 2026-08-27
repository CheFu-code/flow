'use client';

import { Pencil } from 'lucide-react';
import { folderItems } from '@/lib/flow-console/constants';
import type { MailFolder } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

type FlowSidebarProps = {
  activeFolder: MailFolder;
  canWrite: boolean;
  folderCounts: Record<MailFolder, number>;
  onCompose: () => void;
  onFolderChange: (folder: MailFolder) => void;
};

export function FlowSidebar({
  activeFolder,
  canWrite,
  folderCounts,
  onCompose,
  onFolderChange,
}: FlowSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <button className={styles.composeButton} disabled={!canWrite} onClick={onCompose} type="button">
        <Pencil size={20} />
        Compose
      </button>
      <nav className={styles.folderList} aria-label="Mail folders">
        {folderItems.map(item => {
          const Icon = item.icon;
          const isActive = activeFolder === item.folder;
          return (
            <button
              className={isActive ? `${styles.folderButton} ${styles.folderActive}` : styles.folderButton}
              key={item.folder}
              onClick={() => onFolderChange(item.folder)}
              type="button"
            >
              <Icon size={18} />
              <span>{item.title}</span>
              {folderCounts[item.folder] ? <strong>{folderCounts[item.folder]}</strong> : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
