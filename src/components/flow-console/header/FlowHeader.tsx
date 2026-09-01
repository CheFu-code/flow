'use client';

import { CircleHelp, Grid3X3, Loader2, Menu, Settings } from 'lucide-react';
import type { RefObject } from 'react';
import { FlowMark } from '@/components/brand/FlowMark';
import { AccountMenu } from '@/components/flow-console/modals/AccountMenu';
import { HeaderPanels } from './HeaderPanels';
import { HeaderSearch } from './HeaderSearch';
import type { ConnectionStatus } from '@/hooks/useMailbox';
import type { AccessSession, MailFolder } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export interface FlowHeaderProps {
  accessSession: AccessSession;
  accountMenuRef: RefObject<HTMLDivElement | null>;
  accountOpen: boolean;
  activePanel: 'apps' | 'help' | 'settings' | null;
  connectionStatus?: ConnectionStatus;
  onLock: () => Promise<void>;
  onNavigateFolder: (folder: MailFolder) => void;
  onOpenAccount: () => void;
  onOpenCompose: () => void;
  onOpenManageSenders: () => void;
  onQueryChange: (query: string) => void;
  onResetSearch: () => void;
  onSetDensity: (density: 'comfortable' | 'compact') => void;
  onShowSidebar: () => void;
  onToggleAccount: () => void;
  onTogglePanel: (panel: 'apps' | 'help' | 'settings') => void;
  onToggleSidebar: () => void;
  query: string;
  sidebarOpen: boolean;
  onToggleFormatToolbar: () => void;
}

export function FlowHeader({
  accessSession,
  accountMenuRef,
  accountOpen,
  activePanel,
  connectionStatus = 'live',
  onLock,
  onNavigateFolder,
  onOpenAccount,
  onOpenCompose,
  onOpenManageSenders,
  onQueryChange,
  onResetSearch,
  onSetDensity,
  onShowSidebar,
  onToggleAccount,
  onTogglePanel,
  onToggleSidebar,
  query,
  sidebarOpen,
  onToggleFormatToolbar,
}: FlowHeaderProps) {
  return (
    <header className={styles.header}>
      <button
        aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        className={styles.iconButton}
        data-tooltip={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        onClick={onToggleSidebar}
        type="button"
      >
        <Menu size={22} />
      </button>

      <div aria-label="Flow Mail" className={styles.brand}>
        <FlowMark className={styles.brandMark} size="sm" />
        <span className={styles.brandText}>Flow Mail</span>
        <div
          aria-label={`Connection status: ${connectionStatus}`}
          className={`${styles.liveIndicator} ${
            connectionStatus === 'syncing'
              ? styles.liveIndicatorSyncing
              : connectionStatus === 'offline'
                ? styles.liveIndicatorOffline
                : styles.liveIndicatorLive
          }`}
          title={
            connectionStatus === 'live'
              ? 'Real-time synchronization active'
              : connectionStatus === 'syncing'
                ? 'Synchronizing changes with server...'
                : 'Offline - showing cached data'
          }
        >
          {connectionStatus === 'syncing' ? (
            <Loader2 className={styles.spin} size={11} />
          ) : (
            <span className={styles.liveDot} />
          )}
          <span className={styles.liveText}>
            {connectionStatus === 'live'
              ? 'Live'
              : connectionStatus === 'syncing'
                ? 'Syncing'
                : 'Offline'}
          </span>
        </div>
      </div>

      <HeaderSearch onQueryChange={onQueryChange} query={query} />

      <div aria-label="Header actions" className={styles.headerActions}>
        <button
          aria-expanded={activePanel === 'help'}
          aria-label="Help &amp; Shortcuts"
          className={
            activePanel === 'help'
              ? `${styles.iconButton} ${styles.headerActionActive}`
              : styles.iconButton
          }
          data-tooltip="Help"
          onClick={() => onTogglePanel('help')}
          type="button"
        >
          <CircleHelp size={21} />
        </button>

        <button
          aria-expanded={activePanel === 'settings'}
          aria-label="Settings"
          className={
            activePanel === 'settings'
              ? `${styles.iconButton} ${styles.headerActionActive}`
              : styles.iconButton
          }
          data-tooltip="Settings"
          onClick={() => onTogglePanel('settings')}
          type="button"
        >
          <Settings size={21} />
        </button>

        <button
          aria-expanded={activePanel === 'apps'}
          aria-label="Apps"
          className={
            activePanel === 'apps'
              ? `${styles.iconButton} ${styles.headerActionActive}`
              : styles.iconButton
          }
          data-tooltip="Apps"
          onClick={() => onTogglePanel('apps')}
          type="button"
        >
          <Grid3X3 size={21} />
        </button>

        <HeaderPanels
          activePanel={activePanel}
          onClosePanel={() => onTogglePanel(activePanel as any)}
          onNavigateFolder={onNavigateFolder}
          onOpenAccount={onOpenAccount}
          onOpenCompose={onOpenCompose}
          onOpenManageSenders={onOpenManageSenders}
          onResetSearch={onResetSearch}
          onSetDensity={onSetDensity}
          onShowSidebar={onShowSidebar}
          onToggleFormatToolbar={onToggleFormatToolbar}
        />

        <AccountMenu
          containerRef={accountMenuRef}
          isOpen={accountOpen}
          onLock={onLock}
          onToggle={onToggleAccount}
          session={accessSession}
        />
      </div>
    </header>
  );
}
