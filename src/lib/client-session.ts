'use client';

import { apiUrl } from '@/lib/api';

export async function clearSessionCookie() {
  await fetch(apiUrl('/auth/session'), {
    method: 'DELETE',
    credentials: 'include',
  });
}
