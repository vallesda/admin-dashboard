import type { ButtonHTMLAttributes } from 'react';
import Link from 'next/link';

/**
 * Buttons are solid and confident, not playful: 4px radius, no pill shapes, no
 * shadow. Weight comes from colour and size, not decoration.
 *
 * `onBrand` is a real variant and not a set of override classes, because the
 * override did not work. Both CTAs that live on a green surface — the hero and
 * the week's catch — were written as `variant="primary"` plus
 * `className="bg-background text-brand"`, on the assumption that a class listed
 * later in the string wins. It does not: the cascade resolves by the order the
 * utilities appear in the generated stylesheet, and `bg-background` /
 * `text-background` are both declared after their `brand` counterparts in the
 * palette. So `text-background` beat `text-brand` and both buttons rendered
 * cream text on a cream background — invisible, on the two loudest calls to
 * action the site has.
 *
 * Making it a variant means the two colours are chosen in one place and never
 * compete. Gold reaches a control in exactly three places now: this variant's
 * hover, and the two add-to-cart variants below.
 */
type Variant = 'primary' | 'secondary' | 'onBrand' | 'add' | 'addOutline';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded px-6 py-3 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45';

const LOOK: Record<Variant, string> = {
  primary: 'bg-brand text-background hover:bg-brand-dark',
  secondary:
    'border border-border-strong bg-surface text-foreground hover:bg-sand',
  onBrand: 'bg-background text-brand hover:bg-gold hover:text-foreground',

  /*
   * The two "put this in the basket" controls. They differ at rest and agree on
   * hover: solid brand where the page has one clear commit (the product page),
   * outlined where there are eight of them down a catalogue and the photography
   * has to keep its weight.
   *
   * Both turn gold under the cursor. Gold means "exceptional or fleeting" in
   * this system, and the moment a shopper reaches for a piece of that day's
   * catch is exactly that — the catalogue is volatile by design and the thing
   * they are touching may not be there tomorrow.
   *
   * Measured: Sea Ink on gold is 7.89:1, well past the 4.5:1 a button label
   * needs. The gold fill against the cream page is only 2.06:1, so at REST the
   * outlined variant keeps `border-strong` (3.01:1) — that hairline is the only
   * thing identifying it as a control and it stays under WCAG 1.4.11's floor.
   * On hover the fill and a 7.89:1 label identify it instead, so the border may
   * go gold with it.
   */
  add: 'bg-brand text-background hover:bg-gold hover:text-foreground',
  addOutline:
    'border border-border-strong bg-surface text-foreground hover:border-gold hover:bg-gold hover:text-foreground',
};

function classes(variant: Variant, fullWidth: boolean, className: string) {
  return `${BASE} ${LOOK[variant]} ${fullWidth ? 'w-full' : ''} ${className}`;
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  fullWidth?: boolean;
}) {
  return <button className={classes(variant, fullWidth, className)} {...rest} />;
}

/**
 * The same thing, as a link.
 *
 * It exists because seven places in the storefront were writing
 * `<Link><Button/></Link>` — an `<a>` wrapping a `<button>`, which is invalid
 * HTML. Browsers resolve it by picking one of the two interactions, and which
 * one they pick is not something to rely on: the hero CTA, the week's catch, the
 * empty cart, the checkout's empty state and the order page all shipped it.
 *
 * A control that navigates is an anchor. It just looks like a button, and it
 * gets the button's exact geometry from the same two constants above so the two
 * can never drift.
 */
export function ButtonLink({
  href,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...rest
}: React.ComponentProps<typeof Link> & {
  variant?: Variant;
  fullWidth?: boolean;
}) {
  return (
    <Link
      href={href}
      className={classes(variant, fullWidth, className)}
      {...rest}
    />
  );
}
