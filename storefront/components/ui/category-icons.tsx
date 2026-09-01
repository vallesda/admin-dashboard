/**
 * Icons for the catalogue rails.
 *
 * Drawn in the system's existing vocabulary — a 24-unit grid, one 1.25 stroke,
 * no fill, `currentColor` throughout — the same one `value-icons.tsx`
 * established. Extending that set rather than importing a second icon style is
 * what keeps the shop from looking like two shops.
 *
 * `currentColor` matters more than usual here. These sit inside the rail chips,
 * which are ink at rest, brand on hover and cream when active; an icon with a
 * colour of its own would fight all three. It also keeps them clear of the
 * Green Block rule, which forbids an isolated brand-green icon — nothing here
 * ever picks green on its own, it only inherits what the chip already is.
 */
/**
 * El tamaño es un parámetro porque el mismo dibujo sirve en dos sitios.
 *
 * 18 en las pastillas del rail, 14 en la etiqueta de abasto de la tarjeta,
 * que es más pequeña y con 18 el icono le ganaba a su propia palabra. El
 * grosor de trazo **no** escala: 1.25 en los dos tamaños. Escalarlo con la
 * caja es exactamente lo que hace que una familia de iconos se lea como dos.
 */
export type IconProps = { size?: number };

const base = (size = 18) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  // Held at 1.25 like the rest of the set. Scaling the stroke with the box is
  // what makes an icon family read as two families.
  strokeWidth: 1.25,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

/** Todo el catálogo: everything, as a full tray. */
export function GridIcon({ size }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </svg>
  );
}

/**
 * Pescados.
 *
 * The tail is a separate triangle rather than part of the body outline. The
 * first attempt reused the value strip's fish, whose silhouette is a near
 * symmetric lens — at this size that reads as an eye, not an animal. A detached
 * tail is what makes the shape unmistakably a fish before the label is read.
 */
export function FishIcon({ size }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <path d="M7 12c2.4-3.4 5.8-5.3 9.2-5.3S21 9 21 12s-1.4 5.3-4.8 5.3S9.4 15.4 7 12Z" />
      <path d="M7 12 2.8 8.2v7.6Z" />
      <path d="M12.4 7.7c-.9 2.4-.9 6.2 0 8.6" />
      <circle cx="17.6" cy="10.6" r=".7" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Mariscos: a scallop, hinge down.
 *
 * A shell rather than a shrimp. A shrimp needs its legs and antennae to be
 * recognisable and both vanish at this size; a ribbed dome survives it, which
 * is the whole test for an icon.
 *
 * A dome on a flat hinge, not the pointed fan drawn first — that one closed to
 * a sharp V at the bottom and read as a cut gem. The ribs radiate from the
 * hinge, which is what says "shell" rather than "half circle".
 */
export function ShellIcon({ size }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <path d="M3.6 16.4a8.4 8.4 0 0 1 16.8 0Z" />
      <path d="M12 16.4V8" />
      <path d="M12 16.4 6.2 12.4" />
      <path d="m12 16.4 5.8-4" />
      <path d="M10.4 16.4v1.9M13.6 16.4v1.9" />
    </svg>
  );
}

/** Congelados: a snowflake. */
export function FrozenIcon({ size }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <path d="M12 3.5v17" />
      <path d="m4.6 7.75 14.8 8.5" />
      <path d="m4.6 16.25 14.8-8.5" />
      <path d="m9.8 5.6 2.2 2.2 2.2-2.2" />
      <path d="m9.8 18.4 2.2-2.2 2.2 2.2" />
    </svg>
  );
}

/** Fresco: water, because in this shop "fresh" means it came out of it today. */
export function WaveIcon({ size }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <path d="M3 9.5q3-3 6 0t6 0 6 0" />
      <path d="M3 14.5q3-3 6 0t6 0 6 0" />
      <path d="M3 19.5q3-3 6 0t6 0 6 0" />
    </svg>
  );
}

/** A package: a tied parcel. */
export function PackageIcon({ size }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5Z" />
      <path d="m3.5 7.5 8.5 4.5 8.5-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

type IconComponent = (props?: IconProps) => React.ReactElement;

/**
 * Picks an icon for a category the admin created.
 *
 * Matched on the slug and the name rather than on an id, because categories are
 * the shop's to create and rename: a mapping keyed on ids would need editing
 * every time they add one. An unrecognised category falls back to the fish —
 * this is a fishmonger, and a generic box would say less than the wrong-but-
 * plausible thing.
 */
export function categoryIcon(handle: string, title: string): IconComponent {
  const text = `${handle} ${title}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Order matters: "producto-congelado" contains neither "pescado" nor
  // "marisco", but a category named "Marisco congelado" should read as frozen.
  if (/congel|hielo/.test(text)) return FrozenIcon;
  /*
   * `especial` entra aquí y no al final.
   *
   * «Especiales» es la estantería del marisco —almeja, callo, camarón,
   * ostión—, y con la lista anterior no casaba con ninguna regla y caía al
   * `return` final, que devuelve un pez. Un pez sobre la pastilla del marisco
   * decía lo contrario de lo que hay dentro.
   */
  if (/marisc|molusc|crustace|almeja|ostion|camaron|pulpo|especial|concha/.test(text)) {
    return ShellIcon;
  }
  if (/pescad|filete|lomo/.test(text)) return FishIcon;
  if (/fresc|dia|temporada/.test(text)) return WaveIcon;

  return FishIcon;
}
