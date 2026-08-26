/**
 * Line icons for the value propositions.
 *
 * Drawn on a 24-grid with a single 1.25 stroke and no fill, so they read as a
 * set rather than four clip-art picks. `currentColor` throughout: the section
 * decides the colour, the icon never fights it.
 *
 * Each one is `aria-hidden` — the heading beside it already carries the
 * meaning, and an icon that repeats its own label is noise in a screen reader.
 */
const base = {
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Selección: a fish, chosen one by one. */
export function FishIcon() {
  return (
    <svg {...base}>
      <path d="M2.5 12c3-4 6.5-6 10-6s6.5 2 9 6c-2.5 4-5.5 6-9 6s-7-2-10-6Z" />
      <path d="M12.5 6c-1.2 2-1.2 10 0 12" />
      <circle cx="18" cy="10.5" r=".6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Origen: a place on the water. */
export function OriginIcon() {
  return (
    <svg {...base}>
      <path d="M12 21c4-4.2 6-7.4 6-10a6 6 0 1 0-12 0c0 2.6 2 5.8 6 10Z" />
      <circle cx="12" cy="11" r="2.25" />
    </svg>
  );
}

/** Cadena de frío: a thermometer reading low. */
export function ColdIcon() {
  return (
    <svg {...base}>
      <path d="M10 14.8V5.5a2 2 0 1 1 4 0v9.3a4 4 0 1 1-4 0Z" />
      <path d="M12 9.5v6.2" />
    </svg>
  );
}

/** Manejo especializado: a knife, the cut done for you. */
export function HandlingIcon() {
  return (
    <svg {...base}>
      <path d="M3 15.5 14.5 4a3.5 3.5 0 0 1 5 5L15 13.5" />
      <path d="M3 15.5h6.5L15 13.5" />
      <path d="M6.5 19 9.5 15.5" />
    </svg>
  );
}
