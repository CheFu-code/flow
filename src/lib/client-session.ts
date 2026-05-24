'use client';

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
