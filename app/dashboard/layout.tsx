import { Suspense } from 'react';

import SideNav from '@/app/ui/dashboard/sidenav';
import { ToastProvider } from '@/app/ui/kit/toast';
import FlashListener from '@/app/ui/kit/flash-listener';

/**
 * Dashboard shell.
 *
 * The sidebar is fixed and only the content column scrolls, so the operator's
 * navigation never scrolls away from them mid-task.
 *
 * Padding dropped from `p-6 md:p-12`. Forty-eight pixels of margin on all four
 * sides of a data table is magazine spacing on a tool whose whole job is to fit
 * another eight rows on the screen; `p-4 lg:p-6` gives the content back roughly
 * a column's width at 1440px.
 *
 * The content column is not width-capped. Tables want the room, and a `max-w`
 * here would put a permanent empty gutter on the right of every list screen.
 *
 * `ToastProvider` wraps the whole panel so a confirmation raised by a row action
 * deep inside a table has somewhere to land, and survives the client-side
 * navigations between list screens. `FlashListener` sits inside it and converts
 * the `?flash=` code a redirecting action leaves behind; it reads
 * `useSearchParams`, so it needs its own Suspense boundary or it would opt every
 * dashboard route out of static rendering.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex h-screen flex-col bg-canvas md:flex-row md:overflow-hidden">
        <div className="w-full flex-none md:w-60">
          <SideNav />
        </div>
        <div className="grow p-4 md:overflow-y-auto lg:p-6">{children}</div>
      </div>

      <Suspense fallback={null}>
        <FlashListener />
      </Suspense>
    </ToastProvider>
  );
}
