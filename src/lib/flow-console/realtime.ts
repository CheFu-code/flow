'use client';

import type { MailFolder, MailMessage, MessageFolder } from './types';

export type RealtimeSyncAction =
  | { type: 'MARK_READ'; messageIds: string[] }
  | { type: 'MARK_UNREAD'; messageIds: string[] }
  | { type: 'STAR'; messageId: string; starred: boolean }
  | { type: 'MOVE_FOLDER'; messageIds: string[]; folder: MessageFolder }
  | { type: 'DELETE'; messageIds: string[]; permanent: boolean }
  | { type: 'REACTION'; messageId: string; emoji: string; from: string }
  | { type: 'COUNTS_UPDATE'; counts: Record<MailFolder, number> }
  | { type: 'NEW_MESSAGE'; message: MailMessage };

const CHANNEL_NAME = 'flow_realtime_sync_channel';

class RealtimeSyncBus {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<(action: RealtimeSyncAction) => void>();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = event => {
          if (event.data && typeof event.data.type === 'string') {
            this.notify(event.data as RealtimeSyncAction);
          }
        };
      } catch {
        // Fallback gracefully if BroadcastChannel is restricted
      }
    }
  }

  public publish(action: RealtimeSyncAction) {
    // Notify local listeners (optional, or local state updates directly)
    if (this.channel) {
      try {
        this.channel.postMessage(action);
      } catch {
        // BroadcastChannel send error ignored
      }
    }
  }

  public subscribe(listener: (action: RealtimeSyncAction) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(action: RealtimeSyncAction) {
    this.listeners.forEach(listener => {
      try {
        listener(action);
      } catch (err) {
        console.error('[RealtimeSyncBus] Listener error:', err);
      }
    });
  }
}

export const realtimeBus = new RealtimeSyncBus();
