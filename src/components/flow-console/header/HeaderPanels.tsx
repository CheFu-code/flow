'use client';

import {
  AtSign,
  CircleHelp,
  FileText,
  Grid3X3,
  Keyboard,
  Mail,
  Palette,
  RotateCcw,
  Settings,
  Sparkles,
  Star,
  User,
} from 'lucide-react';
import type { MailFolder } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export interface HeaderPanelsProps {
  activePanel: 'apps' | 'help' | 'settings' | null;
  onClosePanel: () => void;
  onOpenCompose: () => void;
  onResetSearch: () => void;
  onShowSidebar: () => void;
  onOpenManageSenders: () => void;
  onSetDensity: (density: 'comfortable' | 'compact') => void;
  onToggleFormatToolbar: () => void;
  onNavigateFolder: (folder: MailFolder) => void;
  onOpenAccount: () => void;
}

export function HeaderPanels({
  activePanel,
  onClosePanel,
  onOpenCompose,
  onResetSearch,
  onShowSidebar,
  onOpenManageSenders,
  onSetDensity,
  onToggleFormatToolbar,
  onNavigateFolder,
  onOpenAccount,
}: HeaderPanelsProps) {
  if (!activePanel) return null;

  return (
    <section
      aria-label={`${activePanel} panel`}
      className={styles.headerPanel}
    >
      {activePanel === 'help' ? (
        <>
          <div className={styles.headerPanelTitle}>
            <CircleHelp size={16} />
            <strong>Flow Shortcuts &amp; Help</strong>
          </div>
          <div className={styles.headerPanelList}>
            <button
              onClick={() => {
                onClosePanel();
                onOpenCompose();
              }}
              type="button"
            >
              <FileText size={15} />
              <span>Compose a new message</span>
              <kbd>C</kbd>
            </button>
            <button
              onClick={() => {
                onClosePanel();
                onResetSearch();
              }}
              type="button"
            >
              <RotateCcw size={15} />
              <span>Reset search query</span>
              <kbd>/</kbd>
            </button>
            <button
              onClick={() => {
                onClosePanel();
                onShowSidebar();
              }}
              type="button"
            >
              <Keyboard size={15} />
              <span>Show mailbox folders</span>
              <kbd>G</kbd>
            </button>
          </div>
        </>
      ) : null}

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

      {activePanel === 'apps' ? (
        <>
          <div className={styles.headerPanelTitle}>
            <Grid3X3 size={16} />
            <strong>Flow Workspace Apps</strong>
          </div>
          <div className={styles.headerPanelList}>
            <button
              onClick={() => {
                onClosePanel();
                onOpenCompose();
              }}
              type="button"
            >
              <Mail size={15} />
              <span>New Message Composer</span>
            </button>
            <button
              onClick={() => {
                onClosePanel();
                onNavigateFolder('starred');
              }}
              type="button"
            >
              <Star size={15} />
              <span>Starred Messages</span>
            </button>
            <button
              onClick={() => {
                onClosePanel();
                onOpenAccount();
              }}
              type="button"
            >
              <User size={15} />
              <span>Account &amp; Security</span>
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
