export type MailFolder =
  | 'inbox'
  | 'starred'
  | 'sent'
  | 'drafts'
  | 'bin'
  | 'allmail';

export type MessageFolder =
  | MailFolder
  | 'archived'
  | 'campaigns'
  | 'scheduled'
  | 'trash';

export type MailMessage = {
  attachments: number;
  body: string;
  clickedAt?: string;
  clickCount?: number;
  date: string;
  deliveredAt?: string;
  deliveryStatus?: string;
  direction: 'inbound' | 'outbound';
  firstOpenedAt?: string;
  folder: MessageFolder;
  from: string;
  html?: string;
  id: string;
  inReplyTo?: string;
  isReaction?: boolean;
  name: string;
  openCount?: number;
  openedAt?: string;
  preview: string;
  reactionCount?: number;
  reactionEmoji?: string;
  reactionFrom?: string;
  references?: string[];
  starred: boolean;
  subject: string;
  threadKey?: string;
  to: string[];
  unread: boolean;
};

export type MailThread = {
  allMessages: MailMessage[];
  count: number;
  id: string;
  latest: MailMessage;
  messages: MailMessage[];
  reactions: MailReaction[];
  starred: boolean;
  subject: string;
  unread: boolean;
};

export type MailReaction = {
  count: number;
  emoji: string;
  from: string;
};

export type ComposeFields = {
  body: string;
  from: string;
  subject: string;
  to: string;
};

export type ComposeAttachment = {
  content: string;
  contentId?: string;
  contentType?: string;
  filename: string;
  id: string;
  inline?: boolean;
  size: number;
};

export type ContactPreview = {
  email: string;
  name: string;
};

export type StatusMessage = {
  kind: 'info' | 'success';
  text: string;
};

export type AccessSession = {
  expiresAt: string;
  keyLabel: string;
};

export type FlowSender = {
  addedAt?: string | null;
  email: string;
  label: string;
  name?: string;
  source?: 'env' | 'custom';
};

export type FlowConfig = {
  defaultFrom: string;
  defaultReplyTo: string;
  inboundAddress?: string;
  inboundConfigured?: boolean;
  maxRecipients: number;
  resendConfigured: boolean;
  senders?: FlowSender[];
};

export type BackendMessage = {
  attachments?: number;
  clickedAt?: string;
  clickCount?: number;
  createdAt?: string;
  deliveredAt?: string;
  deliveryStatus?: string;
  direction: 'inbound' | 'outbound';
  firstOpenedAt?: string;
  folder: string;
  from: string;
  html?: string;
  id: string;
  inReplyTo?: string;
  isReaction?: boolean;
  openCount?: number;
  openedAt?: string;
  preview?: string;
  reactionCount?: number;
  reactionEmoji?: string;
  reactionFrom?: string;
  receivedAt?: string;
  references?: string[];
  sentAt?: string;
  starred?: boolean;
  subject?: string;
  text?: string;
  threadKey?: string;
  to?: string[];
  unread?: boolean;
};

export type BackendMessagesResponse = {
  counts?: Partial<Record<string, number>>;
  messages?: BackendMessage[];
};

export type ServerSentEvent = {
  data: string;
  event: string;
};

export type DeleteConfirm = {
  body: string;
  messageIds: string[];
  permanent: boolean;
  title: string;
};

export type FlowConsoleProps = {
  accessSession: AccessSession;
  onLock: () => Promise<void>;
};
