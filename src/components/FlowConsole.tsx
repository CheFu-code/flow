'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ComposeModal } from '@/components/flow-console/compose/ComposeModal';
import { FlowHeader } from '@/components/flow-console/header/FlowHeader';
import { MailboxList } from '@/components/flow-console/mailbox/MailboxList';
import { DeleteConfirmDialog } from '@/components/flow-console/modals/DeleteConfirmDialog';
import { ManageSendersModal } from '@/components/flow-console/modals/ManageSendersModal';
import { ReaderView } from '@/components/flow-console/reader/ReaderView';
import { StatusToast } from '@/components/flow-console/shared/StatusToast';
import { FlowSidebar } from '@/components/flow-console/sidebar/FlowSidebar';
import { useCompose } from '@/hooks/useCompose';
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
  const [activeHeaderPanel, setActiveHeaderPanel] = useState<'apps' | 'help' | 'settings' | null>(null);
  const [config, setConfig] = useState<FlowConfig>(defaultConfig);
  const [manageSendersOpen, setManageSendersOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [themeDensity, setThemeDensity] = useState<'comfortable' | 'compact'>('comfortable');

  const canWrite = accessSession.permission !== 'read';

  // 1. Mailbox Hook
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

  // 2. Compose Hook
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
        onNavigateFolder={mailbox.changeFolder}
        onOpenAccount={() => setAccountOpen(true)}
        onOpenCompose={() => compose.setComposeOpen(true)}
        onOpenManageSenders={() => {
          setActiveHeaderPanel(null);
          setManageSendersOpen(true);
        }}
        onQueryChange={mailbox.setQuery}
        onResetSearch={() => mailbox.setQuery('')}
        onSetDensity={setThemeDensity}
        onShowSidebar={() => setSidebarOpen(true)}
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
              onOpenHelp={() => setActiveHeaderPanel('help')}
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
              debouncedQuery={mailbox.debouncedQuery}
              hasSelection={threadActions.selectedIds.length > 0}
              isLoadingMessages={mailbox.isLoadingMessages}
              isLoadingMore={mailbox.isLoadingMore}
              onDeleteSelected={threadActions.requestDeleteSelected}
              onKeyDown={handleMessageKeyDown}
              onLoadMore={() => void mailbox.loadNextPage()}
              onOpenCompose={compose.openComposeToContact}
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
              query={mailbox.query}
              renderedThreads={mailbox.renderedThreads}
              selectedFolderTitle={getFolderLabel(mailbox.activeFolder)}
              selectedIdSet={threadActions.selectedIdSet}
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

      <StatusToast onDismiss={() => setStatus(null)} status={status} />
    </main>
  );
}
