import { defaultReactionEmoji } from './constants';
import type {
  BackendMessage,
  ContactPreview,
  MailFolder,
  MailMessage,
  MailReaction,
  MailThread,
  MessageFolder,
} from './types';

export function addressEmail(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
}

export function contactFromMessage(message: MailMessage): ContactPreview {
  if (message.folder === 'sent') {
    const email = message.to[0] || '';

    return {
      email,
      name: email.split('@')[0] || 'recipient',
    };
  }

  return {
    email: addressEmail(message.from),
    name: message.name || addressEmail(message.from).split('@')[0] || 'Sender',
  };
}

export function backendFolderFor(folder: MailFolder) {
  if (folder === 'bin') return 'trash';
  return folder;
}

export function uiFolderFor(folder: string): MessageFolder {
  if (folder === 'trash') return 'bin';
  if (['inbox', 'sent', 'drafts', 'starred', 'allmail'].includes(folder)) {
    return folder as MailFolder;
  }
  if (['archived', 'campaigns', 'scheduled'].includes(folder)) {
    return folder as MessageFolder;
  }
  return 'inbox';
}

export function participantName(message: BackendMessage) {
  if (message.direction === 'outbound') return 'Flow Mail';
  const address = message.from || '';
  const match = address.match(/^(.+?)\s*<(.+?)>$/);
  if (match?.[1]) return match[1].replace(/^"|"$/g, '').trim();
  return address.split('@')[0] || 'Sender';
}

export function toMailMessage(message: BackendMessage): MailMessage {
  return {
    attachments: Number(message.attachments) || 0,
    body: message.text || message.preview || '',
    clickedAt: message.clickedAt,
    clickCount: Number(message.clickCount) || 0,
    date:
      message.sentAt ||
      message.receivedAt ||
      message.createdAt ||
      new Date().toISOString(),
    deliveredAt: message.deliveredAt,
    deliveryStatus: message.deliveryStatus,
    direction: message.direction === 'outbound' ? 'outbound' : 'inbound',
    firstOpenedAt: message.firstOpenedAt,
    folder: uiFolderFor(message.folder),
    from: message.from || '',
    html: message.html,
    id: message.id,
    inReplyTo: message.inReplyTo,
    isReaction: Boolean(message.isReaction),
    name: participantName(message),
    openCount: Number(message.openCount) || 0,
    openedAt: message.openedAt,
    preview: message.preview || message.text || '',
    reactionCount: Number(message.reactionCount) || undefined,
    reactionEmoji: message.reactionEmoji,
    reactionFrom: message.reactionFrom,
    references: Array.isArray(message.references) ? message.references : [],
    starred: Boolean(message.starred),
    subject: message.subject || '(no subject)',
    threadKey: message.threadKey,
    to: Array.isArray(message.to) ? message.to : [],
    unread: Boolean(message.unread),
  };
}

export function messageThreadKey(message: MailMessage) {
  return message.threadKey || `message:${message.id}`;
}

export function sortByDateAsc(left: MailMessage, right: MailMessage) {
  return new Date(left.date).getTime() - new Date(right.date).getTime();
}

export function sortByDateDesc(left: MailMessage, right: MailMessage) {
  return new Date(right.date).getTime() - new Date(left.date).getTime();
}

export function groupMessagesIntoThreads(messages: MailMessage[]): MailThread[] {
  const groups = new Map<string, MailMessage[]>();

  messages.forEach(message => {
    const key = messageThreadKey(message);
    groups.set(key, [...(groups.get(key) || []), message]);
  });

  return [...groups.entries()]
    .map(([id, threadMessages]) => {
      const orderedAllMessages = [...threadMessages].sort(sortByDateAsc);
      const orderedMessages = orderedAllMessages.filter(
        message => !message.isReaction,
      );
      const reactionMessages = orderedAllMessages.filter(
        message => message.isReaction,
      );
      if (!orderedMessages.length) return null;

      const latest =
        [...orderedMessages].sort(sortByDateDesc)[0] ||
        [...orderedAllMessages].sort(sortByDateDesc)[0];

      return {
        allMessages: orderedAllMessages,
        count: Math.max(orderedMessages.length, 1),
        id,
        latest,
        messages: orderedMessages,
        reactions: groupReactions(reactionMessages),
        starred: latest.starred,
        subject: latest.subject,
        unread: orderedAllMessages.some(message => message.unread),
      };
    })
    .filter((thread): thread is MailThread => Boolean(thread))
    .sort((left, right) => sortByDateDesc(left.latest, right.latest));
}

export function groupReactions(messages: MailMessage[]): MailReaction[] {
  const reactions = new Map<string, MailReaction>();

  messages.forEach(message => {
    const emoji = message.reactionEmoji || defaultReactionEmoji;
    const reaction = reactions.get(emoji) || {
      count: 0,
      emoji,
      from: message.reactionFrom || message.name,
    };

    reaction.count += message.reactionCount || 1;
    reactions.set(emoji, reaction);
  });

  return [...reactions.values()];
}

export function threadDeleteCopy(count: number, permanent: boolean) {
  const noun = count === 1 ? 'message' : 'messages';

  return permanent
    ? {
        body: `This will permanently delete ${count} ${noun}. This cannot be undone.`,
        title: 'Delete forever?',
      }
    : {
        body: `This will move ${count} ${noun} to Bin.`,
        title: 'Move to Bin?',
      };
}

export function isLastVisibleMessage(thread: MailThread, message: MailMessage) {
  return thread.messages[thread.messages.length - 1]?.id === message.id;
}

export function cleanReplyBody(value: string) {
  const body = value.replace(/\r\n/g, '\n').trim();
  const markers = [
    /^\s*On .+wrote:\s*$/im,
    /^\s*From:\s.+$/im,
    /^\s*-{2,}\s*Original Message\s*-{2,}\s*$/im,
  ];
  const cutAt = markers
    .map(pattern => body.search(pattern))
    .filter(index => index > 0)
    .sort((left, right) => left - right)[0];

  return cutAt ? body.slice(0, cutAt).trim() || body : body;
}

export function mapCounts(counts?: Partial<Record<string, number>>) {
  return {
    allmail: Number(counts?.allmail) || 0,
    bin: Number(counts?.trash || counts?.bin) || 0,
    drafts: Number(counts?.drafts) || 0,
    inbox: Number(counts?.inbox) || 0,
    sent: Number(counts?.sent) || 0,
    starred: Number(counts?.starred) || 0,
  };
}
