'use client';

import {
  AtSign,
  CaseSensitive,
  ChevronDown,
  EllipsisVertical,
  Image as ImageIcon,
  Link2,
  Loader2,
  LockKeyhole,
  Minus,
  Paperclip,
  PenLine,
  Send,
  Smile,
  Sparkles,
  Trash2,
  Triangle,
  Type,
} from 'lucide-react';
import { composeEmojis } from '@/lib/flow-console/constants';
import styles from '@/components/FlowConsole.module.css';

export interface ComposeFooterProps {
  emojiPickerOpen: boolean;
  formatToolbarOpen: boolean;
  isSending: boolean;
  moreToolsOpen: boolean;
  onDiscard: () => void;
  onInsertConfidential: () => void;
  onInsertDivider: () => void;
  onInsertDriveLink: () => void;
  onInsertEmoji: (emoji: string) => void;
  onInsertSignature: () => void;
  onInsertVariable: (name: string) => void;
  onPromptLink: () => void;
  onRemoveAllFormatting: () => void;
  onSaveDraftAndClose: () => void;
  onSendNow: () => void;
  onToggleEmojiPicker: () => void;
  onToggleFormatToolbar: () => void;
  onToggleMoreTools: () => void;
  onToggleSendOptions: () => void;
  onTriggerAttachment: () => void;
  onTriggerImage: () => void;
  sendOptionsOpen: boolean;
}

export function ComposeFooter({
  emojiPickerOpen,
  formatToolbarOpen,
  isSending,
  moreToolsOpen,
  onDiscard,
  onInsertConfidential,
  onInsertDivider,
  onInsertDriveLink,
  onInsertEmoji,
  onInsertSignature,
  onInsertVariable,
  onPromptLink,
  onRemoveAllFormatting,
  onSaveDraftAndClose,
  onSendNow,
  onToggleEmojiPicker,
  onToggleFormatToolbar,
  onToggleMoreTools,
  onToggleSendOptions,
  onTriggerAttachment,
  onTriggerImage,
  sendOptionsOpen,
}: ComposeFooterProps) {
  return (
    <div className={styles.composeFooter}>
      <div className={styles.composeFooterLeft}>
        <div className={styles.sendSplitWrap}>
          <div className={styles.sendSplit}>
            <button
              className={styles.sendButton}
              disabled={isSending}
              type="submit"
            >
              {isSending ? (
                <>
                  <Loader2 className={styles.spin} size={15} />
                  <span>Sending</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <Send size={14} />
                </>
              )}
            </button>
            <button
              aria-expanded={sendOptionsOpen}
              aria-label="More send options"
              className={styles.sendOptionsButton}
              data-tooltip="Send options"
              disabled={isSending}
              onClick={onToggleSendOptions}
              type="button"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {sendOptionsOpen ? (
            <div
              aria-label="Send options menu"
              className={styles.composeMenu}
              role="menu"
            >
              <button onClick={onSendNow} type="button">
                Send now
              </button>
              <button onClick={onSaveDraftAndClose} type="button">
                Save draft and close
              </button>
            </div>
          ) : null}
        </div>

        <button
          aria-expanded={formatToolbarOpen}
          aria-label="Toggle formatting toolbar"
          className={
            formatToolbarOpen
              ? `${styles.footerToolButton} ${styles.footerToolActive}`
              : styles.footerToolButton
          }
          data-tooltip="Formatting options"
          disabled={isSending}
          onClick={onToggleFormatToolbar}
          type="button"
        >
          <CaseSensitive size={19} />
        </button>

        <button
          aria-label="Attach files"
          className={styles.footerToolButton}
          data-tooltip="Attach files"
          disabled={isSending}
          onClick={onTriggerAttachment}
          type="button"
        >
          <Paperclip size={19} />
        </button>

        <button
          aria-label="Insert hyperlink"
          className={styles.footerToolButton}
          data-tooltip="Insert link"
          disabled={isSending}
          onClick={onPromptLink}
          type="button"
        >
          <Link2 size={19} />
        </button>

        <div className={styles.footerMenuWrap}>
          <button
            aria-expanded={emojiPickerOpen}
            aria-label="Insert emoji symbol"
            className={styles.footerToolButton}
            data-tooltip="Insert emoji"
            disabled={isSending}
            onClick={onToggleEmojiPicker}
            type="button"
          >
            <Smile size={19} />
          </button>
          {emojiPickerOpen ? (
            <div
              aria-label="Emoji picker"
              className={styles.emojiMenu}
              role="menu"
            >
              {composeEmojis.map(emoji => (
                <button
                  aria-label={`Insert ${emoji}`}
                  key={emoji}
                  onClick={() => onInsertEmoji(emoji)}
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          aria-label="Insert Google Drive file link"
          className={styles.footerToolButton}
          data-tooltip="Insert Drive link"
          disabled={isSending}
          onClick={onInsertDriveLink}
          type="button"
        >
          <Triangle size={18} />
        </button>

        <button
          aria-label="Insert photo image"
          className={styles.footerToolButton}
          data-tooltip="Insert photo"
          disabled={isSending}
          onClick={onTriggerImage}
          type="button"
        >
          <ImageIcon size={19} />
        </button>

        <button
          aria-label="Confidential mode notice"
          className={styles.footerToolButton}
          data-tooltip="Confidential mode"
          disabled={isSending}
          onClick={onInsertConfidential}
          type="button"
        >
          <LockKeyhole size={18} />
        </button>

        <button
          aria-label="Insert signature"
          className={styles.footerToolButton}
          data-tooltip="Insert signature"
          disabled={isSending}
          onClick={onInsertSignature}
          type="button"
        >
          <PenLine size={18} />
        </button>

        <div className={styles.footerMenuWrap}>
          <button
            aria-expanded={moreToolsOpen}
            aria-label="More composer options"
            className={styles.footerToolButton}
            data-tooltip="More options"
            disabled={isSending}
            onClick={onToggleMoreTools}
            type="button"
          >
            <EllipsisVertical size={18} />
          </button>
          {moreToolsOpen ? (
            <div
              aria-label="More options menu"
              className={styles.composeMenu}
              role="menu"
            >
              <button
                onClick={() => onInsertVariable('firstName')}
                type="button"
              >
                <AtSign size={15} />
                <span>Insert recipient first name</span>
              </button>
              <button
                onClick={() => onInsertVariable('company')}
                type="button"
              >
                <Sparkles size={15} />
                <span>Insert company tag</span>
              </button>
              <button onClick={onInsertDivider} type="button">
                <Minus size={15} />
                <span>Insert divider line</span>
              </button>
              <button onClick={onRemoveAllFormatting} type="button">
                <Type size={15} />
                <span>Convert to plain text</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <button
        aria-label="Discard draft"
        className={styles.composeIconButton}
        data-tooltip="Discard draft"
        disabled={isSending}
        onClick={onDiscard}
        type="button"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
