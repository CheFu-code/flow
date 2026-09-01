'use client';

import type { MouseEvent } from 'react';
import { ExternalLink, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReaderMessageItem } from './ReaderMessageItem';
import { ReaderQuickReply } from './ReaderQuickReply';
import { ReaderToolbar } from './ReaderToolbar';
import { getMessageFolderLabel } from '@/lib/flow-console/format';
import type {
  ContactPreview,
  MailMessage,
  MailThread,
  MessageFolder,
} from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export interface ReaderViewProps {
  canOpenNewerThread: boolean;
  canOpenOlderThread: boolean;
  onAddReaction: (messageId: string, emoji: string) => void;
  onArchive: () => void;
  onBack: () => void;
  onCopyLink: (message: MailMessage) => void;
  onDelete: () => void;
  onDownload: () => void;
  onMarkUnread: () => void;
  onMoveTo: (folder: MessageFolder) => void;
  onOffsetChange: (offset: number) => void;
  onOpenComposeToContact: (contact: ContactPreview) => void;
  onOpenNewWindow: () => void;
  onPrint: () => void;
  onReply: (message: MailMessage) => void;
  onReport: () => void;
  onShowContactToolStatus: (tool: string, contact: ContactPreview) => void;
  onShowOriginal: () => void;
  onToggleStarred: (event: MouseEvent, messageId: string) => void;
  readerPositionLabel: string;
  selectedThread: MailThread;
}

export function ReaderView({
  canOpenNewerThread,
  canOpenOlderThread,
  onAddReaction,
  onArchive,
  onBack,
  onCopyLink,
  onDelete,
  onDownload,
  onMarkUnread,
  onMoveTo,
  onOffsetChange,
  onOpenComposeToContact,
  onOpenNewWindow,
  onPrint,
  onReply,
  onReport,
  onShowContactToolStatus,
  onShowOriginal,
  onToggleStarred,
  readerPositionLabel,
  selectedThread,
}: ReaderViewProps) {
  return (
    <article aria-label={selectedThread.subject} className={styles.reader}>
      <ReaderToolbar
        canOpenNewerThread={canOpenNewerThread}
        canOpenOlderThread={canOpenOlderThread}
        onArchive={onArchive}
        onBack={onBack}
        onDelete={onDelete}
        onDownload={onDownload}
        onMarkUnread={onMarkUnread}
        onMoveTo={onMoveTo}
        onOffsetChange={onOffsetChange}
        onReport={onReport}
        onShowOriginal={onShowOriginal}
        readerPositionLabel={readerPositionLabel}
      />

      <div className={styles.readerHeaderLine}>
        <div className="flex items-baseline gap-3 flex-wrap min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight m-0 truncate">
            {selectedThread.subject}
          </h1>
          <Badge variant="brand" className="font-semibold text-xs shrink-0">
            {selectedThread.count > 1
              ? `${selectedThread.count} messages`
              : getMessageFolderLabel(selectedThread.latest.folder)}
          </Badge>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            aria-label="Print entire conversation"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={onPrint}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Printer className="size-4" />
          </Button>
          <Button
            aria-label="Open conversation in new window"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={onOpenNewWindow}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ExternalLink className="size-4" />
          </Button>
        </div>
      </div>

      <div className={styles.readerThread}>
        {selectedThread.messages.map(message => (
          <ReaderMessageItem
            key={message.id}
            message={message}
            onAddReaction={onAddReaction}
            onCopyLink={onCopyLink}
            onDownload={onDownload}
            onOpenComposeToContact={onOpenComposeToContact}
            onReply={onReply}
            onShowContactToolStatus={onShowContactToolStatus}
            onToggleStarred={onToggleStarred}
            thread={selectedThread}
          />
        ))}

        <ReaderQuickReply
          latestMessage={selectedThread.latest}
          onReply={onReply}
        />
      </div>
    </article>
  );
}
