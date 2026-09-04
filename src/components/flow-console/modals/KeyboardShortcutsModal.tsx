'use client';

import { useMemo, useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import styles from '@/components/FlowConsole.module.css';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ShortcutItem = {
  description: string;
  keys: string[];
};

type ShortcutCategory = {
  title: string;
  items: ShortcutItem[];
};

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Navigation',
    items: [
      { description: 'Next conversation', keys: ['j', 'or', '↓'] },
      { description: 'Previous conversation', keys: ['k', 'or', '↑'] },
      { description: 'Open conversation', keys: ['Enter', 'or', 'o'] },
      { description: 'Back to list', keys: ['u', 'or', 'Esc'] },
      { description: 'Focus search bar', keys: ['/'] },
      { description: 'Go to Inbox', keys: ['g', 'i'] },
      { description: 'Go to Starred', keys: ['g', 's'] },
      { description: 'Go to Sent', keys: ['g', 't'] },
      { description: 'Go to Drafts', keys: ['g', 'd'] },
      { description: 'Go to Bin', keys: ['g', 'b'] },
      { description: 'Go to All Mail', keys: ['g', 'a'] },
    ],
  },
  {
    title: 'Actions & Selection',
    items: [
      { description: 'Compose new message', keys: ['c'] },
      { description: 'Select conversation', keys: ['x'] },
      { description: 'Select all visible', keys: ['*', 'a'] },
      { description: 'Deselect all', keys: ['*', 'n'] },
      { description: 'Star / Unstar', keys: ['s'] },
      { description: 'Archive conversation', keys: ['e'] },
      { description: 'Delete conversation', keys: ['#', 'or', 'Del'] },
      { description: 'Mark as unread', keys: ['u'] },
      { description: 'Mark as read', keys: ['Shift', 'I'] },
    ],
  },
  {
    title: 'Reading & Replying',
    items: [
      { description: 'Reply to sender', keys: ['r'] },
      { description: 'Reply all', keys: ['a'] },
      { description: 'Newer conversation', keys: [']'] },
      { description: 'Older conversation', keys: ['['] },
    ],
  },
  {
    title: 'Composer',
    items: [
      { description: 'Send message', keys: ['Ctrl/⌘', 'Enter'] },
      { description: 'Save draft', keys: ['Ctrl/⌘', 'S'] },
      { description: 'Close composer', keys: ['Esc'] },
    ],
  },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredCategories = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return SHORTCUT_CATEGORIES;

    return SHORTCUT_CATEGORIES.map(cat => ({
      ...cat,
      items: cat.items.filter(
        item =>
          item.description.toLowerCase().includes(q) ||
          item.keys.some(k => k.toLowerCase().includes(q)),
      ),
    })).filter(cat => cat.items.length > 0);
  }, [filterQuery]);

  if (!isOpen) return null;

  return (
    <div
      aria-label="Keyboard Shortcuts"
      aria-modal="true"
      className={styles.shortcutsModalOverlay}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <div className={styles.shortcutsModalDialog}>
        <div className={styles.shortcutsModalHeader}>
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-teal-600 dark:text-teal-400" />
            <strong>Keyboard Shortcuts</strong>
          </div>
          <button
            aria-label="Close shortcuts modal"
            className={styles.iconButton}
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.shortcutsModalBody}>
          <div className="relative">
            <input
              aria-label="Filter keyboard shortcuts"
              autoFocus
              className={styles.shortcutsSearch}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="Search shortcuts (e.g. reply, compose, archive)..."
              type="text"
              value={filterQuery}
            />
          </div>

          {filteredCategories.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No keyboard shortcuts found matching &quot;{filterQuery}&quot;
            </div>
          ) : (
            filteredCategories.map(cat => (
              <div key={cat.title}>
                <div className={styles.shortcutsCategoryTitle}>{cat.title}</div>
                <div className={styles.shortcutsGrid}>
                  {cat.items.map(item => (
                    <div className={styles.shortcutRow} key={item.description}>
                      <span>{item.description}</span>
                      <div className={styles.shortcutKeys}>
                        {item.keys.map((k, idx) =>
                          k === 'or' ? (
                            <span key={idx} className="text-xs text-muted-foreground px-0.5">
                              or
                            </span>
                          ) : (
                            <kbd className={styles.kbdBadge} key={idx}>
                              {k}
                            </kbd>
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
