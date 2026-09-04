'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, Send } from 'lucide-react';
import styles from '@/components/FlowConsole.module.css';

export interface UndoSendToastProps {
  durationMs?: number;
  isOpen: boolean;
  onSendNow: () => void;
  onUndo: () => void;
  recipientCount: number;
}

function UndoSendToastActive({
  durationMs = 5000,
  onSendNow,
  onUndo,
  recipientCount,
}: Omit<UndoSendToastProps, 'isOpen'>) {
  const [remainingMs, setRemainingMs] = useState(durationMs);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, durationMs - elapsed);
      setRemainingMs(left);
      if (left <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [durationMs]);

  const progressPercent = Math.max(0, Math.min(100, (remainingMs / durationMs) * 100));
  const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000));

  return (
    <div aria-live="assertive" className={styles.undoToast} role="status">
      <div className="flex items-center gap-2">
        <span>
          Sending to {recipientCount} recipient{recipientCount === 1 ? '' : 's'} in {secondsLeft}s...
        </span>
      </div>

      <div className="flex items-center gap-2 ml-3">
        <button
          aria-label="Undo sending email"
          className={styles.undoButton}
          onClick={onUndo}
          type="button"
        >
          <RotateCcw size={13} />
          <span>Undo</span>
        </button>
        <button
          aria-label="Send email immediately"
          className={styles.undoSendNowButton}
          onClick={onSendNow}
          type="button"
        >
          <span>Send now</span>
          <Send size={11} />
        </button>
      </div>

      <div className={styles.undoProgressTrack}>
        <div
          className={styles.undoProgressBar}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

export function UndoSendToast({
  durationMs = 5000,
  isOpen,
  onSendNow,
  onUndo,
  recipientCount,
}: UndoSendToastProps) {
  if (!isOpen) return null;

  return (
    <UndoSendToastActive
      durationMs={durationMs}
      onSendNow={onSendNow}
      onUndo={onUndo}
      recipientCount={recipientCount}
    />
  );
}
