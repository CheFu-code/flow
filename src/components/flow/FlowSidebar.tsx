import { PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { folderDefinitions } from './constants';
import styles from './FlowSidebar.module.css';
import type { FolderName } from './types';

type FlowSidebarProps = {
  activeFolder: FolderName;
  messageCounts: Partial<Record<FolderName, number>>;
  onCompose: () => void;
  onSelectFolder: (folder: FolderName) => void;
};

export function FlowSidebar({
  activeFolder,
  messageCounts,
  onCompose,
  onSelectFolder,
}: FlowSidebarProps) {
  return (
    <aside className="gmail-sidebar">
      <Button type="button" className={styles.composeButton} onClick={onCompose}>
        <span className={styles.composeIcon} aria-hidden="true">
          <PenLine className="size-4" />
        </span>
        <span className={styles.composeText}>Compose</span>
      </Button>

      <nav className="gmail-folders" aria-label="Mail folders">
        {folderDefinitions.map(folder => (
          <Button
            type="button"
            key={folder.name}
            variant="ghost"
            className={
              activeFolder === folder.folder ? 'gmail-folder active' : 'gmail-folder'
            }
            onClick={() => onSelectFolder(folder.folder)}
          >
            <folder.icon className="size-5" />
            <span>{folder.name}</span>
            <strong>{messageCounts[folder.folder] || ''}</strong>
          </Button>
        ))}
      </nav>
    </aside>
  );
}
