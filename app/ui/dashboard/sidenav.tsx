import Link from 'next/link';
import { PowerIcon } from '@heroicons/react/24/outline';

import NavLinks from '@/app/ui/dashboard/nav-links';
import Logo from '@/app/ui/logo';
import { signOut } from '@/auth';

/**
 * The panel's persistent navigation.
 *
 * Three things changed and each one bought back screen or attention:
 *
 * 1. **The brand block shrank from 160px to 52px.** A `h-40` green panel
 *    holding a 96px logo was the single largest element in the tool and it
 *    conveyed nothing an operator needs while working. The mark now sits in a
 *    normal header row with the wordmark beside it, which is also where every
 *    other admin tool puts it, so nobody has to learn this one.
 * 2. **The empty spacer div is gone.** `<div className="grow rounded-md
 *    bg-gray-50" />` existed only to push the sign-out button down; a `mt-auto`
 *    on the footer does the same thing without painting a grey rectangle that
 *    looks like a region that failed to load.
 * 3. **Sign out stopped looking like a nav item.** It was styled identically to
 *    Productos and Pedidos — same grey pill, same height, same weight — sitting
 *    one gap below them. The most destructive control in the sidebar was the
 *    easiest one to hit by accident. It is now below a rule, quiet, and
 *    labelled.
 */
export default function SideNav() {
  return (
    <div className="flex h-full flex-col border-line bg-surface md:border-r">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-2.5 md:py-3">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2.5 rounded-md"
        >
          <Logo size={28} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight text-ink">
              Amor a Mar
            </span>
            <span className="block text-[11px] leading-tight text-ink-muted">
              Panel de administración
            </span>
          </span>
        </Link>
      </div>

      {/*
        Horizontal and scrollable on a phone, vertical from `md`. Six entries at
        390px do not fit as a wrapped grid without either truncating labels or
        stealing a third of the viewport, so on mobile they scroll — with the
        labels intact, because an icon-only bar makes an operator guess.
      */}
      <nav
        aria-label="Secciones"
        className="flex gap-1 overflow-x-auto border-b border-line px-2 py-2 md:flex-col md:overflow-visible md:border-b-0 md:px-2 md:py-3"
      >
        <NavLinks />
      </nav>

      <form
        className="mt-auto hidden border-t border-line p-2 md:block"
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/' });
        }}
      >
        <button
          type="submit"
          className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <PowerIcon className="h-5 w-5 shrink-0" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
