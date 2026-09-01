'use client';

import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { StatusMessage } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export interface StatusToastProps {
  status: StatusMessage | null;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function StatusToast({
  status,
  onDismiss,
  autoDismissMs = 4000,
}: StatusToastProps) {
  useEffect(() => {
    if (!status) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss, status]);

  if (!status) return null;

  const isSuccess = status.kind === 'success';

  return (
    <div
      aria-live="polite"
      className={`${styles.statusToast} ${
        isSuccess ? styles.statusToastSuccess : styles.statusToastInfo
      }`}
      role="status"
    >
      <div className={styles.statusToastContent}>
        {isSuccess ? (
          <CheckCircle2 aria-hidden="true" className={styles.statusToastIcon} size={18} />
        ) : (
          <AlertCircle aria-hidden="true" className={styles.statusToastIcon} size={18} />
        )}
        <span className={styles.statusToastText}>{status.text}</span>
      </div>
      <button
        aria-label="Dismiss notification"
        className={styles.statusToastDismiss}
        onClick={onDismiss}
        type="button"
      >
        <X size={15} />
      </button>
    </div>
  );
}
