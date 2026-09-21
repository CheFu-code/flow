"use client";

import type { RefObject } from "react";
import { ComposeModal } from "@/components/flow-console/compose/ComposeModal";
import { FlowHeader } from "@/components/flow-console/header/FlowHeader";
import { MailboxList } from "@/components/flow-console/mailbox/MailboxList";
import { DeleteConfirmDialog } from "@/components/flow-console/modals/DeleteConfirmDialog";
import { KeyboardShortcutsModal } from "@/components/flow-console/modals/KeyboardShortcutsModal";
import { ManageSendersModal } from "@/components/flow-console/modals/ManageSendersModal";
import { ReaderView } from "@/components/flow-console/reader/ReaderView";
import { OfflineBanner } from "@/components/flow-console/shared/OfflineBanner";
import { StatusToast } from "@/components/flow-console/shared/StatusToast";
import { UndoSendToast } from "@/components/flow-console/shared/UndoSendToast";
import { FlowSidebar } from "@/components/flow-console/sidebar/FlowSidebar";
import { useCompose } from "@/hooks/useCompose";
import { useMailbox } from "@/hooks/useMailbox";
import { useThreadActions } from "@/hooks/useThreadActions";
import { emptyStates } from "@/lib/flow-console/constants";
import { getFolderLabel } from "@/lib/flow-console/format";
import type {
  ContactPreview,
  FlowConfig,
  FlowConsoleProps,
  FlowSender,
  StatusMessage,
} from "@/lib/flow-console/types";
import styles from "./FlowConsole.module.css";

export interface FlowConsoleViewProps extends FlowConsoleProps {
  accountMenuRef: RefObject<HTMLDivElement | null>;
  accountOpen: boolean;
  activeHeaderPanel: "settings" | null;
  canOpenNewerThread: boolean;
  canOpenOlderThread: boolean;
  canWrite: boolean;
  config: FlowConfig;
  compose: ReturnType<typeof useCompose>;
  focusedThreadId: string | null;
  handleMessageKeyDown: (
    event: React.KeyboardEvent<HTMLDivElement>,
    threadId: string,
  ) => void;
  handleSenderAdded: (sender: FlowSender) => void;
  handleSenderRemoved: (email: string) => void;
  handleThreadOffsetChange: (offset: number) => void;
  mailbox: ReturnType<typeof useMailbox>;
  manageSendersOpen: boolean;
  onShowContactToolStatus: (tool: string, contact: ContactPreview) => void;
  shortcutsModalOpen: boolean;
  sidebarOpen: boolean;
  status: StatusMessage | null;
  themeDensity: "comfortable" | "compact";
  threadActions: ReturnType<typeof useThreadActions>;
  onSetAccountOpen: (open: boolean) => void;
  onSetActiveHeaderPanel: (panel: "settings" | null) => void;
  onSetManageSendersOpen: (open: boolean) => void;
  onSetShortcutsModalOpen: (open: boolean) => void;
  onSetSidebarOpen: (open: boolean) => void;
  onSetStatus: (status: StatusMessage | null) => void;
  onSetThemeDensity: (density: "comfortable" | "compact") => void;
  readerPositionLabel: string;
}

export function FlowConsoleView({
  accessSession,
  onLock,
  accountMenuRef,
  accountOpen,
  activeHeaderPanel,
  canOpenNewerThread,
  canOpenOlderThread,
  canWrite,
  config,
  compose,
  focusedThreadId,
  handleMessageKeyDown,
  handleSenderAdded,
  handleSenderRemoved,
  handleThreadOffsetChange,
  mailbox,
  manageSendersOpen,
  onShowContactToolStatus,
  shortcutsModalOpen,
  sidebarOpen,
  status,
  themeDensity,
  threadActions,
  onSetAccountOpen,
  onSetActiveHeaderPanel,
  onSetManageSendersOpen,
  onSetShortcutsModalOpen,
  onSetSidebarOpen,
  onSetStatus,
  onSetThemeDensity,
  readerPositionLabel,
}: FlowConsoleViewProps) {
  return (
    <main
      className={`${styles.mailShell} ${
        themeDensity === "compact" ? styles.compactDensity : ""
      }`}
    >
      <FlowHeader
        accessSession={accessSession}
        accountMenuRef={accountMenuRef}
        accountOpen={accountOpen}
        activePanel={activeHeaderPanel}
        connectionStatus={mailbox.connectionStatus}
        onLock={onLock}
        onOpenManageSenders={() => {
          onSetActiveHeaderPanel(null);
          onSetManageSendersOpen(true);
        }}
        onOpenShortcutsModal={() => onSetShortcutsModalOpen(true)}
        onQueryChange={mailbox.setQuery}
        onReconnect={mailbox.reconnect}
        onSetDensity={onSetThemeDensity}
        onToggleAccount={() => onSetAccountOpen(!accountOpen)}
        onToggleFormatToolbar={() =>
          compose.setFormatToolbarOpen((open) => !open)
        }
        onTogglePanel={(panel) =>
          onSetActiveHeaderPanel(
            activeHeaderPanel === panel ? null : panel,
          )
        }
        onToggleSidebar={() => onSetSidebarOpen(!sidebarOpen)}
        query={mailbox.query}
        sidebarOpen={sidebarOpen}
      />

      <OfflineBanner
        isOffline={mailbox.connectionStatus === "offline"}
        onReconnect={mailbox.reconnect}
      />

      <section
        className={
          sidebarOpen
            ? `${styles.workspace} ${styles.workspaceWithSidebar}`
            : styles.workspace
        }
      >
        {sidebarOpen ? (
          <FlowSidebar
            activeFolder={mailbox.activeFolder}
            canWrite={canWrite}
            folderCounts={mailbox.folderCounts}
            onCompose={() => compose.setComposeOpen(true)}
            onFolderChange={mailbox.changeFolder}
            unreadCounts={mailbox.unreadCounts}
          />
        ) : null}

        <section className={styles.contentPane}>
          {mailbox.selectedThread ? (
            <ReaderView
              canOpenNewerThread={canOpenNewerThread}
              canOpenOlderThread={canOpenOlderThread}
              onAddReaction={threadActions.addReaction}
              onArchive={threadActions.archiveThread}
              onBack={() => mailbox.setSelectedThreadId(null)}
              onCopyLink={threadActions.copyMessageLink}
              onDelete={threadActions.requestDeleteOpenThread}
              onDownload={threadActions.downloadThread}
              onMarkUnread={threadActions.markThreadUnread}
              onMoveTo={threadActions.moveThreadTo}
              onOffsetChange={handleThreadOffsetChange}
              onOpenComposeToContact={compose.openComposeToContact}
              onOpenNewWindow={() => threadActions.openThreadDocument(false)}
              onPrint={() => threadActions.openThreadDocument(true)}
              onReply={threadActions.replyToMessage}
              onReport={threadActions.reportThread}
              onShowContactToolStatus={onShowContactToolStatus}
              onShowOriginal={threadActions.showOriginalSource}
              onToggleStarred={threadActions.toggleStarred}
              readerPositionLabel={readerPositionLabel}
              selectedThread={mailbox.selectedThread}
            />
          ) : (
            <MailboxList
              activeEmptyState={emptyStates[mailbox.activeFolder]}
              activeFolder={mailbox.activeFolder}
              allThreadsCount={mailbox.allThreads.length}
              allVisibleSelected={threadActions.allVisibleSelected}
              currentPage={mailbox.currentPage}
              debouncedQuery={mailbox.debouncedQuery}
              focusedThreadId={focusedThreadId}
              hasSelection={threadActions.selectedIds.length > 0}
              isLoadingMessages={mailbox.isLoadingMessages}
              isLoadingMore={mailbox.isLoadingMore}
              onDeleteSelected={threadActions.requestDeleteSelected}
              onKeyDown={handleMessageKeyDown}
              onLoadMore={() => void mailbox.loadNextPage()}
              onNextPage={mailbox.goToNextPage}
              onOpenCompose={compose.openComposeToContact}
              onPrevPage={mailbox.goToPrevPage}
              onScroll={mailbox.setListScrollTop}
              onSelect={threadActions.openThread}
              onSelectAll={threadActions.toggleAllSelected}
              onShowStatus={onShowContactToolStatus}
              onToggleSelect={threadActions.toggleSelected}
              onToggleStarred={threadActions.toggleStarred}
              pageEnd={mailbox.pageEnd}
              pageStart={mailbox.pageStart}
              paginationMode={mailbox.paginationMode}
              query={mailbox.query}
              renderedThreads={mailbox.renderedThreads}
              selectedFolderTitle={getFolderLabel(mailbox.activeFolder)}
              selectedIdSet={threadActions.selectedIdSet}
              totalPages={mailbox.totalPages}
              totalThreads={mailbox.visibleThreads.length}
              virtualEnd={mailbox.virtualEnd}
              virtualStart={mailbox.virtualStart}
            />
          )}
        </section>
      </section>

      {threadActions.deleteConfirm ? (
        <DeleteConfirmDialog
          confirm={threadActions.deleteConfirm}
          isDeleting={threadActions.isDeleting}
          onCancel={() => threadActions.setDeleteConfirm(null)}
          onConfirm={threadActions.confirmDelete}
        />
      ) : null}

      <ComposeModal
        attachmentInputRef={compose.attachmentInputRef}
        composeAttachments={compose.composeAttachments}
        composeEditorRef={compose.composeEditorRef}
        composeExpanded={compose.composeExpanded}
        composeFields={compose.composeFields}
        composeFormRef={compose.composeFormRef}
        composeFrom={compose.composeFrom}
        composeOpen={compose.composeOpen}
        draftSaveState={compose.draftSaveState}
        emojiPickerOpen={compose.emojiPickerOpen}
        formatToolbarOpen={compose.formatToolbarOpen}
        imageInputRef={compose.imageInputRef}
        isSavingDraft={compose.isSavingDraft}
        isSending={compose.isSending}
        moreToolsOpen={compose.moreToolsOpen}
        onAddFiles={compose.addFilesToCompose}
        onAddRecipients={compose.addRecipients}
        onClearFormatting={compose.clearEditorFormatting}
        onDiscard={compose.discardCompose}
        onEditorInput={compose.syncComposeBody}
        onEditorPaste={compose.handleEditorPaste}
        onInsertConfidential={compose.insertConfidentialNotice}
        onInsertDivider={compose.insertDivider}
        onInsertDriveLink={compose.insertDriveLink}
        onInsertEmoji={compose.insertEditorText}
        onInsertList={compose.insertEditorList}
        onInsertSignature={compose.insertSignature}
        onInsertVariable={compose.insertVariable}
        onOpenManageSenders={() => onSetManageSendersOpen(true)}
        onPromptLink={compose.promptForLink}
        onRecipientsKeyDown={compose.addRecipientsFromKeyboard}
        onRemoveAllFormatting={compose.removeAllFormatting}
        onRemoveAttachment={compose.removeAttachment}
        onRemoveRecipient={compose.removeRecipient}
        onRunCommand={compose.runEditorCommand}
        onSaveDraftAndClose={compose.saveDraftAndClose}
        onSelectSender={(sender) =>
          compose.setComposeFields((prev) => ({ ...prev, from: sender }))
        }
        onSendNow={() => compose.composeFormRef.current?.requestSubmit()}
        onSubmit={compose.submitCompose}
        onToggleEmojiPicker={() => compose.setEmojiPickerOpen((open) => !open)}
        onToggleExpand={() =>
          compose.setComposeExpanded((expanded) => !expanded)
        }
        onToggleFormatToolbar={() =>
          compose.setFormatToolbarOpen((open) => !open)
        }
        onToggleMoreTools={() => compose.setMoreToolsOpen((open) => !open)}
        onToggleSendOptions={() => compose.setSendOptionsOpen((open) => !open)}
        onUpdateField={compose.updateComposeField}
        recipientEmails={compose.recipientEmails}
        sendOptionsOpen={compose.sendOptionsOpen}
        senders={config.senders}
      />

      <ManageSendersModal
        isOpen={manageSendersOpen}
        onClose={() => onSetManageSendersOpen(false)}
        onSenderAdded={handleSenderAdded}
        onSenderRemoved={handleSenderRemoved}
        onSelectSender={(email) =>
          compose.setComposeFields((prev) => ({ ...prev, from: email }))
        }
        senders={config.senders || []}
      />

      <UndoSendToast
        isOpen={Boolean(compose.undoSendState)}
        onSendNow={compose.sendImmediately}
        onUndo={compose.undoSend}
        recipientCount={compose.undoSendState?.recipients.length || 1}
      />

      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => onSetShortcutsModalOpen(false)}
      />

      <StatusToast onDismiss={() => onSetStatus(null)} status={status} />
    </main>
  );
}
