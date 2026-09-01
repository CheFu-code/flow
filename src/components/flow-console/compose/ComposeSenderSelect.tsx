'use client';

import { AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <div className="flex items-center gap-2 flex-1 w-full min-w-0">
        {senders && senders.length > 0 ? (
          <select
            aria-label="Select sender email address"
            className="flex-1 h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-600/30 dark:bg-card text-foreground"
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
          <Input
            aria-label="Sender email address"
            className="flex-1 h-9 text-xs sm:text-sm"
            disabled={isSending}
            onChange={e => onSelectSender(e.target.value)}
            placeholder="Name <email@chefu.co.za>"
            value={composeFrom}
          />
        )}
        <Button
          aria-label="Manage authorized sender addresses"
          className="h-9 gap-1 text-xs shrink-0 font-medium text-teal-700 hover:text-teal-800 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/60"
          onClick={onOpenManageSenders}
          size="sm"
          type="button"
          variant="outline"
        >
          <AtSign className="size-3.5" />
          <span className="hidden sm:inline">Addresses</span>
        </Button>
      </div>
    </div>
  );
}
