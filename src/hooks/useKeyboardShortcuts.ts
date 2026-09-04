'use client';

import { useEffect, useRef } from 'react';
import type { MailFolder, MailThread } from '@/lib/flow-console/types';

export interface UseKeyboardShortcutsOptions {
  threads: MailThread[];
  selectedThreadId: string | null;
  focusedThreadId: string | null;
  setFocusedThreadId: (id: string | null | ((prev: string | null) => string | null)) => void;
  isComposeOpen: boolean;
  isShortcutsModalOpen: boolean;
  canWrite: boolean;
  onOpenCompose: () => void;
  onCloseCompose: () => void;
  onSendCompose: () => void;
  onSaveDraft: () => void;
  onFocusSearch: () => void;
  onToggleShortcutsModal: () => void;
  onSelectFolder: (folder: MailFolder) => void;
  onOpenThread: (threadId: string) => void;
  onCloseReader: () => void;
  onToggleSelect: (threadId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onToggleStar: (threadId: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onMarkUnread: () => void;
  onMarkRead: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onNextThread?: () => void;
  onPrevThread?: () => void;
}

export function useKeyboardShortcuts({
  threads,
  selectedThreadId,
  focusedThreadId,
  setFocusedThreadId,
  isComposeOpen,
  isShortcutsModalOpen,
  canWrite,
  onOpenCompose,
  onCloseCompose,
  onSendCompose,
  onSaveDraft,
  onFocusSearch,
  onToggleShortcutsModal,
  onSelectFolder,
  onOpenThread,
  onCloseReader,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onToggleStar,
  onArchive,
  onDelete,
  onMarkUnread,
  onMarkRead,
  onReply,
  onReplyAll,
  onNextThread,
  onPrevThread,
}: UseKeyboardShortcutsOptions) {
  const pendingPrefixRef = useRef<string | null>(null);
  const prefixTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        (activeElement instanceof HTMLElement && activeElement.isContentEditable);

      // Compose Modal Shortcuts
      if (isComposeOpen) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          onSendCompose();
          return;
        }
        if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
          event.preventDefault();
          onSaveDraft();
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          onCloseCompose();
          return;
        }
        return;
      }

      // Shortcuts Modal toggle via Escape
      if (isShortcutsModalOpen) {
        if (event.key === 'Escape') {
          event.preventDefault();
          onToggleShortcutsModal();
        }
        return;
      }

      // When user is typing inside search or other inputs, allow Escape to blur
      if (isInput) {
        if (event.key === 'Escape') {
          if (activeElement instanceof HTMLElement) {
            activeElement.blur();
          }
        }
        return;
      }

      // Ignore modifier combinations that are browser defaults (except ? or shift)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const key = event.key;

      // Handle two-key sequence prefixes ('g' or '*')
      if (pendingPrefixRef.current) {
        const prefix = pendingPrefixRef.current;
        pendingPrefixRef.current = null;
        if (prefixTimerRef.current) clearTimeout(prefixTimerRef.current);

        if (prefix === 'g') {
          switch (key) {
            case 'i':
              event.preventDefault();
              onSelectFolder('inbox');
              return;
            case 's':
              event.preventDefault();
              onSelectFolder('starred');
              return;
            case 't':
              event.preventDefault();
              onSelectFolder('sent');
              return;
            case 'd':
              event.preventDefault();
              onSelectFolder('drafts');
              return;
            case 'b':
              event.preventDefault();
              onSelectFolder('bin');
              return;
            case 'a':
              event.preventDefault();
              onSelectFolder('allmail');
              return;
          }
        } else if (prefix === '*') {
          switch (key) {
            case 'a':
              event.preventDefault();
              onSelectAll();
              return;
            case 'n':
              event.preventDefault();
              onDeselectAll();
              return;
          }
        }
        return;
      }

      // Start sequence prefix
      if (key === 'g' || key === '*') {
        pendingPrefixRef.current = key;
        prefixTimerRef.current = setTimeout(() => {
          pendingPrefixRef.current = null;
        }, 1200);
        return;
      }

      // Global single-key commands
      if (key === '?') {
        event.preventDefault();
        onToggleShortcutsModal();
        return;
      }

      if (key === '/') {
        event.preventDefault();
        onFocusSearch();
        return;
      }

      if (key === 'c' || key === 'C') {
        if (canWrite) {
          event.preventDefault();
          onOpenCompose();
        }
        return;
      }

      // In Reader View (selectedThreadId is active)
      if (selectedThreadId) {
        switch (key) {
          case 'Escape':
          case 'u':
            event.preventDefault();
            onCloseReader();
            return;
          case 'j':
          case ']':
            event.preventDefault();
            onNextThread?.();
            return;
          case 'k':
          case '[':
            event.preventDefault();
            onPrevThread?.();
            return;
          case 'r':
            event.preventDefault();
            onReply?.();
            return;
          case 'a':
            event.preventDefault();
            onReplyAll?.();
            return;
          case 's':
            event.preventDefault();
            onToggleStar(selectedThreadId);
            return;
          case 'e':
          case 'y':
            event.preventDefault();
            onArchive();
            return;
          case '#':
          case 'Delete':
            event.preventDefault();
            onDelete();
            return;
          case 'U':
            event.preventDefault();
            onMarkUnread();
            return;
          case 'I':
            event.preventDefault();
            onMarkRead();
            return;
        }
        return;
      }

      // In Mailbox List View
      const currentIndex = threads.findIndex(t => t.id === focusedThreadId);

      switch (key) {
        case 'j':
        case 'ArrowDown': {
          event.preventDefault();
          const nextIndex = currentIndex < threads.length - 1 ? currentIndex + 1 : 0;
          if (threads[nextIndex]) {
            setFocusedThreadId(threads[nextIndex].id);
          }
          return;
        }
        case 'k':
        case 'ArrowUp': {
          event.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : threads.length - 1;
          if (threads[prevIndex]) {
            setFocusedThreadId(threads[prevIndex].id);
          }
          return;
        }
        case 'Enter':
        case 'o': {
          event.preventDefault();
          const targetId = focusedThreadId || threads[0]?.id;
          if (targetId) {
            onOpenThread(targetId);
          }
          return;
        }
        case 'x': {
          event.preventDefault();
          if (focusedThreadId) {
            onToggleSelect(focusedThreadId);
          }
          return;
        }
        case 's': {
          event.preventDefault();
          const targetId = focusedThreadId || threads[0]?.id;
          if (targetId) {
            onToggleStar(targetId);
          }
          return;
        }
        case 'e':
        case 'y': {
          event.preventDefault();
          onArchive();
          return;
        }
        case '#':
        case 'Delete': {
          event.preventDefault();
          onDelete();
          return;
        }
        case 'u': {
          event.preventDefault();
          onMarkUnread();
          return;
        }
        case 'I': {
          event.preventDefault();
          onMarkRead();
          return;
        }
        case 'Escape': {
          event.preventDefault();
          onDeselectAll();
          setFocusedThreadId(null);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (prefixTimerRef.current) clearTimeout(prefixTimerRef.current);
    };
  }, [
    canWrite,
    focusedThreadId,
    isComposeOpen,
    isShortcutsModalOpen,
    onArchive,
    onCloseCompose,
    onCloseReader,
    onDelete,
    onDeselectAll,
    onFocusSearch,
    onMarkRead,
    onMarkUnread,
    onNextThread,
    onOpenCompose,
    onOpenThread,
    onPrevThread,
    onReply,
    onReplyAll,
    onSaveDraft,
    onSelectAll,
    onSelectFolder,
    onSendCompose,
    onToggleSelect,
    onToggleShortcutsModal,
    onToggleStar,
    selectedThreadId,
    setFocusedThreadId,
    threads,
  ]);
}
