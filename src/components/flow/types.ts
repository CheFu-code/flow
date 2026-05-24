import type { ComponentType } from 'react';

export type FolderName =
  | 'inbox'
  | 'sent'
  | 'scheduled'
  | 'campaigns'
  | 'archived'
  | 'trash';

export type Delivery = {
  action: string;
  count: number;
  id: string;
  sentAt: string;
  subject: string;
};

export type FlowConfig = {
  defaultFrom: string;
  defaultReplyTo: string;
  inboundAddress?: string;
  inboundConfigured?: boolean;
  maxRecipients: number;
  resendConfigured: boolean;
  senders?: SenderIdentity[];
};

export type SenderIdentity = {
  email: string;
  label: string;
};

export type MailThread = {
  id: string;
  folder: FolderName;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string[];
  subject: string;
  preview: string;
  text?: string;
  html?: string;
  receivedAt?: string;
  messageId?: string;
  resendEmailId?: string;
  sentAt?: string;
  unread: boolean;
  starred: boolean;
  label?: string;
  attachments: number;
};

export type MessagesResponse = {
  counts?: Partial<Record<FolderName, number>>;
  messages: MailThread[];
};

export type FolderDefinition = {
  name: string;
  folder: FolderName;
  icon: ComponentType<{ className?: string }>;
};

export type StatusMessage = {
  kind: 'success' | 'error';
  text: string;
};
