'use client';

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  type Auth,
} from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { friendlyAuthError } from '@/components/auth/auth-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { syncSessionCookie } from '@/lib/client-session';
import { getFirebaseAuth } from '@/lib/firebase';

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const next = searchParams.get('next') || '/';
    return next.startsWith('/') ? next : '/';
  }, [searchParams]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [emailPending, startEmailTransition] = useTransition();
  const [googlePending, startGoogleTransition] = useTransition();
  const [resetPending, startResetTransition] = useTransition();

  useEffect(() => {
    let currentAuth: Auth;

    try {
      currentAuth = getFirebaseAuth();
    } catch (nextError) {
      queueMicrotask(() => {
        setError(friendlyAuthError(nextError));
        setCheckingSession(false);
      });
      return undefined;
    }

    return onAuthStateChanged(currentAuth, nextUser => {
      if (!nextUser) {
        setCheckingSession(false);
        return;
      }

      syncSessionCookie()
        .then(() => {
          router.replace(nextPath);
          router.refresh();
        })
        .catch(nextError => {
          setError(friendlyAuthError(nextError));
          setCheckingSession(false);
        });
    });
  }, [nextPath, router]);

  const completeSignIn = async () => {
    await syncSessionCookie();
    router.replace(nextPath);
    router.refresh();
  };

  const handleEmailSignIn = () => {
    setError(null);
    setResetSent(false);

    startEmailTransition(async () => {
      try {
        const currentAuth = getFirebaseAuth();
        await signInWithEmailAndPassword(currentAuth, email.trim(), password);
        await completeSignIn();
      } catch (nextError) {
        setError(friendlyAuthError(nextError));
      }
    });
  };

  const handleGoogleSignIn = () => {
    setError(null);
    setResetSent(false);

    startGoogleTransition(async () => {
      try {
        const currentAuth = getFirebaseAuth();
        await signInWithPopup(currentAuth, new GoogleAuthProvider());
        await completeSignIn();
        setEmail('');
        setPassword('');
        router.replace(nextPath);
        router.refresh();
      } catch (nextError) {
        setError(friendlyAuthError(nextError));
      }
    });
  };

  const handlePasswordReset = () => {
    const resetEmail = email.trim();
    setError(null);
    setResetSent(false);

    if (!resetEmail) {
      setError('Enter your email address first.');
      return;
    }

    startResetTransition(async () => {
      try {
        const currentAuth = getFirebaseAuth();
        await sendPasswordResetEmail(currentAuth, resetEmail);
        setResetSent(true);
      } catch (nextError) {
        setError(friendlyAuthError(nextError));
      }
    });
  };

  const anyPending = checkingSession || emailPending || googlePending || resetPending;

  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="Flow Mail sign in">
        <div className="login-story">
          <div className="login-brand-row">
            <div>
              <h1>Secure mail operations</h1>
            </div>
          </div>
          <p>
            Sign in with your CheFu account to manage inboxes, recipients, and
            outbound campaigns from one protected console.
          </p>
        </div>

        <Card className="login-card">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Continue to Flow Mail with your CheFu account.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {checkingSession ? (
              <Alert className="auth-alert">
                <Loader2 className="size-4 animate-spin" />
                <AlertDescription>Checking your current session...</AlertDescription>
              </Alert>
            ) : null}

            {error ? (
              <Alert variant="destructive" className="auth-alert">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {resetSent ? (
              <Alert className="auth-alert">
                <CheckCircle2 className="size-4" />
                <AlertDescription>
                  Password reset link sent. Check your inbox.
                </AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="auth-google"
              disabled={anyPending}
              onClick={handleGoogleSignIn}
            >
              {googlePending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <p>Continue with Google</p>
              )}
            </Button>

            <div className="auth-divider">
              <span>Or continue with email</span>
            </div>

            <form
              className="auth-form"
              onSubmit={event => {
                event.preventDefault();
                handleEmailSignIn();
              }}
            >
              <div className="field">
                <Label htmlFor="flow-auth-email">Email</Label>
                <Input
                  id="flow-auth-email"
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.currentTarget.value)}
                  autoComplete="email"
                  placeholder="you@chefuinc.com"
                />
              </div>

              <div className="field">
                <div className="auth-password-row">
                  <Label htmlFor="flow-auth-password">Password</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={resetPending || !email.trim()}
                    onClick={handlePasswordReset}
                  >
                    {resetPending ? 'Sending...' : 'Forgot password?'}
                  </Button>
                </div>
                <Input
                  id="flow-auth-password"
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.currentTarget.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
              </div>

              <Button
                type="submit"
                disabled={anyPending || !email.trim() || !password}
              >
                {emailPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
