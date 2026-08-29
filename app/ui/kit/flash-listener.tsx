'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { FLASH_PARAM, flashMessage } from '@/lib/flash';
import { useToast } from './toast';

/**
 * Turns a `?flash=` code left by a redirecting action back into a toast.
 *
 * Creating or editing a record ends in `redirect()` to the list, which discards
 * every piece of client state the form had — so the outcome has to survive the
 * navigation in the only thing that does: the URL.
 *
 * Two things happen on arrival. The code is looked up in the `FLASH` table (an
 * unknown one is ignored, never rendered), and then the parameter is stripped
 * with `router.replace`. Stripping matters: without it a refresh, a
 * back-navigation, or a bookmarked link would re-announce a save that happened
 * once, ten minutes ago.
 *
 * `scroll: false` on the replace, because the operator is looking at the top of
 * a list they were just returned to and a scroll reset would be a second,
 * unexplained movement.
 */
export default function FlashListener() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { notify } = useToast();

  const code = params.get(FLASH_PARAM);

  /*
   * React runs effects twice in development Strict Mode. Without this guard the
   * same save announces itself twice, which looks exactly like the double-submit
   * bug an operator would then go hunting for.
   */
  const announced = useRef<string | null>(null);

  useEffect(() => {
    if (!code || announced.current === code) return;

    const flash = flashMessage(code);
    announced.current = code;

    if (flash) notify({ tone: flash.tone, message: flash.message });

    // The parameter is removed whether or not it resolved, so an unknown code
    // does not sit in the URL waiting to be re-read.
    const next = new URLSearchParams(params);
    next.delete(FLASH_PARAM);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [code, notify, params, pathname, router]);

  return null;
}
