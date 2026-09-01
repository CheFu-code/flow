'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { apiUrl, flowHeaders } from '@/lib/api';
import { emptyFolderCounts } from '@/lib/flow-console/constants';
import { responseJson } from '@/lib/flow-console/http';
import {
  backendFolderFor,
  groupMessagesIntoThreads,
  mapCounts,
  toMailMessage,
} from '@/lib/flow-console/mail';
import { parseServerSentEvent } from '@/lib/flow-console/sse';
import type {
  BackendMessage,
  BackendMessagesResponse,
  MailFolder,
  MailMessage,
  MailThread,
  StatusMessage,
} from '@/lib/flow-console/types';

const MAILBOX_CACHE_KEY = 'flow-mailbox-cache-v1';

export function readMailboxCache(folder: MailFolder): MailMessage[] {
  if (typeof window === 'undefined') return [];

  try {
    const cached = JSON.parse(
      window.sessionStorage.getItem(MAILBOX_CACHE_KEY) || '{}',
    ) as Record<string, MailMessage[]>;
    return Array.isArray(cached[folder]) ? cached[folder] : [];
  } catch {
    return [];
  }
}

export function writeMailboxCache(folder: MailFolder, messages: MailMessage[]) {
  if (typeof window === 'undefined') return;

  try {
    const cached = JSON.parse(
      window.sessionStorage.getItem(MAILBOX_CACHE_KEY) || '{}',
    ) as Record<string, MailMessage[]>;
    cached[folder] = messages.slice(0, 100);
    window.sessionStorage.setItem(MAILBOX_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Session storage is optional and may be unavailable or full.
  }
}

export interface UseMailboxOptions {
  onStatusChange?: (status: StatusMessage | null) => void;
  onDraftDetected?: (draft: MailMessage) => void;
}

export function useMailbox({ onStatusChange, onDraftDetected }: UseMailboxOptions = {}) {
  const [activeFolder, setActiveFolder] = useState<MailFolder>('inbox');
  const [folderCounts, setFolderCounts] = useState<Record<MailFolder, number>>(emptyFolderCounts);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [listScrollTop, setListScrollTop] = useState(0);
  const [messages, setMessages] = useState<MailMessage[]>(() => readMailboxCache('inbox'));
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const detailLoadedRef = useRef(new Set<string>());
  const debouncedQuery = useDebounce(query, 140);

  // Group messages into conversations / threads
  const allThreads = useMemo(
    () => groupMessagesIntoThreads(messages),
    [messages],
  );

  // Filter threads by search query
  const visibleThreads = useMemo(() => {
    const cleanQuery = debouncedQuery.trim().toLowerCase();
    if (!cleanQuery) return allThreads;

    return allThreads.filter(thread => {
      return thread.allMessages
        .flatMap(message => [
          message.body,
          message.from,
          message.name,
          message.preview,
          message.subject,
          message.to.join(' '),
        ])
        .join(' ')
        .toLowerCase()
        .includes(cleanQuery);
    });
  }, [allThreads, debouncedQuery]);

  // Virtual windowing calculations
  const virtualStart = Math.max(0, Math.floor(listScrollTop / 44) - 5);
  const virtualEnd = Math.min(visibleThreads.length, virtualStart + 30);
  const renderedThreads = visibleThreads.slice(virtualStart, virtualEnd);

  // Currently opened thread
  const selectedThread = useMemo(
    () => allThreads.find(thread => thread.id === selectedThreadId) || null,
    [allThreads, selectedThreadId],
  );

  // Switch active folder with cache restore
  const changeFolder = useCallback((folder: MailFolder) => {
    const cachedMessages = readMailboxCache(folder);
    setMessages(cachedMessages);
    setNextCursor(null);
    setIsLoadingMessages(cachedMessages.length === 0);
    setActiveFolder(folder);
    setSelectedThreadId(null);
    onStatusChange?.(null);
  }, [onStatusChange]);

  // Load older messages for cursor pagination
  const loadNextPage = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch(
        apiUrl(`/flow/messages?folder=${backendFolderFor(activeFolder)}&cursor=${encodeURIComponent(nextCursor)}`),
        { credentials: 'include', headers: flowHeaders() },
      );
      const data = await responseJson<BackendMessagesResponse>(response);
      const olderMessages = (data.messages || []).map(toMailMessage);
      setMessages(current => {
        const ids = new Set(current.map(message => message.id));
        return [...current, ...olderMessages.filter(message => !ids.has(message.id))];
      });
      setNextCursor(data.nextCursor || null);
    } catch (error) {
      onStatusChange?.({
        kind: 'info',
        text: error instanceof Error ? error.message : 'Older messages could not be loaded.',
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeFolder, isLoadingMore, nextCursor, onStatusChange]);

  // Fetch full details for messages in the selected thread
  useEffect(() => {
    if (!selectedThread) return;

    const pending = selectedThread.messages.filter(
      message => !detailLoadedRef.current.has(message.id) && !message.contentLoaded,
    );
    if (!pending.length) return;

    pending.forEach(message => detailLoadedRef.current.add(message.id));
    Promise.all(
      pending.map(async message => {
        try {
          const response = await fetch(apiUrl(`/flow/messages/${message.id}`), {
            credentials: 'include',
            headers: flowHeaders(),
          });
          const data = await responseJson<{ message: BackendMessage }>(response);
          return toMailMessage(data.message);
        } catch (error) {
          detailLoadedRef.current.delete(message.id);
          throw error;
        }
      }),
    )
      .then(details => {
        setMessages(current => current.map(message => {
          const detail = details.find(item => item.id === message.id);
          return detail ? { ...message, ...detail } : message;
        }));
        const draft = details.find(message => message.folder === 'drafts');
        if (draft && selectedThread.latest.folder === 'drafts') {
          onDraftDetected?.(draft);
        }
      })
      .catch(error => {
        onStatusChange?.({
          kind: 'info',
          text: error instanceof Error ? error.message : 'Message details could not be loaded.',
        });
      });
  }, [onDraftDetected, onStatusChange, selectedThread]);

  // Real-time SSE stream with automatic reconnect and fallback fetch
  useEffect(() => {
    const controller = new AbortController();
    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const applyMessages = (data: BackendMessagesResponse) => {
      const nextMessages = (data.messages || []).map(toMailMessage);
      setMessages(current => {
        const incomingIds = new Set(nextMessages.map(message => message.id));
        return [...nextMessages, ...current.filter(message => !incomingIds.has(message.id))];
      });
      setFolderCounts(mapCounts(data.counts));
      setNextCursor(data.nextCursor || null);
      setIsLoadingMessages(false);
      writeMailboxCache(activeFolder, nextMessages);
    };

    const loadMailboxFallback = async () => {
      try {
        const response = await fetch(
          apiUrl(`/flow/messages?folder=${backendFolderFor(activeFolder)}`),
          {
            credentials: 'include',
            headers: flowHeaders(),
            signal: controller.signal,
          },
        );
        applyMessages(await responseJson<BackendMessagesResponse>(response));
      } catch (error) {
        if (stopped || controller.signal.aborted) return;
        setIsLoadingMessages(false);
        onStatusChange?.({
          kind: 'info',
          text: error instanceof Error ? error.message : 'Mailbox could not be loaded.',
        });
      }
    };

    const handleEvent = (rawEvent: string) => {
      const parsed = parseServerSentEvent(rawEvent.trim());
      if (parsed.event === 'error') {
        let errorMessage = 'Live mailbox updates failed.';
        try {
          const payload = JSON.parse(parsed.data) as { message?: string };
          if (payload.message) errorMessage = payload.message;
        } catch {
          // Keep fallback message
        }
        onStatusChange?.({
          kind: 'info',
          text: `${errorMessage} Showing the latest available mail.`,
        });
        void loadMailboxFallback();
        return;
      }
      if (parsed.event !== 'messages' || !parsed.data) return;

      try {
        applyMessages(JSON.parse(parsed.data) as BackendMessagesResponse);
      } catch {
        // Ignore malformed stream frames; fallback remains active.
      }
    };

    const connect = async () => {
      try {
        const response = await fetch(
          apiUrl(`/flow/messages/stream?folder=${backendFolderFor(activeFolder)}`),
          {
            credentials: 'include',
            headers: { Accept: 'text/event-stream', ...flowHeaders() },
            signal: controller.signal,
          },
        );

        if (!response.ok || !response.body) {
          onStatusChange?.({ kind: 'info', text: 'Live mailbox updates could not be connected.' });
          void loadMailboxFallback();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          events.forEach(handleEvent);
        }
      } catch {
        if (stopped || controller.signal.aborted) return;
        setIsLoadingMessages(false);
        onStatusChange?.({
          kind: 'info',
          text: 'Mailbox updates are temporarily unavailable.',
        });
      }

      if (!stopped) {
        retryTimer = setTimeout(() => {
          void connect();
        }, 5_000);
      }
    };

    void connect();

    return () => {
      stopped = true;
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [activeFolder, onStatusChange]);

  return {
    activeFolder,
    allThreads,
    changeFolder,
    debouncedQuery,
    folderCounts,
    isLoadingMessages,
    isLoadingMore,
    listScrollTop,
    loadNextPage,
    messages,
    nextCursor,
    query,
    renderedThreads,
    selectedThread,
    selectedThreadId,
    setActiveFolder,
    setFolderCounts,
    setIsLoadingMessages,
    setListScrollTop,
    setMessages,
    setQuery,
    setSelectedThreadId,
    virtualEnd,
    virtualStart,
    visibleThreads,
  };
}
