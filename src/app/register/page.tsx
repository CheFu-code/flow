import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterKeyClient } from '@/components/auth/RegisterKeyClient';

export const metadata: Metadata = {
  title: 'Activate key | Flow Mail',
  description: 'Activate a company-issued Flow access key.',
};

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterKeyClient />
    </Suspense>
  );
}
