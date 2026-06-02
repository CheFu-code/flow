import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginClient } from '@/components/auth/LoginClient';

export const metadata: Metadata = {
  title: 'Access key | Flow Mail',
  description: 'Enter a registered Flow access key.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
