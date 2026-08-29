import { Suspense } from 'react';
import Image from 'next/image';

import LoginForm from '@/app/ui/login-form';

export const metadata = { title: 'Entrar' };

/**
 * Sign in.
 *
 * A single centred card on the panel's own canvas. The brand block above the
 * form used to be a 144px green slab holding an 88px logo — the same oversized
 * mark the sidebar carried — which on a phone pushed the password field below
 * the fold. The mark sits at its real size now, above the form, with the shop's
 * name in text.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image
            src="/amor-amar-logo.png"
            alt=""
            width={48}
            height={48}
            priority
            className="object-contain"
          />
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink">
              Amor a Mar
            </h1>
            <p className="text-sm text-ink-muted">Panel de administración</p>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-5">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
