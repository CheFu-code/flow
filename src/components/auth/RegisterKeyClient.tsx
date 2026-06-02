'use client';

import {
  AlertCircle,
  BadgeCheck,
  KeyRound,
  Loader2,
  LockKeyhole,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import styles from './RegisterKeyClient.module.css';

type RegisterResponse = {
  error?: string;
  granted?: boolean;
  keyId?: string;
  keyLabel?: string;
};

function generateAccessKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const characters = Array.from(bytes, byte => alphabet[byte % alphabet.length]);

  return `FLOW-${characters.slice(0, 4).join('')}-${characters
    .slice(4, 8)
    .join('')}-${characters.slice(8, 12).join('')}-${characters
    .slice(12, 16)
    .join('')}`;
}

export function RegisterKeyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const value = searchParams.get('next') || '/';
    return value.startsWith('/') ? value : '/';
  }, [searchParams]);
  const [accessKey, setAccessKey] = useState('');
  const [employeeLabel, setEmployeeLabel] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationCode, setRegistrationCode] = useState('');
  const [successLabel, setSuccessLabel] = useState('');

  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessLabel('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/flow-access/register', {
        body: JSON.stringify({
          accessKey,
          label: employeeLabel,
          registrationCode,
        }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data = (await response.json()) as RegisterResponse;

      if (!response.ok || !data.granted) {
        throw new Error(data.error || 'Flow key registration failed.');
      }

      setSuccessLabel(data.keyLabel || employeeLabel);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Flow key registration failed.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-label="Register Flow key">
        <div className={styles.identity}>
          <span className={styles.brandMark} aria-hidden="true">
            <LockKeyhole size={26} />
          </span>
          <div>
            <span>Flow Mail</span>
            <h1>Register access key</h1>
          </div>
        </div>

        <form className={styles.form} onSubmit={submitRegistration}>
          <label className={styles.field}>
            <span>Employee or workspace label</span>
            <input
              autoComplete="organization-title"
              disabled={isSubmitting || Boolean(successLabel)}
              onChange={event => setEmployeeLabel(event.target.value)}
              placeholder="Marketing team"
              value={employeeLabel}
            />
          </label>

          <label className={styles.field}>
            <span>Flow access key</span>
            <div className={styles.keyInput}>
              <KeyRound size={18} />
              <input
                autoComplete="off"
                disabled={isSubmitting || Boolean(successLabel)}
                onChange={event => setAccessKey(event.target.value)}
                placeholder="FLOW-XXXX-XXXX"
                value={accessKey}
              />
              <button
                disabled={isSubmitting || Boolean(successLabel)}
                onClick={() => setAccessKey(generateAccessKey())}
                type="button"
              >
                <Sparkles size={16} />
                Generate
              </button>
            </div>
          </label>

          <label className={styles.field}>
            <span>Company registration code</span>
            <input
              autoComplete="one-time-code"
              disabled={isSubmitting || Boolean(successLabel)}
              onChange={event => setRegistrationCode(event.target.value)}
              placeholder="Registration code"
              type="password"
              value={registrationCode}
            />
          </label>

          {error ? (
            <p className={styles.error}>
              <AlertCircle size={16} />
              {error}
            </p>
          ) : null}

          {successLabel ? (
            <div className={styles.success}>
              <BadgeCheck size={18} />
              <span>{successLabel} can now unlock Flow Mail.</span>
            </div>
          ) : null}

          {successLabel ? (
            <button
              className={styles.submitButton}
              onClick={() => {
                router.replace(nextPath);
                router.refresh();
              }}
              type="button"
            >
              <BadgeCheck size={18} />
              Open Flow
            </button>
          ) : (
            <button
              className={styles.submitButton}
              disabled={
                isSubmitting ||
                !employeeLabel.trim() ||
                !accessKey.trim() ||
                !registrationCode.trim()
              }
              type="submit"
            >
              {isSubmitting ? (
                <Loader2 className={styles.spin} size={18} />
              ) : (
                <BadgeCheck size={18} />
              )}
              {isSubmitting ? 'Registering...' : 'Register key'}
            </button>
          )}
        </form>

        <div className={styles.footerRow}>
          <span>Already registered?</span>
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>
            Enter access key
          </Link>
        </div>
      </section>
    </main>
  );
}
