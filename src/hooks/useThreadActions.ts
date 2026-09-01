'use client';

import { useCallback, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { apiUrl, flowHeaders } from '@/lib/api';
import { formatMessageDate } from '@/lib/flow-console/format';
import { responseJson } from '@/lib/flow-console/http';
import { contactFromMessage, threadDeleteCopy } from '@/lib/flow-console/mail';
import { renderReaderPrintDocument } from '@/lib/flow-console/reader';
import type {
  AccessSession,
  ContactPreview,
  DeleteConfirm,
  MailFolder,
  MailMessage,
  MailThread,
  MessageFolder,
  StatusMessage,
} from '@/lib/flow-console/types';

export interface UseThreadActionsOptions {
  activeFolder: MailFolder;
  accessSession: AccessSession;
  messages: MailMessage[];
  setMessages: React.Dispatch<React.SetStateAction<MailMessage[]>>;
  visibleThreads: MailThread[];
  selectedThread: MailThread | null;
  setSelectedThreadId: (id: string | null) => void;
  onStatusChange: (status: StatusMessage | null) => void;
  onOpenComposeReply?: (contact: ContactPreview, subject: string) => void;
}

export function useThreadActions({
  activeFolder,
  accessSession,
  messages,
  setMessages,
  visibleThreads,
  selectedThread,
  setSelectedThreadId,
  onStatusChange,
  onOpenComposeReply,
}: UseThreadActionsOptions) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteLockRef = useRef(false);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const allVisibleSelected =
    visibleThreads.length > 0 &&
    visibleThreads.every(thread => selectedIdSet.has(thread.id));

  // Toggle selection for a single thread
  const toggleSelected = useCallback((threadId: string) => {
    setSelectedIds(current =>
      current.includes(threadId)
        ? current.filter(id => id !== threadId)
        : [...current, threadId],
    );
  }, []);

  // Toggle selection for all visible threads
  const toggleAllSelected = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSelectedIds(event.target.checked ? visibleThreads.map(item => item.id) : []);
    },
    [visibleThreads],
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Open thread and mark messages as read
  const openThread = useCallback(
    (threadId: string) => {
      const thread = visibleThreads.find(item => item.id === threadId);
      const unreadMessageIds =
        thread?.allMessages
          .filter(message => message.unread)
          .map(message => message.id) || [];

      setSelectedThreadId(threadId);
      setSelectedIds([]);

      if (!unreadMessageIds.length) return;

      // Optimistic mark read
      setMessages(current =>
        current.map(item =>
          unreadMessageIds.includes(item.id) ? { ...item, unread: false } : item,
        ),
      );

      Promise.all(
        unreadMessageIds.map(messageId =>
          fetch(apiUrl(`/flow/messages/${messageId}/read`), {
            credentials: 'include',
            headers: flowHeaders(),
            method: 'POST',
          }).then(response => responseJson(response)),
        ),
      ).catch(() => {
        // Rollback on failure
        setMessages(current =>
          current.map(item =>
            unreadMessageIds.includes(item.id) ? { ...item, unread: true } : item,
          ),
        );
      });
    },
    [setSelectedThreadId, setMessages, visibleThreads],
  );

  // Toggle star on a message
  const toggleStarred = useCallback(
    (event: MouseEvent, messageId: string) => {
      event.stopPropagation();
      const message = messages.find(item => item.id === messageId);
      const starred = !message?.starred;

      setMessages(current =>
        current.map(item =>
          item.id === messageId ? { ...item, starred } : item,
        ),
      );

      fetch(apiUrl(`/flow/messages/${messageId}/star`), {
        body: JSON.stringify({ starred }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...flowHeaders() },
        method: 'POST',
      })
        .then(response => responseJson<{ starred: boolean }>(response))
        .catch(error => {
          setMessages(current =>
            current.map(item =>
              item.id === messageId
                ? { ...item, starred: Boolean(message?.starred) }
                : item,
            ),
          );
          onStatusChange({
            kind: 'info',
            text: error instanceof Error ? error.message : 'Star update failed.',
          });
        });
    },
    [messages, onStatusChange, setMessages],
  );

  // General thread mutation helper (archive, report, unread, folder move)
  const mutateThread = useCallback(
    async ({
      body,
      endpoint,
      folder,
      keepOpen = false,
      success,
      unread,
    }: {
      body?: Record<string, string>;
      endpoint: string;
      folder?: MessageFolder;
      keepOpen?: boolean;
      success: string;
      unread?: boolean;
    }) => {
      if (!selectedThread) return;

      const messageIds = selectedThread.allMessages.map(message => message.id);
      if (!messageIds.length) return;

      try {
        await Promise.all(
          messageIds.map(messageId =>
            fetch(apiUrl(`/flow/messages/${messageId}/${endpoint}`), {
              body: body ? JSON.stringify(body) : undefined,
              credentials: 'include',
              headers: body
                ? { 'Content-Type': 'application/json', ...flowHeaders() }
                : flowHeaders(),
              method: 'POST',
            }).then(response => responseJson(response)),
          ),
        );

        setMessages(current =>
          current.map(message =>
            messageIds.includes(message.id)
              ? {
                  ...message,
                  ...(folder ? { folder } : {}),
                  ...(typeof unread === 'boolean' ? { unread } : {}),
                }
              : message,
          ),
        );
        onStatusChange({ kind: 'success', text: success });
        if (!keepOpen) setSelectedThreadId(null);
      } catch (error) {
        onStatusChange({
          kind: 'info',
          text: error instanceof Error ? error.message : 'Message update failed.',
        });
      }
    },
    [onStatusChange, selectedThread, setMessages, setSelectedThreadId],
  );

  // Archive open conversation
  const archiveThread = useCallback(() => {
    return mutateThread({
      endpoint: 'archive',
      folder: 'archived',
      success: 'Conversation archived.',
      unread: false,
    });
  }, [mutateThread]);

  // Report conversation as spam
  const reportThread = useCallback(() => {
    return mutateThread({
      endpoint: 'report',
      folder: 'archived',
      success: 'Conversation reported and archived.',
      unread: false,
    });
  }, [mutateThread]);

  // Mark open conversation unread
  const markThreadUnread = useCallback(() => {
    return mutateThread({
      endpoint: 'unread',
      success: 'Conversation marked as unread.',
      unread: true,
    });
  }, [mutateThread]);

  // Move open conversation to another folder
  const moveThreadTo = useCallback(
    (folder: MessageFolder) => {
      return mutateThread({
        body: { folder },
        endpoint: 'folder',
        folder,
        success: `Conversation moved.`,
        unread: false,
      });
    },
    [mutateThread],
  );

  // Request deletion for selected threads in mailbox
  const requestDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const messageIds = visibleThreads
      .filter(thread => selectedIds.includes(thread.id))
      .flatMap(thread => thread.allMessages.map(message => message.id));

    if (!messageIds.length) return;

    const permanent = activeFolder === 'bin';
    setDeleteConfirm({
      ...threadDeleteCopy(messageIds.length, permanent),
      messageIds,
      permanent,
    });
  }, [activeFolder, selectedIds, visibleThreads]);

  // Request deletion for the open conversation
  const requestDeleteOpenThread = useCallback(() => {
    if (!selectedThread) return;
    const messageIds = selectedThread.allMessages.map(message => message.id);
    if (!messageIds.length) return;

    const permanent = selectedThread.allMessages.every(
      message => message.folder === 'bin',
    );
    setDeleteConfirm({
      ...threadDeleteCopy(messageIds.length, permanent),
      messageIds,
      permanent,
    });
  }, [selectedThread]);

  // Confirm delete execution (Bin vs permanent deletion)
  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm || deleteLockRef.current) return;

    deleteLockRef.current = true;
    setIsDeleting(true);
    try {
      await Promise.all(
        deleteConfirm.messageIds.map(messageId =>
          fetch(
            apiUrl(
              deleteConfirm.permanent
                ? `/flow/messages/${messageId}`
                : `/flow/messages/${messageId}/trash`,
            ),
            {
              credentials: 'include',
              headers: flowHeaders(),
              method: deleteConfirm.permanent ? 'DELETE' : 'POST',
            },
          ).then(response => responseJson(response)),
        ),
      );

      onStatusChange(
        deleteConfirm.permanent
          ? { kind: 'success', text: 'Selected conversations permanently deleted.' }
          : { kind: 'info', text: 'Selected conversations moved to Bin.' },
      );
      setDeleteConfirm(null);
      setSelectedIds([]);
      setSelectedThreadId(null);
    } catch (error) {
      onStatusChange({
        kind: 'info',
        text: error instanceof Error ? error.message : 'Delete action failed.',
      });
    } finally {
      deleteLockRef.current = false;
      setIsDeleting(false);
    }
  }, [deleteConfirm, onStatusChange, setSelectedThreadId]);

  // Add emoji reaction
  const addReaction = useCallback(
    (messageId: string, emoji: string) => {
      setMessages(current =>
        current.map(message =>
          message.id === messageId
            ? {
                ...message,
                reactionCount: (message.reactionCount || 0) + 1,
                reactionEmoji: emoji,
                reactionFrom: accessSession.keyLabel,
              }
            : message,
        ),
      );
      onStatusChange({ kind: 'success', text: `Reaction ${emoji} added.` });
    },
    [accessSession.keyLabel, onStatusChange, setMessages],
  );

  // Plain-text conversation generator
  const threadToPlainText = useCallback(() => {
    return (
      selectedThread?.allMessages
        .map(message => {
          const recipients = message.to.join(', ');
          return [
            `From: ${message.from}`,
            `To: ${recipients}`,
            `Date: ${formatMessageDate(message.date)}`,
            `Subject: ${message.subject}`,
            '',
            message.body || message.preview,
          ].join('\n');
        })
        .join('\n\n---\n\n') || ''
    );
  }, [selectedThread]);

  // Download text file helper
  const downloadTextFile = useCallback(
    (filename: string, content: string, type = 'text/plain') => {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename.replace(/[\\/:*?"<>|]+/g, '-');
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
    [],
  );

  // Download conversation
  const downloadThread = useCallback(() => {
    if (!selectedThread) return;
    downloadTextFile(
      `${selectedThread.subject || 'conversation'}.txt`,
      threadToPlainText(),
    );
    onStatusChange({ kind: 'success', text: 'Conversation downloaded.' });
  }, [downloadTextFile, onStatusChange, selectedThread, threadToPlainText]);

  // Show original message source in a new window
  const showOriginalSource = useCallback(() => {
    if (!selectedThread) return;

    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) {
      onStatusChange({
        kind: 'info',
        text: 'Allow pop-ups to view the original source.',
      });
      return;
    }

    const pre = popup.document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.wordBreak = 'break-word';
    pre.style.font = '13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace';
    pre.textContent = threadToPlainText();
    popup.document.title = `Original source - ${selectedThread.subject}`;
    popup.document.body.style.margin = '24px';
    popup.document.body.append(pre);
  }, [onStatusChange, selectedThread, threadToPlainText]);

  // Print or open formatted document
  const openThreadDocument = useCallback(
    (print = false) => {
      if (!selectedThread) return;

      const popup = window.open('', '_blank');
      if (!popup) {
        onStatusChange({
          kind: 'info',
          text: 'Allow pop-ups to open this conversation.',
        });
        return;
      }

      popup.document.open();
      popup.document.write(renderReaderPrintDocument(selectedThread));
      popup.document.close();

      if (print) {
        window.setTimeout(() => {
          popup.focus();
          popup.print();
        }, 250);
      }
    },
    [onStatusChange, selectedThread],
  );

  // Copy direct message link
  const copyMessageLink = useCallback(
    async (message: MailMessage) => {
      const url = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(
        message.id,
      )}`;
      try {
        await navigator.clipboard.writeText(url);
        onStatusChange({ kind: 'success', text: 'Message link copied to clipboard.' });
      } catch {
        window.location.hash = message.id;
        onStatusChange({ kind: 'info', text: 'Message link added to the address bar.' });
      }
    },
    [onStatusChange],
  );

  // Download individual message
  const downloadMessage = useCallback(
    (message: MailMessage) => {
      downloadTextFile(
        `${message.subject || message.id}.txt`,
        [
          `From: ${message.from}`,
          `To: ${message.to.join(', ')}`,
          `Date: ${formatMessageDate(message.date)}`,
          `Subject: ${message.subject}`,
          '',
          message.body || message.preview,
        ].join('\n'),
      );
      onStatusChange({ kind: 'success', text: 'Message downloaded.' });
    },
    [downloadTextFile, onStatusChange],
  );

  // Reply to message
  const replyToMessage = useCallback(
    (message: MailMessage) => {
      const contact = contactFromMessage(message);
      if (!contact.email) return;

      const subject = /^re:/i.test(message.subject)
        ? message.subject
        : `Re: ${message.subject}`;

      onOpenComposeReply?.(contact, subject);
    },
    [onOpenComposeReply],
  );

  return {
    addReaction,
    allVisibleSelected,
    archiveThread,
    clearSelection,
    confirmDelete,
    copyMessageLink,
    deleteConfirm,
    downloadMessage,
    downloadThread,
    isDeleting,
    markThreadUnread,
    moveThreadTo,
    openThread,
    openThreadDocument,
    reportThread,
    replyToMessage,
    requestDeleteOpenThread,
    requestDeleteSelected,
    selectedIdSet,
    selectedIds,
    setDeleteConfirm,
    setSelectedIds,
    showOriginalSource,
    toggleAllSelected,
    toggleSelected,
    toggleStarred,
  };
}
