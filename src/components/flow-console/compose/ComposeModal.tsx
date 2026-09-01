'use client';

import {
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { ComposeAttachmentStrip } from './ComposeAttachmentStrip';
import { ComposeFooter } from './ComposeFooter';
import { ComposeFormatToolbar } from './ComposeFormatToolbar';
import { ComposeHeader } from './ComposeHeader';
import { ComposeRecipients } from './ComposeRecipients';
import { ComposeSenderSelect } from './ComposeSenderSelect';
import type {
  ComposeAttachment,
  ComposeFields,
  FlowSender,
} from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export interface ComposeModalProps {
  attachmentInputRef: RefObject<HTMLInputElement | null>;
  composeAttachments: ComposeAttachment[];
  composeEditorRef: RefObject<HTMLDivElement | null>;
  composeExpanded: boolean;
  composeFields: ComposeFields;
  composeFormRef: RefObject<HTMLFormElement | null>;
  composeFrom: string;
  composeOpen: boolean;
  emojiPickerOpen: boolean;
  formatToolbarOpen: boolean;
  imageInputRef: RefObject<HTMLInputElement | null>;
  isSavingDraft: boolean;
  isSending: boolean;
  moreToolsOpen: boolean;
  onAddFiles: (files: File[], inline?: boolean) => Promise<void>;
  onAddRecipients: () => void;
  onClearFormatting: () => void;
  onDiscard: () => void;
  onEditorInput: () => void;
  onEditorPaste: (event: ClipboardEvent<HTMLDivElement>) => void;
  onInsertConfidential: () => void;
  onInsertDivider: () => void;
  onInsertDriveLink: () => void;
  onInsertEmoji: (emoji: string) => void;
  onInsertList: (ordered: boolean) => void;
  onInsertSignature: () => void;
  onInsertVariable: (name: string) => void;
  onOpenManageSenders: () => void;
  onPromptLink: () => void;
  onRecipientsKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onRemoveAllFormatting: () => void;
  onRemoveAttachment: (id: string) => void;
  onRemoveRecipient: (email: string) => void;
  onRunCommand: (command: string, value?: string) => void;
  onSaveDraftAndClose: () => void;
  onSelectSender: (sender: string) => void;
  onSendNow: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleEmojiPicker: () => void;
  onToggleExpand: () => void;
  onToggleFormatToolbar: () => void;
  onToggleMoreTools: () => void;
  onToggleSendOptions: () => void;
  onUpdateField: (
    field: keyof ComposeFields,
  ) => (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  recipientEmails: string[];
  sendOptionsOpen: boolean;
  senders?: FlowSender[];
}

export function ComposeModal({
  attachmentInputRef,
  composeAttachments,
  composeEditorRef,
  composeExpanded,
  composeFields,
  composeFormRef,
  composeFrom,
  composeOpen,
  emojiPickerOpen,
  formatToolbarOpen,
  imageInputRef,
  isSavingDraft,
  isSending,
  moreToolsOpen,
  onAddFiles,
  onAddRecipients,
  onClearFormatting,
  onDiscard,
  onEditorInput,
  onEditorPaste,
  onInsertConfidential,
  onInsertDivider,
  onInsertDriveLink,
  onInsertEmoji,
  onInsertList,
  onInsertSignature,
  onInsertVariable,
  onOpenManageSenders,
  onPromptLink,
  onRecipientsKeyDown,
  onRemoveAllFormatting,
  onRemoveAttachment,
  onRemoveRecipient,
  onRunCommand,
  onSaveDraftAndClose,
  onSelectSender,
  onSendNow,
  onSubmit,
  onToggleEmojiPicker,
  onToggleExpand,
  onToggleFormatToolbar,
  onToggleMoreTools,
  onToggleSendOptions,
  onUpdateField,
  recipientEmails,
  sendOptionsOpen,
  senders,
}: ComposeModalProps) {
  if (!composeOpen) return null;

  return (
    <div
      aria-label="Compose email"
      aria-modal="true"
      className={styles.composeOverlay}
      role="dialog"
    >
      <form
        className={
          composeExpanded
            ? `${styles.composeDialog} ${styles.composeDialogExpanded}`
            : styles.composeDialog
        }
        onSubmit={onSubmit}
        ref={composeFormRef}
      >
        <ComposeHeader
          isExpanded={composeExpanded}
          isSavingDraft={isSavingDraft}
          isSending={isSending}
          onSaveAndClose={onSaveDraftAndClose}
          onToggleExpand={onToggleExpand}
        />

        <ComposeSenderSelect
          composeFrom={composeFrom}
          isSending={isSending}
          onOpenManageSenders={onOpenManageSenders}
          onSelectSender={onSelectSender}
          senders={senders}
        />

        <ComposeRecipients
          isSending={isSending}
          onAddRecipients={onAddRecipients}
          onKeyDown={onRecipientsKeyDown}
          onRemoveRecipient={onRemoveRecipient}
          onToInputChange={onUpdateField('to')}
          recipientEmails={recipientEmails}
          toInput={composeFields.to}
        />

        <label className={styles.composeLine}>
          <span>Subject</span>
          <input
            aria-label="Subject line"
            disabled={isSending}
            onChange={onUpdateField('subject')}
            placeholder="Subject..."
            value={composeFields.subject}
          />
        </label>

        <div
          aria-label="Message body"
          className={styles.composeBody}
          contentEditable={!isSending}
          data-placeholder="Write your message here..."
          onInput={onEditorInput}
          onPaste={onEditorPaste}
          ref={composeEditorRef}
          role="textbox"
          suppressContentEditableWarning
        />

        <ComposeAttachmentStrip
          attachments={composeAttachments}
          isSending={isSending}
          onRemoveAttachment={onRemoveAttachment}
        />

        {formatToolbarOpen ? (
          <ComposeFormatToolbar
            isSending={isSending}
            onClearFormatting={onClearFormatting}
            onInsertList={onInsertList}
            onRunCommand={onRunCommand}
          />
        ) : null}

        <ComposeFooter
          emojiPickerOpen={emojiPickerOpen}
          formatToolbarOpen={formatToolbarOpen}
          isSending={isSending}
          moreToolsOpen={moreToolsOpen}
          onDiscard={onDiscard}
          onInsertConfidential={onInsertConfidential}
          onInsertDivider={onInsertDivider}
          onInsertDriveLink={onInsertDriveLink}
          onInsertEmoji={onInsertEmoji}
          onInsertSignature={onInsertSignature}
          onInsertVariable={onInsertVariable}
          onPromptLink={onPromptLink}
          onRemoveAllFormatting={onRemoveAllFormatting}
          onSaveDraftAndClose={onSaveDraftAndClose}
          onSendNow={onSendNow}
          onToggleEmojiPicker={onToggleEmojiPicker}
          onToggleFormatToolbar={onToggleFormatToolbar}
          onToggleMoreTools={onToggleMoreTools}
          onToggleSendOptions={onToggleSendOptions}
          onTriggerAttachment={() => attachmentInputRef.current?.click()}
          onTriggerImage={() => imageInputRef.current?.click()}
          sendOptionsOpen={sendOptionsOpen}
        />

        <input
          aria-hidden="true"
          className={styles.hiddenFileInput}
          multiple
          onChange={e => {
            const files = Array.from(e.target.files || []);
            e.target.value = '';
            void onAddFiles(files);
          }}
          ref={attachmentInputRef}
          type="file"
        />
        <input
          accept="image/*"
          aria-hidden="true"
          className={styles.hiddenFileInput}
          multiple
          onChange={e => {
            const files = Array.from(e.target.files || []);
            e.target.value = '';
            void onAddFiles(files, true);
          }}
          ref={imageInputRef}
          type="file"
        />
      </form>
    </div>
  );
}
