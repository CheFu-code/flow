'use client';

import { FileText, Image as ImageIcon, X } from 'lucide-react';
import { formatFileSize } from '@/lib/flow-console/format';
import type { ComposeAttachment } from '@/lib/flow-console/types';

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
    <div
      aria-label="Attached files"
      className="flex flex-wrap gap-2 border-t bg-muted/30 p-2.5 px-4 min-h-[50px] items-center"
    >
      {attachments.map(attachment => (
        <div
          key={attachment.id}
          className="inline-flex items-center gap-2 rounded-xl border bg-card px-2.5 py-1.5 text-xs text-card-foreground shadow-xs"
        >
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-400">
            {attachment.inline ? (
              <ImageIcon className="size-3.5" />
            ) : (
              <FileText className="size-3.5" />
            )}
          </div>
          <div className="flex flex-col min-w-0 max-w-[180px]">
            <span className="truncate font-medium text-foreground text-[11px] sm:text-xs">
              {attachment.filename}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {attachment.inline ? 'Inline image' : 'Attachment'} ·{' '}
              {formatFileSize(attachment.size)}
            </span>
          </div>
          <button
            aria-label={`Remove attachment ${attachment.filename}`}
            className="size-5 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            disabled={isSending}
            onClick={() => onRemoveAttachment(attachment.id)}
            type="button"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
