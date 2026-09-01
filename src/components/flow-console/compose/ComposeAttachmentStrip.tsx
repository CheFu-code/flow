'use client';

import { FileText, Image as ImageIcon, X } from 'lucide-react';
import { formatFileSize } from '@/lib/flow-console/format';
import type { ComposeAttachment } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export interface ComposeAttachmentStripProps {
  attachments: ComposeAttachment[];
  isSending: boolean;
  onRemoveAttachment: (id: string) => void;
}

export function ComposeAttachmentStrip({
  attachments,
  isSending,
  onRemoveAttachment,
}: ComposeAttachmentStripProps) {
  if (!attachments.length) return null;

  return (
    <div aria-label="Attached files" className={styles.attachmentStrip}>
      {attachments.map(attachment => (
        <div className={styles.attachmentChip} key={attachment.id}>
          {attachment.inline ? (
            <ImageIcon className={styles.attachmentIcon} size={15} />
          ) : (
            <FileText className={styles.attachmentIcon} size={15} />
          )}
          <span className={styles.attachmentDetails}>
            <span className={styles.attachmentFilename}>
              {attachment.filename}
            </span>
            <small className={styles.attachmentMeta}>
              {attachment.inline ? 'Inline image' : 'Attachment'} ·{' '}
              {formatFileSize(attachment.size)}
            </small>
          </span>
          <button
            aria-label={`Remove attachment ${attachment.filename}`}
            className={styles.attachmentRemove}
            disabled={isSending}
            onClick={() => onRemoveAttachment(attachment.id)}
            type="button"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
