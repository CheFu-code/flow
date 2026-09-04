'use client';

import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { folderItems } from '@/lib/flow-console/constants';
import type { MailFolder } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export type FlowSidebarProps = {
  activeFolder: MailFolder;
  canWrite: boolean;
  folderCounts: Record<MailFolder, number>;
  unreadCounts?: Record<MailFolder, number>;
  onCompose: () => void;
  onFolderChange: (folder: MailFolder) => void;
  onCloseMobile?: () => void;
};

export function FlowSidebar({
  activeFolder,
  canWrite,
  folderCounts,
  unreadCounts,
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

          // For inbox and mail folders, show unread count. For drafts, show total drafts count.
          const count =
            item.folder === 'drafts'
              ? (folderCounts.drafts || unreadCounts?.drafts || 0)
              : (unreadCounts?.[item.folder] ?? (item.folder === 'inbox' ? folderCounts.inbox : 0));

          const isUnreadBadge = item.folder !== 'drafts' && count > 0;

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
                <Badge
                  variant={isUnreadBadge ? 'brand' : isActive ? 'brand' : 'secondary'}
                  className={`h-5 text-[11px] px-1.5 min-w-[20px] justify-center ml-auto transition-all ${
                    isUnreadBadge ? 'font-bold shadow-xs' : 'font-medium'
                  }`}
                  aria-label={`${count} ${isUnreadBadge ? 'unread' : ''} messages in ${item.title}`}
                >
                  {count}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
