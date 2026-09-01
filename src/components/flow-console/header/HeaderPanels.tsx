'use client';

import { AtSign, Palette, Settings, Sparkles } from 'lucide-react';
import styles from '@/components/FlowConsole.module.css';

export interface HeaderPanelsProps {
  activePanel: 'settings' | null;
  onClosePanel: () => void;
  onOpenManageSenders: () => void;
  onSetDensity: (density: 'comfortable' | 'compact') => void;
  onToggleFormatToolbar: () => void;
}

export function HeaderPanels({
  activePanel,
  onClosePanel,
  onOpenManageSenders,
  onSetDensity,
  onToggleFormatToolbar,
}: HeaderPanelsProps) {
  if (!activePanel) return null;

  return (
    <section
      aria-label="Settings panel"
      className={styles.headerPanel}
    >
      {activePanel === 'settings' ? (
        <>
          <div className={styles.headerPanelTitle}>
            <Settings size={16} />
            <strong>Preferences &amp; Senders</strong>
          </div>
          <div className={styles.headerPanelList}>
            <button
              onClick={() => {
                onClosePanel();
                onOpenManageSenders();
              }}
              type="button"
            >
              <AtSign size={15} />
              <span>Manage sender addresses (@chefu.co.za)</span>
            </button>
            <button
              onClick={() => {
                onSetDensity('comfortable');
                onClosePanel();
              }}
              type="button"
            >
              <Palette size={15} />
              <span>Comfortable display density</span>
            </button>
            <button
              onClick={() => {
                onSetDensity('compact');
                onClosePanel();
              }}
              type="button"
            >
              <Palette size={15} />
              <span>Compact display density</span>
            </button>
            <button
              onClick={() => {
                onToggleFormatToolbar();
                onClosePanel();
              }}
              type="button"
            >
              <Sparkles size={15} />
              <span>Toggle compose format toolbar</span>
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
