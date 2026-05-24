export function friendlyAuthError(error: unknown) {
  const code = (error as { code?: string })?.code;

  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/invalid-credential') {
    return 'The email or password is not correct.';
  }
  if (code === 'auth/popup-closed-by-user') return 'Sign-in was cancelled.';
  if (code === 'auth/popup-blocked') {
    return 'Popup blocked. Allow popups and try again.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please try again later.';
  }
  if (code === 'auth/multi-factor-auth-required') {
    return 'This account requires MFA. Sign in through CheFu Academy first.';
  }

  return error instanceof Error ? error.message : 'Authentication failed.';
}
