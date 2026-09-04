'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ComposeModal } from '@/components/flow-console/compose/ComposeModal';
import { FlowHeader } from '@/components/flow-console/header/FlowHeader';
import { MailboxList } from '@/components/flow-console/mailbox/MailboxList';
import { DeleteConfirmDialog } from '@/components/flow-console/modals/DeleteConfirmDialog';
import { KeyboardShortcutsModal } from '@/components/flow-console/modals/KeyboardShortcutsModal';
import { ManageSendersModal } from '@/components/flow-console/modals/ManageSendersModal';
import { ReaderView } from '@/components/flow-console/reader/ReaderView';
import { OfflineBanner } from '@/components/flow-console/shared/OfflineBanner';
import { StatusToast } from '@/components/flow-console/shared/StatusToast';
import { UndoSendToast } from '@/components/flow-console/shared/UndoSendToast';
import { FlowSidebar } from '@/components/flow-console/sidebar/FlowSidebar';
import { useCompose } from '@/hooks/useCompose';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMailbox } from '@/hooks/useMailbox';
import { useThreadActions } from '@/hooks/useThreadActions';
import { apiUrl, flowHeaders } from '@/lib/api';
import { defaultConfig, emptyStates } from '@/lib/flow-console/constants';
import { getFolderLabel } from '@/lib/flow-console/format';
import { responseJson } from '@/lib/flow-console/http';
import type {
  ContactPreview,
  FlowConfig,
  FlowConsoleProps,
  FlowSender,
  MailMessage,
  StatusMessage,
} from '@/lib/flow-console/types';
import styles from './FlowConsole.module.css';

export default function FlowConsole({ accessSession, onLock }: FlowConsoleProps) {
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeHeaderPanel, setActiveHeaderPanel] = useState<'settings' | null>(null);
  const [config, setConfig] = useState<FlowConfig>(defaultConfig);
  const [manageSendersOpen, setManageSendersOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [focusedThreadId, setFocusedThreadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [themeDensity, setThemeDensity] = useState<'comfortable' | 'compact'>('comfortable');

  const canWrite = accessSession.permission !== 'read';

  // 1. Mailbox Hook (with unread counts, pagination, and offline/reconnect)
  const mailbox = useMailbox({
    onDraftDetected: (draft: MailMessage) => {
      compose.setDraftId(draft.id);
      compose.setComposeFields({
        body: draft.body,
        from: draft.from,
        subject: draft.subject === '(no subject)' ? '' : draft.subject,
        to: '',
      });
      compose.setRecipientEmails(draft.to);
      compose.setComposeOpen(true);
      window.requestAnimationFrame(() => {
        if (compose.composeEditorRef.current) {
          compose.composeEditorRef.current.innerHTML = draft.body;
        }
      });
    },
    onStatusChange: setStatus,
  });

  // 2. Compose Hook (with draft auto-save interval and undo send)
  const compose = useCompose({
    accessSession,
    config,
    onMailSentSuccess: () => {
      mailbox.setIsLoadingMessages(true);
      mailbox.setActiveFolder('sent');
      mailbox.setSelectedThreadId(null);
    },
    onStatusChange: setStatus,
  });

  // 3. Thread Actions Hook
  const threadActions = useThreadActions({
    accessSession,
    activeFolder: mailbox.activeFolder,
    messages: mailbox.messages,
    onOpenComposeReply: (contact: ContactPreview, subject: string) => {
      compose.openComposeToContact(contact, subject);
    },
    onStatusChange: setStatus,
    selectedThread: mailbox.selectedThread,
    setMessages: mailbox.setMessages,
    setSelectedThreadId: mailbox.setSelectedThreadId,
    visibleThreads: mailbox.visibleThreads,
  });

  // Dynamic Browser Tab Document Title Unread Count Badge
  useEffect(() => {
    const unread = mailbox.unreadCounts.inbox;
    if (unread > 0) {
      document.title = `(${unread}) Flow Mail`;
    } else {
      document.title = 'Flow Mail';
    }
  }, [mailbox.unreadCounts.inbox]);

  // Load backend configuration
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    fetch(apiUrl('/flow/config'), {
      credentials: 'include',
      headers: flowHeaders(),
      signal: controller.signal,
    })
      .then(response => responseJson<FlowConfig>(response))
      .then(nextConfig => {
        if (active) setConfig({ ...defaultConfig, ...nextConfig });
      })
      .catch(error => {
        if (!active || controller.signal.aborted) return;
        setStatus({
          kind: 'info',
          text: error instanceof Error ? error.message : 'Flow config could not be loaded.',
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  // Close account menu on outside clicks
  useEffect(() => {
    if (!accountOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !accountMenuRef.current?.contains(event.target)
      ) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [accountOpen]);

  // Sender handlers
  const handleSenderAdded = useCallback((newSender: FlowSender) => {
    setConfig(prev => {
      const existing = prev.senders || [];
      const filtered = existing.filter(
        s => s.email.toLowerCase() !== newSender.email.toLowerCase(),
      );
      return { ...prev, senders: [newSender, ...filtered] };
    });
    compose.setComposeFields(prev => ({ ...prev, from: newSender.email }));
  }, [compose]);

  const handleSenderRemoved = useCallback((bareEmail: string) => {
    setConfig(prev => {
      const filtered = (prev.senders || []).filter(s => {
        const match = s.email.match(/<([^>]+)>/);
        const email = (match?.[1] || s.email).trim().toLowerCase();
        return email !== bareEmail.toLowerCase();
      });
      return { ...prev, senders: filtered };
    });
  }, []);

  // Keyboard navigation for opening threads
  const handleMessageKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, threadId: string) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      threadActions.openThread(threadId);
    },
    [threadActions],
  );

  // Reader position calculation
  const selectedThreadIndex = mailbox.visibleThreads.findIndex(
    thread => thread.id === mailbox.selectedThreadId,
  );
  const readerPositionLabel =
    selectedThreadIndex >= 0
      ? `${selectedThreadIndex + 1} of ${mailbox.visibleThreads.length}`
      : mailbox.visibleThreads.length
        ? `1 of ${mailbox.visibleThreads.length}`
        : '0 of 0';

  const canOpenNewerThread = selectedThreadIndex > 0;
  const canOpenOlderThread =
    selectedThreadIndex >= 0 &&
    selectedThreadIndex < mailbox.visibleThreads.length - 1;

  const handleThreadOffsetChange = useCallback(
    (offset: number) => {
      if (selectedThreadIndex < 0) return;
      const target = mailbox.visibleThreads[selectedThreadIndex + offset];
      if (target) threadActions.openThread(target.id);
    },
    [mailbox.visibleThreads, selectedThreadIndex, threadActions],
  );

  // Keyboard Shortcuts Hook
  useKeyboardShortcuts({
    canWrite,
    focusedThreadId,
    isComposeOpen: compose.composeOpen,
    isShortcutsModalOpen: shortcutsModalOpen,
    onArchive: () => {
      if (mailbox.selectedThread) {
        threadActions.archiveThread();
      } else if (threadActions.selectedIds.length > 0) {
        threadActions.archiveThread();
      } else if (focusedThreadId) {
        threadActions.openThread(focusedThreadId);
        window.setTimeout(() => threadActions.archiveThread(), 50);
      }
    },
    onCloseCompose: () => compose.saveDraftAndClose(),
    onCloseReader: () => mailbox.setSelectedThreadId(null),
    onDelete: () => {
      if (mailbox.selectedThread) {
        threadActions.requestDeleteOpenThread();
      } else if (threadActions.selectedIds.length > 0) {
        threadActions.requestDeleteSelected();
      }
    },
    onDeselectAll: () => threadActions.setSelectedIds([]),
    onFocusSearch: () => {
      const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement | null;
      input?.focus();
    },
    onMarkRead: () => {
      if (mailbox.selectedThread) {
        // Already marked read on open
      }
    },
    onMarkUnread: () => {
      if (mailbox.selectedThread) {
        threadActions.markThreadUnread();
      }
    },
    onNextThread: () => handleThreadOffsetChange(1),
    onOpenCompose: () => compose.setComposeOpen(true),
    onOpenThread: (threadId: string) => threadActions.openThread(threadId),
    onPrevThread: () => handleThreadOffsetChange(-1),
    onReply: () => {
      if (mailbox.selectedThread) {
        threadActions.replyToMessage(mailbox.selectedThread.latest);
      }
    },
    onReplyAll: () => {
      if (mailbox.selectedThread) {
        threadActions.replyToMessage(mailbox.selectedThread.latest);
      }
    },
    onSaveDraft: () => void compose.saveDraftNow(),
    onSelectAll: () => {
      threadActions.toggleAllSelected({
        target: { checked: true },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    },
    onSelectFolder: (folder) => mailbox.changeFolder(folder),
    onSendCompose: () => compose.composeFormRef.current?.requestSubmit(),
    onToggleSelect: (threadId: string) => threadActions.toggleSelected(threadId),
    onToggleShortcutsModal: () => setShortcutsModalOpen(open => !open),
    onToggleStar: (threadId: string) => {
      const thread = mailbox.visibleThreads.find(t => t.id === threadId);
      if (thread) {
        threadActions.toggleStarred(
          { stopPropagation: () => {} } as unknown as React.MouseEvent,
          thread.latest.id,
        );
      }
    },
    selectedThreadId: mailbox.selectedThreadId,
    setFocusedThreadId,
    threads: mailbox.visibleThreads,
  });

  return (
    <main
      className={`${styles.mailShell} ${
        themeDensity === 'compact' ? styles.compactDensity : ''
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
          setActiveHeaderPanel(null);
          setManageSendersOpen(true);
        }}
        onOpenShortcutsModal={() => setShortcutsModalOpen(true)}
        onQueryChange={mailbox.setQuery}
        onReconnect={mailbox.reconnect}
        onSetDensity={setThemeDensity}
        onToggleAccount={() => setAccountOpen(open => !open)}
        onToggleFormatToolbar={() =>
          compose.setFormatToolbarOpen(open => !open)
        }
        onTogglePanel={panel =>
          setActiveHeaderPanel(current => (current === panel ? null : panel))
        }
        onToggleSidebar={() => setSidebarOpen(open => !open)}
        query={mailbox.query}
        sidebarOpen={sidebarOpen}
      />

      {/* Offline Alert Banner */}
      <OfflineBanner
        isOffline={mailbox.connectionStatus === 'offline'}
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
              onShowContactToolStatus={(tool, contact) => {
                setStatus({
                  kind: 'info',
                  text: `${tool} action for ${contact.name}`,
                });
              }}
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
              onShowStatus={(tool, contact) => {
                setStatus({
                  kind: 'info',
                  text: `${tool} action for ${contact.name}`,
                });
              }}
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
        onOpenManageSenders={() => setManageSendersOpen(true)}
        onPromptLink={compose.promptForLink}
        onRecipientsKeyDown={compose.addRecipientsFromKeyboard}
        onRemoveAllFormatting={compose.removeAllFormatting}
        onRemoveAttachment={compose.removeAttachment}
        onRemoveRecipient={compose.removeRecipient}
        onRunCommand={compose.runEditorCommand}
        onSaveDraftAndClose={compose.saveDraftAndClose}
        onSelectSender={sender =>
          compose.setComposeFields(prev => ({ ...prev, from: sender }))
        }
        onSendNow={() => compose.composeFormRef.current?.requestSubmit()}
        onSubmit={compose.submitCompose}
        onToggleEmojiPicker={() =>
          compose.setEmojiPickerOpen(open => !open)
        }
        onToggleExpand={() =>
          compose.setComposeExpanded(expanded => !expanded)
        }
        onToggleFormatToolbar={() =>
          compose.setFormatToolbarOpen(open => !open)
        }
        onToggleMoreTools={() =>
          compose.setMoreToolsOpen(open => !open)
        }
        onToggleSendOptions={() =>
          compose.setSendOptionsOpen(open => !open)
        }
        onUpdateField={compose.updateComposeField}
        recipientEmails={compose.recipientEmails}
        sendOptionsOpen={compose.sendOptionsOpen}
        senders={config.senders}
      />

      <ManageSendersModal
        isOpen={manageSendersOpen}
        onClose={() => setManageSendersOpen(false)}
        onSenderAdded={handleSenderAdded}
        onSenderRemoved={handleSenderRemoved}
        onSelectSender={email => {
          compose.setComposeFields(prev => ({ ...prev, from: email }));
        }}
        senders={config.senders || []}
      />

      {/* Undo Send Toast with Animated Countdown */}
      <UndoSendToast
        isOpen={Boolean(compose.undoSendState)}
        onSendNow={compose.sendImmediately}
        onUndo={compose.undoSend}
        recipientCount={compose.undoSendState?.recipients.length || 1}
      />

      {/* Keyboard Shortcuts Cheat-sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      <StatusToast onDismiss={() => setStatus(null)} status={status} />
    </main>
  );
}
