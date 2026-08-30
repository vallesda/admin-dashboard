'use client';

import { useEffect, useId, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * A modal built on the native `<dialog>` element.
 *
 * The panel had no modal until money arrived, and it needed one: collecting a
 * payment and issuing a refund both take several fields *and* a decision the
 * operator should not be able to make by brushing a button. An inline
 * disclosure would have been cheaper and wrong — it leaves the rest of the
 * screen live while someone is typing an amount.
 *
 * `showModal()` rather than a hand-rolled overlay because the browser already
 * does the hard parts correctly: focus is trapped, the rest of the document
 * goes inert, Escape closes, and the backdrop is a real pseudo-element rather
 * than a div that has to be kept in sync. No library, no portal, no scroll-lock
 * hack.
 */
export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // `close` fires for Escape and for the backdrop, so the parent's state
      // follows the element instead of the two drifting apart.
      onClose={onClose}
      onClick={(event) => {
        // The dialog's own box is a child; a click whose target is the dialog
        // itself landed on the backdrop.
        if (event.target === ref.current) onClose();
      }}
      className="w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-0 text-ink shadow-lg backdrop:bg-ink/40 open:animate-none"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm font-semibold text-ink">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="-mr-1 -mt-1 shrink-0 cursor-pointer rounded-md p-1 text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
        >
          <span className="sr-only">Cerrar</span>
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
