'use client';

import { Maximize2, Minimize2, Minus, X } from 'lucide-react';
import styles from '@/components/FlowConsole.module.css';

export interface ComposeHeaderProps {
  isExpanded: boolean;
  isSavingDraft: boolean;
  isSending: boolean;
  onSaveAndClose: () => void;
  onToggleExpand: () => void;
}

export function ComposeHeader({
  isExpanded,
  isSavingDraft,
  isSending,
  onSaveAndClose,
  onToggleExpand,
}: ComposeHeaderProps) {
  return (
    <div className={styles.composeHeader}>
      <strong>New Message</strong>
      <div className={styles.composeHeaderActions}>
        <button
          aria-label="Minimize composer"
          className={styles.composeIconButton}
          data-tooltip="Minimize"
          disabled={isSending || isSavingDraft}
          onClick={onSaveAndClose}
          type="button"
        >
          <Minus size={16} />
        </button>
        <button
          aria-label={
            isExpanded ? 'Exit full screen compose' : 'Full screen compose'
          }
          className={styles.composeIconButton}
          data-tooltip={isExpanded ? 'Exit full screen' : 'Full screen'}
          disabled={isSending || isSavingDraft}
          onClick={onToggleExpand}
          type="button"
        >
          {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button
          aria-label="Save draft and close"
          className={styles.composeIconButton}
          data-tooltip="Save &amp; close"
          disabled={isSending || isSavingDraft}
          onClick={onSaveAndClose}
          type="button"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );
}
