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
  sortByDateDesc,
  toMailMessage,
} from '@/lib/flow-console/mail';
import { realtimeBus } from '@/lib/flow-console/realtime';
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
    // Session storage is optional
  }
}

export type ConnectionStatus = 'live' | 'syncing' | 'offline';

export interface UseMailboxOptions {
  onStatusChange?: (status: StatusMessage | null) => void;
  onDraftDetected?: (draft: MailMessage) => void;
}

export function useMailbox({ onStatusChange, onDraftDetected }: UseMailboxOptions = {}) {
  const [activeFolder, setActiveFolder] = useState<MailFolder>('inbox');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('syncing');
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
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Switch active folder with instant cache restore
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

  // Fetch full details for messages in the selected thread in real time
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

  // Cross-Tab Realtime Synchronization via BroadcastChannel
  useEffect(() => {
    const unsubscribe = realtimeBus.subscribe(action => {
      switch (action.type) {
        case 'MARK_READ':
          setMessages(current =>
            current.map(msg =>
              action.messageIds.includes(msg.id) ? { ...msg, unread: false } : msg,
            ),
          );
          setFolderCounts(prev => ({
            ...prev,
            inbox: Math.max(0, prev.inbox - action.messageIds.length),
          }));
          break;

        case 'MARK_UNREAD':
          setMessages(current =>
            current.map(msg =>
              action.messageIds.includes(msg.id) ? { ...msg, unread: true } : msg,
            ),
          );
          setFolderCounts(prev => ({
            ...prev,
            inbox: prev.inbox + action.messageIds.length,
          }));
          break;

        case 'STAR':
          setMessages(current =>
            current.map(msg =>
              msg.id === action.messageId ? { ...msg, starred: action.starred } : msg,
            ),
          );
          setFolderCounts(prev => ({
            ...prev,
            starred: action.starred
              ? prev.starred + 1
              : Math.max(0, prev.starred - 1),
          }));
          break;

        case 'MOVE_FOLDER':
          setMessages(current =>
            current.map(msg =>
              action.messageIds.includes(msg.id)
                ? { ...msg, folder: action.folder }
                : msg,
            ),
          );
          break;

        case 'DELETE':
          setMessages(current =>
            current.filter(msg => !action.messageIds.includes(msg.id)),
          );
          break;

        case 'REACTION':
          setMessages(current =>
            current.map(msg =>
              msg.id === action.messageId
                ? {
                    ...msg,
                    reactionCount: (msg.reactionCount || 0) + 1,
                    reactionEmoji: action.emoji,
                    reactionFrom: action.from,
                  }
                : msg,
            ),
          );
          break;

        case 'COUNTS_UPDATE':
          setFolderCounts(action.counts);
          break;

        case 'NEW_MESSAGE':
          setMessages(current => {
            const exists = current.some(msg => msg.id === action.message.id);
            if (exists) return current;
            return [action.message, ...current].sort((a, b) => sortByDateDesc(a, b));
          });
          break;
      }
    });

    return unsubscribe;
  }, []);

  // Online / Offline window events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setConnectionStatus('syncing');
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real-time Server-Sent Events (SSE) stream subscription
  useEffect(() => {
    let stopped = false;
    let controller = new AbortController();

    const applyMessages = (data: BackendMessagesResponse) => {
      const incoming = (data.messages || []).map(toMailMessage);

      setMessages(current => {
        // Reconcile incoming stream messages with existing state
        const currentMap = new Map(current.map(m => [m.id, m]));

        incoming.forEach(msg => {
          const existing = currentMap.get(msg.id);
          if (existing) {
            // Update fields while preserving loaded body if incoming is just metadata
            currentMap.set(msg.id, {
              ...existing,
              ...msg,
              body: msg.body || existing.body,
              contentLoaded: msg.contentLoaded || existing.contentLoaded,
            });
          } else {
            // New incoming message arrived in real time!
            currentMap.set(msg.id, msg);
          }
        });

        // Convert map back to sorted array
        return Array.from(currentMap.values()).sort((a, b) => sortByDateDesc(a, b));
      });

      if (data.counts) {
        const mapped = mapCounts(data.counts);
        setFolderCounts(mapped);
        realtimeBus.publish({ type: 'COUNTS_UPDATE', counts: mapped });
      }

      setNextCursor(data.nextCursor || null);
      setIsLoadingMessages(false);
      setConnectionStatus('live');
      writeMailboxCache(activeFolder, incoming);
    };

    const loadMailboxFallback = async () => {
      try {
        setConnectionStatus('syncing');
        const response = await fetch(
          apiUrl(`/flow/messages?folder=${backendFolderFor(activeFolder)}`),
          {
            credentials: 'include',
            headers: flowHeaders(),
            signal: controller.signal,
          },
        );
        const data = await responseJson<BackendMessagesResponse>(response);
        if (!stopped) {
          applyMessages(data);
        }
      } catch (error) {
        if (stopped || controller.signal.aborted) return;
        setIsLoadingMessages(false);
        setConnectionStatus(navigator.onLine ? 'syncing' : 'offline');
        onStatusChange?.({
          kind: 'info',
          text: error instanceof Error ? error.message : 'Mailbox could not be loaded.',
        });
      }
    };

    const handleEvent = (rawEvent: string) => {
      const parsed = parseServerSentEvent(rawEvent.trim());
      if (parsed.event === 'error') {
        let errorMessage = 'Live mailbox updates reconnecting...';
        try {
          const payload = JSON.parse(parsed.data) as { message?: string };
          if (payload.message) errorMessage = payload.message;
        } catch {
          // Keep fallback message
        }
        setConnectionStatus('syncing');
        void loadMailboxFallback();
        return;
      }

      if (parsed.event !== 'messages' || !parsed.data) return;

      try {
        const payload = JSON.parse(parsed.data) as BackendMessagesResponse;
        applyMessages(payload);
      } catch {
        // Ignore malformed stream frames
      }
    };

    const connectStream = async () => {
      if (stopped) return;
      setConnectionStatus('syncing');

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
          void loadMailboxFallback();
          return;
        }

        setConnectionStatus('live');
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
        setConnectionStatus(navigator.onLine ? 'syncing' : 'offline');
      }

      if (!stopped) {
        reconnectTimeoutRef.current = setTimeout(() => {
          void connectStream();
        }, 4_000);
      }
    };

    void connectStream();

    return () => {
      stopped = true;
      controller.abort();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [activeFolder, onStatusChange]);

  return {
    activeFolder,
    allThreads,
    changeFolder,
    connectionStatus,
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
