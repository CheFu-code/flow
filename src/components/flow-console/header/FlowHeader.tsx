'use client';

import { Keyboard, Loader2, Menu, Settings } from 'lucide-react';
import type { RefObject } from 'react';
import { FlowMark } from '@/components/brand/FlowMark';
import { Badge } from '@/components/ui/badge';
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
  onOpenShortcutsModal?: () => void;
  onQueryChange: (query: string) => void;
  onReconnect?: () => void;
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
  onOpenShortcutsModal,
  onQueryChange,
  onReconnect,
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

        <Badge
          aria-label={`Connection status: ${connectionStatus}`}
          className={`gap-1.5 px-2 py-0.5 text-[11px] font-medium transition-all ${
            connectionStatus === 'offline' ? 'cursor-pointer hover:opacity-80' : ''
          }`}
          onClick={connectionStatus === 'offline' ? onReconnect : undefined}
          title={
            connectionStatus === 'live'
              ? 'Real-time synchronization active'
              : connectionStatus === 'syncing'
                ? 'Synchronizing changes with server...'
                : 'Offline - click to reconnect'
          }
          variant={
            connectionStatus === 'live'
              ? 'success'
              : connectionStatus === 'syncing'
                ? 'warning'
                : 'secondary'
          }
        >
          {connectionStatus === 'syncing' ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <span
              className={`size-1.5 rounded-full ${
                connectionStatus === 'live'
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-muted-foreground'
              }`}
            />
          )}
          <span>
            {connectionStatus === 'live'
              ? 'Live'
              : connectionStatus === 'syncing'
                ? 'Syncing'
                : 'Offline (retry)'}
          </span>
        </Badge>
      </div>

      <HeaderSearch onQueryChange={onQueryChange} query={query} />

      <div aria-label="Header actions" className={styles.headerActions}>
        <button
          aria-label="Keyboard shortcuts (?)"
          className={styles.iconButton}
          data-tooltip="Keyboard shortcuts (?)"
          onClick={onOpenShortcutsModal}
          type="button"
        >
          <Keyboard size={20} />
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
