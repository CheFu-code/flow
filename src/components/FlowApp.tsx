'use client';

import { AuthGate } from '@/components/auth/AuthGate';
import FlowConsole from '@/components/FlowConsole';

export function FlowApp() {
  return (
    <AuthGate>
      {({ onLock, session }) => (
        <FlowConsole accessSession={session} onLock={onLock} />
      )}
    </AuthGate>
  );
}
