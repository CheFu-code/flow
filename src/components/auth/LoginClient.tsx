'use client';

import { AlertCircle, KeyRound, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '@/lib/api';
import styles from './LoginClient.module.css';

type FlowAccessResponse = {
  error?: string;
  expiresAt?: string;
  granted: boolean;
  keyLabel?: string;
};

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextPath = useMemo(() => {
    const value = searchParams.get('next') || '/';
    return value.startsWith('/') ? value : '/';
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    fetch(apiUrl('/flow/access/session'), {
      cache: 'no-store',
      credentials: 'include',
    })
      .then(response => response.json())
      .then((session: FlowAccessResponse) => {
        if (!active) return;

        if (session.granted) {
          router.replace(nextPath);
          return;
        }

        setIsCheckingSession(false);
      })
      .catch(() => {
        if (active) setIsCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [nextPath, router]);

  const submitAccessKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(apiUrl('/flow/access/login'), {
        body: JSON.stringify({ code: accessKey }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data = (await response.json()) as FlowAccessResponse;

      if (!response.ok || !data.granted) {
        throw new Error(data.error || 'That Flow key is not active.');
      }

      router.replace(nextPath);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'That Flow key is not active.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-label="Flow access">
        <div className={styles.identity}>
          <span className={styles.brandMark} aria-hidden="true">
            <LockKeyhole size={26} />
          </span>
          <div>
            <span>Flow Mail</span>
            <h1>Employee access</h1>
          </div>
        </div>

        <form className={styles.form} onSubmit={submitAccessKey}>
          <label className={styles.keyField}>
            <span>Registered access key</span>
            <div>
              <KeyRound size={18} />
              <input
                autoComplete="one-time-code"
                autoFocus
                disabled={isCheckingSession || isSubmitting}
                inputMode="text"
                onChange={event => setAccessKey(event.target.value)}
                placeholder="FLOW-XXXX-XXXX"
                type="password"
                value={accessKey}
              />
            </div>
          </label>

          {error ? (
            <p className={styles.error}>
              <AlertCircle size={16} />
              {error}
            </p>
          ) : null}

          <button
            className={styles.submitButton}
            disabled={isCheckingSession || isSubmitting || !accessKey.trim()}
            type="submit"
          >
            {isCheckingSession || isSubmitting ? (
              <Loader2 className={styles.spin} size={18} />
            ) : (
              <ShieldCheck size={18} />
            )}
            {isCheckingSession
              ? 'Checking session...'
              : isSubmitting
                ? 'Verifying...'
                : 'Unlock Flow'}
          </button>
        </form>

        <p className={styles.note}>
          Use the Flow key assigned to your employee workspace.
        </p>

        <div className={styles.footerRow}>
          <span>Need a key?</span>
          <Link href={`/register?next=${encodeURIComponent(nextPath)}`}>
            Activate company key
          </Link>
        </div>
      </section>
    </main>
  );
}
