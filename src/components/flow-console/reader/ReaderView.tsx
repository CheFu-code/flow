'use client';

import type { MouseEvent } from 'react';
import { ExternalLink, Printer } from 'lucide-react';
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
        <h1 className={styles.readerSubject}>
          <span>{selectedThread.subject}</span>
          <span className={styles.readerSubjectBadge}>
            {selectedThread.count > 1
              ? `${selectedThread.count} messages`
              : getMessageFolderLabel(selectedThread.latest.folder)}
          </span>
        </h1>
        <div className={styles.readerSubjectActions}>
          <button
            aria-label="Print entire conversation"
            className={styles.readerIconButton}
            data-tooltip="Print all"
            onClick={onPrint}
            type="button"
          >
            <Printer size={18} />
          </button>
          <button
            aria-label="Open conversation in new window"
            className={styles.readerIconButton}
            data-tooltip="Open in new window"
            onClick={onOpenNewWindow}
            type="button"
          >
            <ExternalLink size={18} />
          </button>
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
