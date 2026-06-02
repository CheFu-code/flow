'use client';

import { AlertCircle, KeyRound, Loader2, LogIn } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import styles from './AuthGate.module.css';

type AuthGateProps = {
  children: (props: {
    onLock: () => Promise<void>;
    session: AuthenticatedFlowSession;
  }) => ReactNode;
};

type FlowAccessSession =
  | { granted: true; expiresAt: string; keyLabel: string }
  | { granted: false; expiresAt?: never; keyLabel?: never };

type AuthenticatedFlowSession = Extract<FlowAccessSession, { granted: true }>;

type GateState =
  | { message: string; status: 'checking' }
  | { message: null; session: AuthenticatedFlowSession; status: 'ready' }
  | { message: string; status: 'error' };

export function AuthGate({ children }: AuthGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const nextPath = useMemo(() => pathname || '/', [pathname]);
  const [gateState, setGateState] = useState<GateState>({
    message: 'Checking Flow access key...',
    status: 'checking',
  });

  useEffect(() => {
    let active = true;

    fetch('/api/flow-access', {
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
    await fetch('/api/flow-access', {
      credentials: 'include',
      method: 'DELETE',
    });
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    router.refresh();
  }, [nextPath, router]);

  if (gateState.status === 'checking') {
    return (
      <main className={styles.shell}>
        <Card className={styles.card} size="sm">
          <CardContent className={styles.loadingContent}>
            <div className={styles.brandMark} aria-hidden="true">
              <KeyRound className="size-5" />
            </div>
            <div className={styles.copy}>
              <h1>Securing Flow</h1>
              <p>{gateState.message}</p>
            </div>
            <Loader2 className={styles.loader} aria-hidden="true" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (gateState.status === 'error') {
    return (
      <main className={styles.shell}>
        <Card className={styles.card} size="sm">
          <CardHeader className={styles.header}>
            <div className={styles.errorMark} aria-hidden="true">
              <AlertCircle className="size-5" />
            </div>
            <CardTitle>Access needs attention</CardTitle>
            <CardDescription>
              Flow could not confirm a registered employee key.
            </CardDescription>
          </CardHeader>
          <CardContent className={styles.errorContent}>
            <Alert className={styles.alert} variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{gateState.message}</AlertDescription>
            </Alert>
            <Button
              type="button"
              className={styles.retryButton}
              onClick={handleEnterKey}
            >
              <LogIn className="size-4" />
              Enter access key
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return children({
    onLock: handleLock,
    session: gateState.session,
  });
}
