import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterKeyClient } from '@/components/auth/RegisterKeyClient';

export const metadata: Metadata = {
  title: 'Register key | Flow Mail',
  description: 'Register an employee Flow access key.',
};

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterKeyClient />
    </Suspense>
  );
}
