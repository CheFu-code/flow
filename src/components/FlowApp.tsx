'use client';

import { AuthGate } from '@/components/auth/AuthGate';
import FlowConsole from '@/components/FlowConsole';

export function FlowApp() {
  return (
    <AuthGate>
      {({ onSignOut, user }) => (
        <FlowConsole authUser={user} onSignOut={onSignOut} />
      )}
    </AuthGate>
  );
}
