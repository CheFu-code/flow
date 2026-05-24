import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { folderDefinitions } from './constants';
import { ConnectionRow } from './shared';
import type { FlowConfig, FolderName } from './types';

type FlowSidebarProps = {
  activeFolder: FolderName;
  config: FlowConfig;
  messageCounts: Partial<Record<FolderName, number>>;
  onCompose: () => void;
  onSelectFolder: (folder: FolderName) => void;
};

export function FlowSidebar({
  activeFolder,
  config,
  messageCounts,
  onCompose,
  onSelectFolder,
}: FlowSidebarProps) {
  return (
    <aside className="gmail-sidebar">
      <Button type="button" className="gmail-compose" onClick={onCompose}>
        <Plus className="size-5" />
        Compose
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

      <div className="gmail-connection">
        <ConnectionRow
          connected={config.resendConfigured}
          label={config.resendConfigured ? 'Sending connected' : 'Sending pending'}
        />
        <ConnectionRow
          connected={Boolean(config.inboundConfigured)}
          label={config.inboundConfigured ? 'Receiving verified' : 'Receiving pending'}
        />
      </div>
    </aside>
  );
}
