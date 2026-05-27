'use client';

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
import {
  appReturnTo,
  chefuLoginUrl,
  chefuLogoutUrl,
  getChefuSessionUser,
  type ChefuSessionUser,
} from '@/lib/chefu-account';
import { clearSessionCookie } from '@/lib/client-session';
import styles from './AuthGate.module.css';

type AuthGateProps = {
  children: (props: {
    user: ChefuSessionUser;
    onSignOut: () => Promise<void>;
  }) => ReactNode;
};

type GateState =
  | { status: 'checking'; user: null; message: string }
  | { status: 'ready'; user: ChefuSessionUser; message: null }
  | { status: 'error'; user: null; message: string };

export function AuthGate({ children }: AuthGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const returnTo = useMemo(() => appReturnTo(pathname || '/'), [pathname]);
  const loginUrl = useMemo(() => chefuLoginUrl(returnTo), [returnTo]);
  const [gateState, setGateState] = useState<GateState>({
    message: 'Opening secure workspace...',
    status: 'checking',
    user: null,
  });

  useEffect(() => {
    let active = true;

    getChefuSessionUser()
      .then(user => {
        if (!active) return;
        setGateState({ message: null, status: 'ready', user });
      })
      .catch(error => {
        if (!active) return;
        setGateState({
          message:
            error instanceof Error ? error.message : 'Authentication required.',
          status: 'checking',
          user: null,
        });
        window.location.replace(loginUrl);
      });

    return () => {
      active = false;
    };
  }, [loginUrl]);

  const handleSignOut = useCallback(async () => {
    await clearSessionCookie();
    window.location.assign(chefuLogoutUrl(appReturnTo('/login')));
  }, []);

  const handleRetrySignIn = useCallback(async () => {
    await clearSessionCookie();
    window.location.assign(loginUrl);
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
