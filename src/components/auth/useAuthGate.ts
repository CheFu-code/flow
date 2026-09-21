'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '@/lib/api';

export type FlowAccessSession =
  | { granted: true; expiresAt: string; keyLabel: string; permission: 'read' | 'write' | 'full' }
  | { granted: false; expiresAt?: never; keyLabel?: never };

export type AuthenticatedFlowSession = Extract<FlowAccessSession, { granted: true }>;

export type AuthGateState =
  | { message: string; status: 'checking' }
  | { message: null; session: AuthenticatedFlowSession; status: 'ready' }
  | { message: string; status: 'error' };

export function useAuthGate() {
  const pathname = usePathname();
  const router = useRouter();
  const nextPath = useMemo(() => pathname || '/', [pathname]);
  const [gateState, setGateState] = useState<AuthGateState>({
    message: 'Checking Flow access key...',
    status: 'checking',
  });

  useEffect(() => {
    let active = true;

    fetch(apiUrl('/flow/access/session'), {
      cache: 'no-store',
      credentials: 'include',
    })
      .then(response => response.json())
      .then((session: FlowAccessSession) => {
        if (!active) return;

        if (session.granted) {
          setGateState({ message: null, session, status: 'ready' });
          return;
        }

        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      })
      .catch(error => {
        if (!active) return;
        setGateState({
          message:
            error instanceof Error
              ? error.message
              : 'Flow access could not be checked.',
          status: 'error',
        });
      });

    return () => {
      active = false;
    };
  }, [nextPath, router]);

  const handleEnterKey = useCallback(() => {
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [nextPath, router]);

  const handleLock = useCallback(async () => {
    await fetch(apiUrl('/flow/access/session'), {
      credentials: 'include',
      method: 'DELETE',
    });
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    router.refresh();
  }, [nextPath, router]);

  return { gateState, handleEnterKey, handleLock };
}
