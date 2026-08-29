import clsx from 'clsx';

/**
 * The panel's one status badge.
 *
 * There were four implementations before this — product status, order status,
 * payment status, stock level, plus a fifth inline in the customer table — and
 * they had drifted into three different shapes (`rounded-full` in two,
 * `rounded-md` in another), three different paddings, and, worse, three
 * different meanings for the same colour. `bg-green-500 text-white` marked an
 * active product while `bg-green-100 text-green-700` marked a paid order, so a
 * saturated green meant "normal" on one screen and nothing on the next.
 *
 * A badge is now a **tone**, and a tone is a claim about the operator's
 * attention:
 *
 *   neutral — a fact. Nothing to do.
 *   ok      — a good terminal state. Nothing to do.
 *   info    — in flight, moving on its own.
 *   warn    — needs a person, eventually.
 *   danger  — needs a person, now.
 *
 * Every tone is a soft background with its solid ink counterpart, a pair
 * measured to clear 4.5:1 in `global.css`, so a caller never has to make a
 * contrast decision.
 *
 * The icon is optional but the **word never is**. Two of these states — a
 * draft product and an archived one — are both "not for sale" and mean entirely
 * different things operationally; colour alone does not separate them in
 * greyscale, under the shop's lighting, or for the roughly 1-in-12 men who will
 * not see the green.
 */
export type BadgeTone = 'neutral' | 'ok' | 'info' | 'warn' | 'danger';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-subtle text-ink-muted ring-line',
  ok: 'bg-ok-soft text-ok ring-ok/20',
  info: 'bg-info-soft text-info ring-info/20',
  warn: 'bg-warn-soft text-warn ring-warn/20',
  danger: 'bg-danger-soft text-danger ring-danger/20',
};

export default function Badge({
  tone = 'neutral',
  icon: Icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        // `rounded` and not `rounded-full`: a pill reads as a tag someone can
        // remove. These are states, not chips, and the panel has real removable
        // chips elsewhere that need to stay distinguishable from them.
        //
        // The 1px ring rather than a border keeps the badge from changing size
        // between tones and survives the soft backgrounds, which are close
        // enough to the surface that an unringed badge dissolves on white.
        'inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONE[tone],
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
