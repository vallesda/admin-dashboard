/**
 * Line icons for the value propositions.
 *
 * Drawn on a 24-grid with a single 1.25 stroke and no fill, so they read as a
 * set rather than four clip-art picks. `currentColor` throughout: the section
 * decides the colour, the icon never fights it.
 *
 * They render at 20px now, not 28. The strip sets them inline beside a
 * `text-sm` title rather than stacked above it, and an icon larger than the cap
 * height of the words next to it stops being a marker and starts being a
 * picture competing with the sentence.
 *
 * Each one is `aria-hidden` — the heading beside it already carries the
 * meaning, and an icon that repeats its own label is noise in a screen reader.
 */
type IconProps = { size?: number };

function props({ size = 20 }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    // Held constant across sizes on purpose: scaling the stroke with the box
    // would make the set read as one weight at 20px and another at 28px.
    strokeWidth: 1.25,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
}

/** Selección: a fish, chosen one by one. */
export function FishIcon(p: IconProps = {}) {
  return (
    <svg {...props(p)}>
      <path d="M2.5 12c3-4 6.5-6 10-6s6.5 2 9 6c-2.5 4-5.5 6-9 6s-7-2-10-6Z" />
      <path d="M12.5 6c-1.2 2-1.2 10 0 12" />
      <circle cx="18" cy="10.5" r=".6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Origen: a place on the water. */
export function OriginIcon(p: IconProps = {}) {
  return (
    <svg {...props(p)}>
      <path d="M12 21c4-4.2 6-7.4 6-10a6 6 0 1 0-12 0c0 2.6 2 5.8 6 10Z" />
      <circle cx="12" cy="11" r="2.25" />
    </svg>
  );
}

/** Cadena de frío: a thermometer reading low. */
export function ColdIcon(p: IconProps = {}) {
  return (
    <svg {...props(p)}>
      <path d="M10 14.8V5.5a2 2 0 1 1 4 0v9.3a4 4 0 1 1-4 0Z" />
      <path d="M12 9.5v6.2" />
    </svg>
  );
}

/** Manejo especializado: a knife, the cut done for you. */
export function HandlingIcon(p: IconProps = {}) {
  return (
    <svg {...props(p)}>
      <path d="M3 15.5 14.5 4a3.5 3.5 0 0 1 5 5L15 13.5" />
      <path d="M3 15.5h6.5L15 13.5" />
      <path d="M6.5 19 9.5 15.5" />
    </svg>
  );
}
