import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginClient } from '@/components/auth/LoginClient';

export const metadata: Metadata = {
  title: 'Sign in | Flow Mail',
  description: 'Sign in to the CheFu Flow Mail console.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
