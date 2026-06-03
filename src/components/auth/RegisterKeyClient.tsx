'use client';

import {
  AlertCircle,
  BadgeCheck,
  KeyRound,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { FlowMark } from '@/components/brand/FlowMark';
import { apiUrl } from '@/lib/api';
import styles from './RegisterKeyClient.module.css';

type ActivateResponse = {
  error?: string;
  expiresAt?: string;
  granted?: boolean;
  keyLabel?: string;
};

export function RegisterKeyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const value = searchParams.get('next') || '/';
    return value.startsWith('/') ? value : '/';
  }, [searchParams]);
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitActivation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(apiUrl('/flow/access/activate'), {
        body: JSON.stringify({ accessKey }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data = (await response.json()) as ActivateResponse;

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
      <section className={styles.panel} aria-label="Activate Flow key">
        <div className={styles.identity}>
          <FlowMark className={styles.brandMark} size="lg" />
          <div>
            <span>Flow Mail</span>
            <h1>Activate access key</h1>
          </div>
        </div>

        <form className={styles.form} onSubmit={submitActivation}>
          <label className={styles.field}>
            <span>Company-issued access key</span>
            <div className={styles.keyInput}>
              <KeyRound size={18} />
              <input
                autoComplete="one-time-code"
                autoFocus
                disabled={isSubmitting}
                inputMode="text"
                onChange={event => setAccessKey(event.target.value)}
                placeholder="FLOW-XXXX-XXXX-XXXX"
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
            disabled={isSubmitting || !accessKey.trim()}
            type="submit"
          >
            {isSubmitting ? (
              <Loader2 className={styles.spin} size={18} />
            ) : (
              <BadgeCheck size={18} />
            )}
            {isSubmitting ? 'Activating...' : 'Activate key'}
          </button>
        </form>

        <div className={styles.footerRow}>
          <span>Already activated?</span>
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>
            Enter access key
          </Link>
        </div>
      </section>
    </main>
  );
}
