'use client';

import { Clock3, KeyRound, LogOut, ShieldCheck, UserCircle } from 'lucide-react';
import { formatSessionExpiry, getInitial } from '@/lib/flow-console/format';
import type { AccessSession } from '@/lib/flow-console/types';
import type { RefObject } from 'react';
import styles from '@/components/FlowConsole.module.css';

export type AccountMenuProps = {
  isOpen: boolean;
  onToggle: () => void;
  onLock: () => Promise<void>;
  session: AccessSession;
  containerRef?: RefObject<HTMLDivElement | null>;
};

function accessLabel(permission: AccessSession['permission']) {
  return permission === 'full'
    ? 'Full access'
    : `${permission[0].toUpperCase()}${permission.slice(1)} access`;
}

export function AccountMenu({
  containerRef,
  isOpen,
  onLock,
  onToggle,
  session,
}: AccountMenuProps) {
  const initial = getInitial(session.keyLabel);
  const expiry = formatSessionExpiry(session.expiresAt);

  return (
    <div className={styles.accountWrap} ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-label="Account details"
        className={styles.accountButton}
        data-tooltip="Account"
        onClick={onToggle}
        type="button"
      >
        <span aria-hidden="true">{initial}</span>
        <UserCircle size={25} />
      </button>

      {isOpen ? (
        <section className={styles.accountMenu} aria-label="Account details">
          <div className={styles.accountSummary}>
            <span className={styles.accountAvatar} aria-hidden="true">
              {initial}
            </span>
            <div>
              <strong>{session.keyLabel}</strong>
              <span>Registered Flow access key</span>
            </div>
          </div>

          <div className={styles.accountDetail}>
            <KeyRound size={16} />
            <div>
              <span>Authenticated as</span>
              <strong>{session.keyLabel}</strong>
            </div>
          </div>
          <div className={styles.accountDetail}>
            <Clock3 size={16} />
            <div>
              <span>Session expires</span>
              <strong>{expiry}</strong>
            </div>
          </div>
          <div className={styles.accountDetail}>
            <ShieldCheck size={16} />
            <div>
              <span>Access level</span>
              <strong>{accessLabel(session.permission)}</strong>
            </div>
          </div>

          <button
            className={styles.lockButton}
            onClick={() => void onLock()}
            type="button"
          >
            <LogOut size={16} />
            Lock Flow
          </button>
        </section>
      ) : null}
    </div>
  );
}
