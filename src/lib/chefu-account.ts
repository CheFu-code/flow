import { apiUrl } from '@/lib/api';

export type ChefuSessionUser = {
  uid: string;
  email: string;
  roles: string[];
  displayName?: string | null;
  photoURL?: string | null;
};

const CHEFU_ACCOUNT_URL =
  process.env.NEXT_PUBLIC_CHEFU_ACCOUNT_URL || 'https://chefuinc.com';
const FLOW_APP_URL =
  process.env.NEXT_PUBLIC_FLOW_APP_URL || 'https://flow.chefuinc.com';

function accountUrl(
  path: '/login' | '/register' | '/logout' | '/account',
  returnTo: string,
) {
  const url = new URL(path, CHEFU_ACCOUNT_URL);
  url.searchParams.set('app', 'flow');
  url.searchParams.set('returnTo', returnTo);
  return url.toString();
}

export function appReturnTo(path = '/') {
  const base = FLOW_APP_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : '/';
  return `${base}${normalizedPath}`;
}

export function chefuLoginUrl(returnTo = appReturnTo('/')) {
  return accountUrl('/login', returnTo);
}

export function chefuRegisterUrl(returnTo = appReturnTo('/')) {
  return accountUrl('/register', returnTo);
}

export function chefuLogoutUrl(returnTo = appReturnTo('/')) {
  return accountUrl('/logout', returnTo);
}

export function chefuManageAccountUrl(returnTo = appReturnTo('/')) {
  return accountUrl('/account', returnTo);
}

export async function getChefuSessionUser() {
  const response = await fetch(apiUrl('/auth/me'), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Authentication required.');
  }

  const data = (await response.json()) as { user?: ChefuSessionUser };
  if (!data.user?.email) {
    throw new Error('Authentication required.');
  }

  return {
    ...data.user,
    displayName: data.user.displayName || data.user.email.split('@')[0],
    photoURL: data.user.photoURL || null,
  };
}
