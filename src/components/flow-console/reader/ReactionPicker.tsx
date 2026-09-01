'use client';

import { composeEmojis } from '@/lib/flow-console/constants';
import styles from '@/components/FlowConsole.module.css';

export interface ReactionPickerProps {
  onSelectEmoji: (emoji: string) => void;
}

export function ReactionPicker({ onSelectEmoji }: ReactionPickerProps) {
  return (
    <div
      aria-label="Choose emoji reaction"
      className={styles.inlineActionMenu}
      role="menu"
    >
      {composeEmojis.slice(0, 8).map(emoji => (
        <button
          aria-label={`React with ${emoji}`}
          key={emoji}
          onClick={() => onSelectEmoji(emoji)}
          type="button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
