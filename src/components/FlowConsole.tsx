"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import addressparser from "addressparser";
import { FlowConsoleView } from "@/components/FlowConsoleView";
import { useCompose } from "@/hooks/useCompose";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useMailbox } from "@/hooks/useMailbox";
import { useThreadActions } from "@/hooks/useThreadActions";
import { apiUrl, flowHeaders } from "@/lib/api";
import { defaultConfig } from "@/lib/flow-console/constants";
import { responseJson } from "@/lib/flow-console/http";
import type {
  ContactPreview,
  FlowConfig,
  FlowConsoleProps,
  FlowSender,
  MailMessage,
  StatusMessage,
} from "@/lib/flow-console/types";

      export default function FlowConsole({
        accessSession,
        onLock,
      }: FlowConsoleProps) {
        const accountMenuRef = useRef<HTMLDivElement | null>(null);
        const [accountOpen, setAccountOpen] = useState(false);
        const [activeHeaderPanel, setActiveHeaderPanel] = useState<"settings" | null>(null);
        const [config, setConfig] = useState<FlowConfig>(defaultConfig);
        const [manageSendersOpen, setManageSendersOpen] = useState(false);
        const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
        const [focusedThreadId, setFocusedThreadId] = useState<string | null>(null);
        const [sidebarOpen, setSidebarOpen] = useState(true);
        const [status, setStatus] = useState<StatusMessage | null>(null);
        const [themeDensity, setThemeDensity] = useState<"comfortable" | "compact">("comfortable");

        const canWrite = accessSession.permission !== "read";

        const mailbox = useMailbox({
          onDraftDetected: (draft: MailMessage) => {
            compose.setDraftId(draft.id);
            compose.setComposeFields({
              body: draft.body,
              from: draft.from,
              subject: draft.subject === "(no subject)" ? "" : draft.subject,
              to: "",
            });
            compose.setRecipientEmails(draft.to);
            compose.setComposeOpen(true);
            window.requestAnimationFrame(() => {
              if (compose.composeEditorRef.current) {
                compose.composeEditorRef.current.setHtml?.(draft.body);
              }
            });
          },
          onStatusChange: setStatus,
        });

        const compose = useCompose({
          accessSession,
          config,
          onMailSentSuccess: () => {
            mailbox.setIsLoadingMessages(true);
            mailbox.setActiveFolder("sent");
            mailbox.setSelectedThreadId(null);
          },
          onStatusChange: setStatus,
        });

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

        useEffect(() => {
          const { inbox } = mailbox.unreadCounts;
          const unreadLabel = inbox === 0 ? "" : inbox > 99 ? "99+ · " : `${inbox} · `;
          document.title = `${unreadLabel}Flow Mail | Chefu Technologies`;
        }, [mailbox.unreadCounts.inbox]);

        useEffect(() => {
          let active = true;
          const controller = new AbortController();

          fetch(apiUrl("/flow/config"), {
            credentials: "include",
            headers: flowHeaders(),
            signal: controller.signal,
          })
            .then((response) => responseJson<FlowConfig>(response))
            .then((nextConfig) => {
              if (active) setConfig({ ...defaultConfig, ...nextConfig });
            })
            .catch((error) => {
              if (!active || controller.signal.aborted) return;
              setStatus({
                kind: "info",
                text: error instanceof Error ? error.message : "Flow config could not be loaded.",
              });
            });

          return () => {
            active = false;
            controller.abort();
          };
        }, []);

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
          document.addEventListener("pointerdown", closeOnOutside);
          return () => document.removeEventListener("pointerdown", closeOnOutside);
        }, [accountOpen]);

        const handleSenderAdded = useCallback(
          (newSender: FlowSender) => {
            setConfig((prev) => {
              const existing = prev.senders || [];
              const filtered = existing.filter(
                (sender) => sender.email.toLowerCase() !== newSender.email.toLowerCase(),
              );
              return { ...prev, senders: [newSender, ...filtered] };
            });
            compose.setComposeFields((prev) => ({ ...prev, from: newSender.email }));
          },
          [compose],
        );

        const handleSenderRemoved = useCallback((bareEmail: string) => {
          setConfig((prev) => {
            const targetEmail = bareEmail.trim().toLowerCase();
            const filtered = (prev.senders || []).filter((sender) => {
              let email = sender.email;
              try {
                const parsed = addressparser(sender.email);
                email = parsed.find((entry) => entry.address?.trim())?.address || email;
              } catch {
                // Fall back to the original sender value.
              }
              return email.trim().toLowerCase() !== targetEmail;
            });
            return { ...prev, senders: filtered };
          });
        }, []);

        const handleMessageKeyDown = useCallback(
          (event: KeyboardEvent<HTMLDivElement>, threadId: string) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            threadActions.openThread(threadId);
          },
          [threadActions],
        );

        const selectedThreadIndex = mailbox.visibleThreads.findIndex(
          (thread) => thread.id === mailbox.selectedThreadId,
        );
        const readerPositionLabel =
          selectedThreadIndex >= 0
            ? `${selectedThreadIndex + 1} of ${mailbox.visibleThreads.length}`
            : mailbox.visibleThreads.length
              ? `1 of ${mailbox.visibleThreads.length}`
              : "0 of 0";
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

        useKeyboardShortcuts({
          canWrite,
          focusedThreadId,
          isComposeOpen: compose.composeOpen,
          isShortcutsModalOpen: shortcutsModalOpen,
          onArchive: () => {
            if (mailbox.selectedThread || threadActions.selectedIds.length > 0) {
              threadActions.archiveThread();
            } else if (focusedThreadId) {
              threadActions.archiveThread(focusedThreadId);
            }
          },
          onCloseCompose: () => compose.saveDraftAndClose(),
          onCloseReader: () => mailbox.setSelectedThreadId(null),
          onDelete: () => {
            if (mailbox.selectedThread) threadActions.requestDeleteOpenThread();
            else if (threadActions.selectedIds.length > 0) threadActions.requestDeleteSelected();
          },
          onDeselectAll: () => threadActions.setSelectedIds([]),
          onFocusSearch: () => {
            const input = document.querySelector(
              'input[placeholder*="Search"]',
            ) as HTMLInputElement | null;
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
    onToggleSelect: (threadId: string) =>
      threadActions.toggleSelected(threadId),
    onToggleShortcutsModal: () => setShortcutsModalOpen((open) => !open),
    onToggleStar: (threadId: string) => {
      const thread = mailbox.visibleThreads.find((t) => t.id === threadId);
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
    <FlowConsoleView
      accessSession={accessSession}
      accountMenuRef={accountMenuRef}
      accountOpen={accountOpen}
      activeHeaderPanel={activeHeaderPanel}
      canOpenNewerThread={canOpenNewerThread}
      canOpenOlderThread={canOpenOlderThread}
      canWrite={canWrite}
      compose={compose}
      config={config}
      focusedThreadId={focusedThreadId}
      handleMessageKeyDown={handleMessageKeyDown}
      handleSenderAdded={handleSenderAdded}
      handleSenderRemoved={handleSenderRemoved}
      handleThreadOffsetChange={handleThreadOffsetChange}
      mailbox={mailbox}
      manageSendersOpen={manageSendersOpen}
      onLock={onLock}
      onSetAccountOpen={setAccountOpen}
      onSetActiveHeaderPanel={setActiveHeaderPanel}
      onSetManageSendersOpen={setManageSendersOpen}
      onSetShortcutsModalOpen={setShortcutsModalOpen}
      onSetSidebarOpen={setSidebarOpen}
      onSetStatus={setStatus}
      onSetThemeDensity={setThemeDensity}
      onShowContactToolStatus={(tool, contact) => {
        setStatus({
          kind: "info",
          text: `${tool} action for ${contact.name}`,
        });
      }}
      readerPositionLabel={readerPositionLabel}
      shortcutsModalOpen={shortcutsModalOpen}
      sidebarOpen={sidebarOpen}
      status={status}
      themeDensity={themeDensity}
      threadActions={threadActions}
    />
  );
}
