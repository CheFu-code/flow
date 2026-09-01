'use client';

import { AtSign } from 'lucide-react';
import type { FlowSender } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export interface ComposeSenderSelectProps {
  composeFrom: string;
  isSending: boolean;
  onOpenManageSenders: () => void;
  onSelectSender: (sender: string) => void;
  senders?: FlowSender[];
}

export function ComposeSenderSelect({
  composeFrom,
  isSending,
  onOpenManageSenders,
  onSelectSender,
  senders,
}: ComposeSenderSelectProps) {
  return (
    <div className={styles.composeLine}>
      <span>From</span>
      <div className={styles.composeFromWrap}>
        {senders && senders.length > 0 ? (
          <select
            aria-label="Select sender email address"
            className={styles.composeSelect}
            disabled={isSending}
            onChange={e => {
              if (e.target.value === '__add_new__') {
                onOpenManageSenders();
              } else {
                onSelectSender(e.target.value);
              }
            }}
            value={composeFrom}
          >
            {senders.map(sender => (
              <option key={sender.email} value={sender.email}>
                {sender.label}
              </option>
            ))}
            <option value="__add_new__">
              + Manage / Add @chefu.co.za address...
            </option>
          </select>
        ) : (
          <input
            aria-label="Sender email address"
            disabled={isSending}
            onChange={e => onSelectSender(e.target.value)}
            placeholder="Name <email@chefu.co.za>"
            value={composeFrom}
          />
        )}
        <button
          aria-label="Manage authorized sender addresses"
          className={styles.manageSendersButton}
          data-tooltip="Manage sender addresses (@chefu.co.za)"
          onClick={onOpenManageSenders}
          type="button"
        >
          <AtSign size={14} />
          <span>Addresses</span>
        </button>
      </div>
    </div>
  );
}
