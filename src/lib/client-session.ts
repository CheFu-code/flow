'use client';

import { signOut } from 'firebase/auth';
import { apiUrl } from '@/lib/api';
import { getFirebaseAuth } from '@/lib/firebase';

export async function syncSessionCookie() {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    await clearSessionCookie();
    return;
  }

  const idToken = await currentUser.getIdToken(true);
  const response = await fetch(apiUrl('/auth/session'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'x-flow-session': 'true',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      requestId?: string;
    };
    const requestId = data.requestId ? ` Request ID: ${data.requestId}` : '';

    if (response.status === 403) {
      await Promise.allSettled([clearSessionCookie(), signOut(auth)]);
    }

    throw new Error(
      `${data.error || data.message || 'Failed to sync auth session.'}${requestId}`,
    );
  }
}

export async function clearSessionCookie() {
  await fetch(apiUrl('/auth/session'), {
    method: 'DELETE',
    credentials: 'include',
  });
}
