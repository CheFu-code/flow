import {
  FileText,
  Inbox,
  Mail,
  Send,
  Star,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import type { ComposeFields, FlowConfig, MailFolder } from './types';

export const folderItems: Array<{
  folder: MailFolder;
  icon: LucideIcon;
  title: string;
}> = [
  { folder: 'inbox', icon: Inbox, title: 'Inbox' },
  { folder: 'starred', icon: Star, title: 'Starred' },
  { folder: 'sent', icon: Send, title: 'Sent' },
  { folder: 'drafts', icon: FileText, title: 'Drafts' },
  { folder: 'bin', icon: Trash2, title: 'Bin' },
  { folder: 'allmail', icon: Mail, title: 'All Mail' },
];

export const emptyStates: Record<
  MailFolder,
  { heading: string; subHeading: string }
> = {
  allmail: {
    heading: 'No mail yet',
    subHeading: 'Messages across folders will appear here.',
  },
  bin: {
    heading: 'No conversations in Bin.',
    subHeading: '',
  },
  drafts: {
    heading: "You don't have any saved drafts.",
    subHeading:
      "Saving a draft allows you to keep a message you aren't ready to send yet.",
  },
  inbox: {
    heading: 'Your inbox is empty',
    subHeading: "Mails that don't appear in other tabs will be shown here.",
  },
  sent: {
    heading: 'No sent messages!',
    subHeading: 'Send one now!',
  },
  starred: {
    heading: 'No starred messages',
    subHeading:
      'Stars let you give messages a special status to make them easier to find.',
  },
};

export const emptyFolderCounts: Record<MailFolder, number> = {
  allmail: 0,
  bin: 0,
  drafts: 0,
  inbox: 0,
  sent: 0,
  starred: 0,
};

export const defaultConfig: FlowConfig = {
  defaultFrom: 'Flow Mail <mail@flow.chefuinc.com>',
  defaultReplyTo: '',
  inboundAddress: '',
  inboundConfigured: false,
  maxRecipients: 100,
  resendConfigured: false,
  senders: [],
};

export const initialCompose: ComposeFields = {
  body: '',
  from: '',
  subject: '',
  to: '',
};

export const defaultReactionEmoji = '\u{1F44D}';
export const maxAttachmentBytes = 24 * 1024 * 1024;
export const composeEmojis = [
  '\u{1F600}',
  '\u{1F602}',
  '\u{1F60A}',
  '\u{1F64F}',
  '\u{1F44D}',
  '\u{1F389}',
  '\u{1F680}',
  '\u{2764}\u{FE0F}',
];

export const fontFamilies = [
  'Sans Serif',
  'Serif',
  'Monospace',
  'Arial',
  'Georgia',
  'Tahoma',
  'Verdana',
];

export const fontSizes = [
  { label: 'Small', value: '2' },
  { label: 'Normal', value: '3' },
  { label: 'Large', value: '4' },
  { label: 'Huge', value: '5' },
];
