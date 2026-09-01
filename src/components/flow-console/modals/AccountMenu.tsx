'use client';

import { Clock3, KeyRound, LogOut, ShieldCheck, UserCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
        <section
          aria-label="Account details"
          className="absolute right-0 top-[calc(100%+8px)] z-50 flex w-72 flex-col gap-3.5 rounded-2xl border bg-card p-4 text-card-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="flex items-center gap-3 border-b pb-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-600 font-bold text-white text-sm">
              {initial}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <strong className="truncate text-sm font-semibold text-foreground">
                {session.keyLabel}
              </strong>
              <span className="truncate text-xs text-muted-foreground">
                Active access key
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <KeyRound className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-1 items-center justify-between">
                <span>Key:</span>
                <span className="truncate font-mono font-medium text-foreground max-w-[130px]">
                  {session.keyLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Clock3 className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex items-center justify-between flex-1">
                <span>Expires:</span>
                <span className="font-medium text-foreground">{expiry}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex items-center justify-between flex-1">
                <span>Level:</span>
                <Badge variant="brand" className="text-[10px] px-1.5 py-0 font-medium">
                  {accessLabel(session.permission)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="pt-1 border-t border-border/60">
            <Button
              className="w-full justify-center text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void onLock()}
              size="sm"
              type="button"
              variant="outline"
            >
              <LogOut className="size-3.5 mr-1.5" />
              Lock Flow
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
