'use client';

import { useState } from 'react';
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  EllipsisVertical,
  FileCode,
  FolderInput,
  Keyboard,
  MailOpen,
  OctagonAlert,
  Trash2,
} from 'lucide-react';
import type { MessageFolder } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export interface ReaderToolbarProps {
  canOpenNewerThread: boolean;
  canOpenOlderThread: boolean;
  onArchive: () => void;
  onBack: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onMarkUnread: () => void;
  onMoveTo: (folder: MessageFolder) => void;
  onOffsetChange: (offset: number) => void;
  onOpenHelp: () => void;
  onReport: () => void;
  onShowOriginal: () => void;
  readerPositionLabel: string;
}

export function ReaderToolbar({
  canOpenNewerThread,
  canOpenOlderThread,
  onArchive,
  onBack,
  onDelete,
  onDownload,
  onMarkUnread,
  onMoveTo,
  onOffsetChange,
  onOpenHelp,
  onReport,
  onShowOriginal,
  readerPositionLabel,
}: ReaderToolbarProps) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className={styles.readerToolbar}>
      <div className={styles.readerToolbarGroup}>
        <button
          aria-label="Back to message list"
          className={styles.readerIconButton}
          data-tooltip="Back to inbox"
          onClick={() => {
            setMoveOpen(false);
            setMoreOpen(false);
            onBack();
          }}
          type="button"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className={styles.readerToolbarGroup}>
        <button
          aria-label="Archive conversation"
          className={styles.readerIconButton}
          data-tooltip="Archive"
          onClick={() => {
            setMoveOpen(false);
            setMoreOpen(false);
            onArchive();
          }}
          type="button"
        >
          <Archive size={18} />
        </button>
        <button
          aria-label="Report conversation as spam"
          className={styles.readerIconButton}
          data-tooltip="Report spam"
          onClick={() => {
            setMoveOpen(false);
            setMoreOpen(false);
            onReport();
          }}
          type="button"
        >
          <OctagonAlert size={18} />
        </button>
        <button
          aria-label="Delete conversation"
          className={styles.readerIconButton}
          data-tooltip="Delete"
          onClick={() => {
            setMoveOpen(false);
            setMoreOpen(false);
            onDelete();
          }}
          type="button"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <span className={styles.readerToolbarDivider} />

      <div className={styles.readerToolbarGroup}>
        <button
          aria-label="Mark conversation as unread"
          className={styles.readerIconButton}
          data-tooltip="Mark as unread"
          onClick={() => {
            setMoveOpen(false);
            setMoreOpen(false);
            onMarkUnread();
          }}
          type="button"
        >
          <MailOpen size={18} />
        </button>

        <div className={styles.readerMenuWrap}>
          <button
            aria-expanded={moveOpen}
            aria-label="Move conversation to folder"
            className={styles.readerIconButton}
            data-tooltip="Move to"
            onClick={() => {
              setMoreOpen(false);
              setMoveOpen(open => !open);
            }}
            type="button"
          >
            <FolderInput size={18} />
          </button>
          {moveOpen ? (
            <div className={styles.readerMenu} role="menu">
              <button
                onClick={() => {
                  setMoveOpen(false);
                  onMoveTo('inbox');
                }}
                type="button"
              >
                Inbox
              </button>
              <button
                onClick={() => {
                  setMoveOpen(false);
                  onMoveTo('sent');
                }}
                type="button"
              >
                Sent
              </button>
              <button
                onClick={() => {
                  setMoveOpen(false);
                  onMoveTo('drafts');
                }}
                type="button"
              >
                Drafts
              </button>
              <button
                onClick={() => {
                  setMoveOpen(false);
                  onMoveTo('archived');
                }}
                type="button"
              >
                Archive
              </button>
            </div>
          ) : null}
        </div>

        <div className={styles.readerMenuWrap}>
          <button
            aria-expanded={moreOpen}
            aria-label="More message options"
            className={styles.readerIconButton}
            data-tooltip="More actions"
            onClick={() => {
              setMoveOpen(false);
              setMoreOpen(open => !open);
            }}
            type="button"
          >
            <EllipsisVertical size={18} />
          </button>
          {moreOpen ? (
            <div className={styles.readerMenu} role="menu">
              <button
                onClick={() => {
                  setMoreOpen(false);
                  onMarkUnread();
                }}
                type="button"
              >
                <MailOpen size={15} />
                <span>Mark unread</span>
              </button>
              <button
                onClick={() => {
                  setMoreOpen(false);
                  onShowOriginal();
                }}
                type="button"
              >
                <FileCode size={15} />
                <span>Show original source</span>
              </button>
              <button
                onClick={() => {
                  setMoreOpen(false);
                  onDownload();
                }}
                type="button"
              >
                <Download size={15} />
                <span>Download thread (.txt)</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <span className={styles.readerToolbarSpacer} />

      <span className={styles.readerToolbarCount}>{readerPositionLabel}</span>
      <button
        aria-label="Newer conversation"
        className={styles.readerIconButton}
        data-tooltip="Newer"
        disabled={!canOpenNewerThread}
        onClick={() => onOffsetChange(-1)}
        type="button"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        aria-label="Older conversation"
        className={styles.readerIconButton}
        data-tooltip="Older"
        disabled={!canOpenOlderThread}
        onClick={() => onOffsetChange(1)}
        type="button"
      >
        <ChevronRight size={18} />
      </button>
      <button
        aria-label="Keyboard shortcuts guide"
        className={`${styles.readerIconButton} ${styles.readerIconButtonWide}`}
        data-tooltip="Shortcuts"
        onClick={onOpenHelp}
        type="button"
      >
        <Keyboard size={18} />
        <ChevronDown size={13} />
      </button>
    </div>
  );
}
