import { folderItems } from './constants';
import type { MailFolder, MailMessage, MessageFolder } from './types';

export function formatFileSize(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function formatListDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(value));
}

export function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatTrackingDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function formatSessionExpiry(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function getFolderLabel(folder: MailFolder) {
  return folderItems.find(item => item.folder === folder)?.title || 'Inbox';
}

export function getMessageFolderLabel(folder: MessageFolder) {
  if (folder === 'trash') return 'Bin';
  if (folder === 'archived') return 'Archived';
  if (folder === 'campaigns') return 'Campaigns';
  if (folder === 'scheduled') return 'Scheduled';
  return getFolderLabel(folder);
}

export function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || 'F';
}

export function sentTrackingLabel(message: MailMessage, compact = false) {
  if (message.direction !== 'outbound') return '';

  if (message.openedAt) {
    const count = message.openCount || 1;
    return compact
      ? `Opened${count > 1 ? ` ${count}x` : ''}`
      : `Opened ${count > 1 ? `${count} times, last ` : ''}${formatTrackingDate(
          message.openedAt,
        )}`;
  }

  if (message.clickedAt) {
    return compact ? 'Clicked' : `Clicked ${formatTrackingDate(message.clickedAt)}`;
  }

  if (message.deliveredAt) {
    return compact
      ? 'Delivered'
      : `Delivered ${formatTrackingDate(message.deliveredAt)}`;
  }

  if (
    ['bounced', 'complained', 'delayed', 'failed'].includes(
      message.deliveryStatus || '',
    )
  ) {
    const label = message.deliveryStatus || '';
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  return 'Not opened yet';
}

export function sentTrackingKind(message: MailMessage) {
  if (message.openedAt || message.clickedAt) return 'open';
  if (message.deliveredAt) return 'delivered';
  if (
    ['bounced', 'complained', 'delayed', 'failed'].includes(
      message.deliveryStatus || '',
    )
  ) {
    return 'warning';
  }
  return 'pending';
}
