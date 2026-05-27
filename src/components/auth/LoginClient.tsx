'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { chefuLoginUrl, chefuRegisterUrl, appReturnTo } from '@/lib/chefu-account';

export function LoginClient() {
  const searchParams = useSearchParams();
  const returnTo = useMemo(() => {
    const next = searchParams.get('next') || '/';
    return appReturnTo(next.startsWith('/') ? next : '/');
  }, [searchParams]);

  const loginUrl = useMemo(() => chefuLoginUrl(returnTo), [returnTo]);
  const registerUrl = useMemo(() => chefuRegisterUrl(returnTo), [returnTo]);

  useEffect(() => {
    window.location.replace(loginUrl);
  }, [loginUrl]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl">
        <div className="mx-auto grid size-12 place-items-center rounded-lg bg-white text-slate-950">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Opening CheFu Account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Flow Mail now uses the shared CheFu sign-in screen.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Redirecting...
        </div>
        <div className="mt-6 flex justify-center gap-4 text-sm">
          <a className="font-medium text-cyan-300 hover:text-cyan-200" href={loginUrl}>
            Sign in
          </a>
          <a className="font-medium text-cyan-300 hover:text-cyan-200" href={registerUrl}>
            Create account
          </a>
        </div>
      </section>
    </main>
  );
}
