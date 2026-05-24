import { Archive, Clock, Inbox, Send, Tags, Trash2 } from 'lucide-react';
import type { FolderDefinition } from './types';

export const folderDefinitions: FolderDefinition[] = [
  { name: 'Inbox', folder: 'inbox', icon: Inbox },
  { name: 'Sent', folder: 'sent', icon: Send },
  { name: 'Scheduled', folder: 'scheduled', icon: Clock },
  { name: 'Campaigns', folder: 'campaigns', icon: Tags },
  { name: 'Archived', folder: 'archived', icon: Archive },
  { name: 'Trash', folder: 'trash', icon: Trash2 },
];
