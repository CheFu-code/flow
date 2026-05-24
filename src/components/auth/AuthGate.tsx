'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AlertCircle, Loader2, LogIn, ShieldCheck } from 'lucide-react';
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
import { friendlyAuthError } from '@/components/auth/auth-errors';
import { clearSessionCookie, syncSessionCookie } from '@/lib/client-session';
import { auth } from '@/lib/firebase';
import styles from './AuthGate.module.css';

type AuthGateProps = {
  children: (props: { user: User; onSignOut: () => Promise<void> }) => ReactNode;
};

type GateState =
  | { status: 'checking'; user: null; message: string }
  | { status: 'ready'; user: User; message: null }
  | { status: 'error'; user: null; message: string };

export function AuthGate({ children }: AuthGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const loginUrl = useMemo(
    () => `/login?next=${encodeURIComponent(pathname || '/')}`,
    [pathname],
  );
  const [gateState, setGateState] = useState<GateState>({
    message: 'Opening secure workspace...',
    status: 'checking',
    user: null,
  });

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, nextUser => {
      if (!nextUser) {
        if (active) {
          setGateState({
            message: 'Redirecting to sign in...',
            status: 'checking',
            user: null,
          });
        }
        router.replace(loginUrl);
        return;
      }

      setGateState({
        message: 'Verifying your session...',
        status: 'checking',
        user: null,
      });

      syncSessionCookie()
        .then(() => {
          if (!active) return;
          setGateState({ message: null, status: 'ready', user: nextUser });
        })
        .catch(error => {
          if (!active) return;
          setGateState({
            message: friendlyAuthError(error),
            status: 'error',
            user: null,
          });
        });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [loginUrl, router]);

  const handleSignOut = useCallback(async () => {
    await Promise.allSettled([clearSessionCookie(), signOut(auth)]);
    router.replace('/login');
    router.refresh();
  }, [router]);

  const handleRetrySignIn = useCallback(async () => {
    await Promise.allSettled([clearSessionCookie(), signOut(auth)]);
    router.replace(loginUrl);
    router.refresh();
  }, [loginUrl, router]);

  if (gateState.status === 'checking') {
    return (
      <main className={styles.shell}>
        <Card className={styles.card} size="sm">
          <CardContent className={styles.loadingContent}>
            <div className={styles.brandMark} aria-hidden="true">
              <ShieldCheck className="size-5" />
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
            <CardTitle>Session needs attention</CardTitle>
            <CardDescription>
              Flow could not open a secure workspace session.
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
              onClick={handleRetrySignIn}
            >
              <LogIn className="size-4" />
              Sign in again
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return children({
    onSignOut: handleSignOut,
    user: gateState.user,
  });
}
