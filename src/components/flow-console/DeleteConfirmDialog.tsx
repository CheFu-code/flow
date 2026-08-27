'use client';

import { Loader2 } from 'lucide-react';
import type { DeleteConfirm } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

type DeleteConfirmDialogProps = {
  confirm: DeleteConfirm;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmDialog({
  confirm,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <div aria-label={confirm.title} aria-modal="true" className={styles.confirmOverlay} role="dialog">
      <section className={styles.confirmDialog}>
        <h2>{confirm.title}</h2>
        <p>{confirm.body}</p>
        <div className={styles.confirmActions}>
          <button className={styles.cancelButton} disabled={isDeleting} onClick={onCancel} type="button">
            Cancel
          </button>
          <button className={styles.dangerConfirmButton} disabled={isDeleting} onClick={onConfirm} type="button">
            {isDeleting ? (
              <><Loader2 className={styles.spin} size={16} />Deleting</>
            ) : confirm.permanent ? (
              'Delete forever'
            ) : (
              'Move to Bin'
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
