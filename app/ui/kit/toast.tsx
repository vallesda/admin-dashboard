'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

/**
 * The panel's confirmation channel.
 *
 * Every write in this tool used to be silent. Archiving a product, confirming an
 * order, marking one paid — the row simply changed, and if the operator had
 * looked away for the half second the table took to refresh, the only way to
 * know the click had landed was to read the row again. For destructive-ish
 * actions on a screen someone works for a whole shift, that is the difference
 * between "done" and "did I do that twice?".
 *
 * ## Toast, not a banner in the page
 *
 * A banner above the content pushes the table down every time it appears, which
 * on a list you are clicking through means the row under your cursor moves as
 * you work. The toast floats, so nothing reflows, and it is the one surface in
 * the panel that genuinely floats over live content — which is what
 * `shadow-pop` exists for.
 *
 * ## Success fades, failure does not
 *
 * A confirmation is disposable: it says the thing you expected happened, and
 * five seconds is longer than anyone looks. A failure is not disposable — it
 * says the thing you expected did NOT happen, and auto-hiding it means an
 * operator can miss that an order never moved. Errors stay until dismissed.
 *
 * ## Announcement
 *
 * The region is a live region so the outcome reaches a screen reader without
 * moving focus — an operator mid-tab through a table must not be yanked out of
 * it by a confirmation. Errors are assertive, confirmations polite, which is the
 * same priority the visual treatment gives them.
 */
export type ToastTone = 'ok' | 'info' | 'warn' | 'error';

export type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
};

type ToastContextValue = {
  notify: (toast: { tone: ToastTone; message: string }) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** Beyond this the stack becomes a wall; the oldest drop off the back. */
const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    ({ tone, message }: { tone: ToastTone; message: string }) => {
      const id = nextId.current++;

      setToasts((current) => {
        /*
         * Same message already on screen? Replace it rather than stacking.
         * Pressing "Marcar pagado" twice in a row on a slow connection should
         * not leave two identical confirmations to dismiss.
         */
        const deduped = current.filter((t) => t.message !== message);
        return [...deduped, { id, tone, message }].slice(-MAX_VISIBLE);
      });

      if (tone !== 'error') {
        timers.current.set(
          id,
          window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
        );
      }
    },
    [dismiss],
  );

  // Clearing on unmount matters in dev, where the provider remounts on every
  // hot reload and would otherwise leave timers pointing at dead state.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast requiere que ToastProvider esté montado.');
  }
  return context;
}

const TONE: Record<
  ToastTone,
  { surface: string; icon: React.ComponentType<{ className?: string }> }
> = {
  ok: { surface: 'border-ok/30 bg-ok-soft text-ok', icon: CheckCircleIcon },
  info: {
    surface: 'border-info/30 bg-info-soft text-info',
    icon: InformationCircleIcon,
  },
  warn: {
    surface: 'border-warn/40 bg-warn-soft text-warn',
    icon: ExclamationTriangleIcon,
  },
  error: {
    surface: 'border-danger/30 bg-danger-soft text-danger',
    icon: XCircleIcon,
  },
};

function ToastRegion({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    /*
     * Bottom-right on a desktop, where it is out of the way of both the sidebar
     * and the primary action in the page header. Full width at the bottom on a
     * phone, because a floating card in a corner of a 390px screen either covers
     * content or truncates its own message.
     *
     * `pointer-events-none` on the region and `auto` on each toast, so the strip
     * of empty space above the stack does not swallow clicks on the table under
     * it.
     */
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-stretch gap-2 p-3 sm:inset-x-auto sm:right-0 sm:max-w-sm sm:items-end sm:p-4"
      // Polite: the visual toast is the primary channel and the announcement
      // must not interrupt someone mid-keystroke. Errors escalate per-toast.
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const { surface, icon: Icon } = TONE[toast.tone];

        return (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={clsx(
              'pointer-events-auto flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 shadow-pop',
              surface,
            )}
          >
            <Icon className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              // Not a 44px target: it sits inside a transient surface that also
              // dismisses itself, and a button that size would dominate the
              // message it belongs to. The action it undoes is "stop showing
              // this", which costs nothing to get wrong.
              className="-m-1 shrink-0 cursor-pointer rounded p-1 opacity-70 transition-opacity hover:opacity-100"
            >
              <span className="sr-only">Cerrar aviso</span>
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
