'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { clearSessionCookie, syncSessionCookie } from '@/lib/client-session';
import { auth } from '@/lib/firebase';

type AuthGateProps = {
  children: (props: { user: User; onSignOut: () => Promise<void> }) => ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, nextUser => {
      setUser(nextUser);

      if (!nextUser) {
        setSessionReady(true);
        router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`);
        return;
      }

      syncSessionCookie()
        .then(() => setSessionReady(true))
        .catch(() => {
          setSessionReady(true);
          router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`);
        });
    });
  }, [pathname, router]);

  const handleSignOut = async () => {
    await Promise.allSettled([clearSessionCookie(), signOut(auth)]);
    router.replace('/login');
    router.refresh();
  };

  if (!user || !sessionReady) {
    return (
      <main className="auth-shell">
        <Card className="auth-card" size="sm">
          <CardContent className="auth-loading">
            <Loader2 className="size-5 animate-spin" />
            <span>Opening secure workspace...</span>
          </CardContent>
        </Card>
      </main>
    );
  }

  return children({
    onSignOut: handleSignOut,
    user,
  });
}
