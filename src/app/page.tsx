import { FlowApp } from '@/components/FlowApp';
import { Suspense } from 'react';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <FlowApp />
    </Suspense>
  );
}
