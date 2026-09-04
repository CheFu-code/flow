'use client';

import { RefreshCw, WifiOff } from 'lucide-react';
import styles from '@/components/FlowConsole.module.css';

export interface OfflineBannerProps {
  isOffline: boolean;
  isReconnecting?: boolean;
  onReconnect: () => void;
}

export function OfflineBanner({
  isOffline,
  isReconnecting = false,
  onReconnect,
}: OfflineBannerProps) {
  if (!isOffline) return null;

  return (
    <div
      aria-label="Offline status notification"
      className={styles.offlineBanner}
      role="alert"
    >
      <div className={styles.offlineBannerContent}>
        <WifiOff size={16} className="shrink-0" />
        <span>You are currently offline. Showing cached mailbox. Changes will sync automatically when back online.</span>
      </div>

      <button
        aria-label="Retry network connection"
        className={styles.offlineRetryButton}
        disabled={isReconnecting}
        onClick={onReconnect}
        type="button"
      >
        <RefreshCw size={12} className={isReconnecting ? 'animate-spin' : ''} />
        <span>{isReconnecting ? 'Reconnecting...' : 'Try Reconnecting'}</span>
      </button>
    </div>
  );
}
