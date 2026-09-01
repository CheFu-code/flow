'use client';

import { Loader2, Menu, Settings } from 'lucide-react';
import type { RefObject } from 'react';
import { FlowMark } from '@/components/brand/FlowMark';
import { AccountMenu } from '@/components/flow-console/modals/AccountMenu';
import { HeaderPanels } from './HeaderPanels';
import { HeaderSearch } from './HeaderSearch';
import type { ConnectionStatus } from '@/hooks/useMailbox';
import type { AccessSession } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

export interface FlowHeaderProps {
  accessSession: AccessSession;
  accountMenuRef: RefObject<HTMLDivElement | null>;
  accountOpen: boolean;
  activePanel: 'settings' | null;
  connectionStatus?: ConnectionStatus;
  onLock: () => Promise<void>;
  onOpenManageSenders: () => void;
  onQueryChange: (query: string) => void;
  onSetDensity: (density: 'comfortable' | 'compact') => void;
  onToggleAccount: () => void;
  onTogglePanel: (panel: 'settings') => void;
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
  onOpenManageSenders,
  onQueryChange,
  onSetDensity,
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
        <span className={styles.brandText}>Flow</span>
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

        <HeaderPanels
          activePanel={activePanel}
          onClosePanel={() => onTogglePanel('settings')}
          onOpenManageSenders={onOpenManageSenders}
          onSetDensity={onSetDensity}
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
