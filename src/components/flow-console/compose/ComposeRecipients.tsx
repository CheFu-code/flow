'use client';

import type { ChangeEvent, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import styles from '@/components/FlowConsole.module.css';

export interface ComposeRecipientsProps {
  isSending: boolean;
  onAddRecipients: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onRemoveRecipient: (email: string) => void;
  onToInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  recipientEmails: string[];
  toInput: string;
}

export function ComposeRecipients({
  isSending,
  onAddRecipients,
  onKeyDown,
  onRemoveRecipient,
  onToInputChange,
  recipientEmails,
  toInput,
}: ComposeRecipientsProps) {
  return (
    <div className={styles.composeLine}>
      <span>Recipients</span>
      <div className="flex flex-col gap-2.5 w-full min-w-0">
        <div className="flex items-center gap-2 w-full min-w-0">
          <Input
            aria-label="Enter recipient email address"
            className="flex-1 h-9 text-xs sm:text-sm"
            disabled={isSending}
            onChange={onToInputChange}
            onKeyDown={onKeyDown}
            placeholder="name@example.com, user2@example.com..."
            type="email"
            value={toInput}
          />
          <Button
            className="bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-700 h-9 px-3.5 text-xs font-semibold shrink-0"
            disabled={isSending || !toInput.trim()}
            onClick={onAddRecipients}
            size="sm"
            type="button"
          >
            Add
          </Button>
        </div>

        {recipientEmails.length > 0 ? (
          <div aria-label="Recipient tags" className="flex flex-wrap gap-1.5 pt-0.5">
            {recipientEmails.map(email => (
              <Badge
                key={email}
                variant="brand"
                className="gap-1.5 pl-2.5 pr-1 py-1 text-xs font-normal bg-teal-50 text-teal-800 dark:bg-teal-950/70 dark:text-teal-200 border border-teal-200/60 dark:border-teal-800/60 transition-colors"
              >
                <span className="truncate max-w-[200px]">{email}</span>
                <button
                  aria-label={`Remove recipient ${email}`}
                  className="size-4 inline-flex items-center justify-center rounded-full hover:bg-teal-200/60 dark:hover:bg-teal-800/80 transition-colors p-0 text-current"
                  disabled={isSending}
                  onClick={() => onRemoveRecipient(email)}
                  type="button"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
