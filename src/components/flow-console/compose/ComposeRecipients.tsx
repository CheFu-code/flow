'use client';

import type { ChangeEvent, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
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
      <div className={styles.recipientComposer}>
        <div className={styles.recipientInputRow}>
          <input
            aria-label="Enter recipient email address"
            disabled={isSending}
            onChange={onToInputChange}
            onKeyDown={onKeyDown}
            placeholder="name@example.com"
            type="email"
            value={toInput}
          />
          <button
            className={styles.addRecipientButton}
            disabled={isSending || !toInput.trim()}
            onClick={onAddRecipients}
            type="button"
          >
            Add
          </button>
        </div>

        {recipientEmails.length > 0 ? (
          <div aria-label="Recipient tags" className={styles.recipientChips}>
            {recipientEmails.map(email => (
              <button
                aria-label={`Remove recipient ${email}`}
                className={styles.recipientChip}
                disabled={isSending}
                key={email}
                onClick={() => onRemoveRecipient(email)}
                type="button"
              >
                <span>{email}</span>
                <X size={13} />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
