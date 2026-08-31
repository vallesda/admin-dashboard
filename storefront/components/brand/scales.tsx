/**
 * El banco de escamas.
 *
 * El segundo elemento gráfico del manual: gotas —escamas, o un cardumen visto
 * desde arriba— dispersas en los cinco colores de la paleta, describiendo una
 * curva que cruza el lienzo. En el manual va sobre la camiseta, el póster de la
 * parada de autobús y la portada de la página.
 *
 * ## Por qué generado y no una imagen
 *
 * El patrón del manual no se repite: es una curva que atraviesa la composición,
 * y cada aplicación la recorta distinto. Un PNG habría que rehacerlo por cada
 * proporción, y a ancho completo pesaría más que toda la hoja de estilos.
 *
 * Generado, además, respeta la paleta: si un color cambia, el patrón cambia con
 * él en vez de quedarse como el único sitio del sitio con el verde viejo.
 *
 * ## Determinista, no aleatorio
 *
 * Las posiciones salen de una función seno más un generador con semilla fija.
 * Un `Math.random()` daría un patrón distinto en el servidor y en el cliente
 * —error de hidratación— y, peor, uno distinto en cada visita: la identidad
 * dejaría de ser reconocible.
 */

type Props = {
  /** Cuántas escamas. Más de ~90 satura y deja de leerse como cardumen. */
  count?: number;
  /** La banda por la que serpentea, en porcentaje de la altura. */
  amplitude?: number;
  className?: string;
};

/** Generador con semilla: mismo dibujo en el servidor, en el cliente y mañana. */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

/*
 * Los cinco colores del manual, en el orden de la lámina.
 *
 * El verde y el turquesa llevan más peso que el rojo: en la camiseta del manual
 * los cálidos son acentos dentro de una mancha mayoritariamente fría. Repetir
 * los fríos en la lista es cómo se consigue esa proporción sin ponderarla a
 * mano en cada escama.
 */
const INKS = [
  'rgb(var(--brand))',
  'rgb(var(--turquoise))',
  'rgb(var(--brand))',
  'rgb(var(--coral))',
  'rgb(var(--sun))',
  'rgb(var(--turquoise))',
  'rgb(var(--scarlet))',
  'rgb(var(--brand))',
];

export default function Scales({
  count = 64,
  amplitude = 26,
  className,
}: Props) {
  const random = seeded(20170101);

  const scales = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);

    // La curva. Una sola onda a lo ancho, que es lo que hace que el banco
    // parezca ir a algún sitio en vez de estar esparcido.
    const x = t * 108 - 4;
    const y = 50 + Math.sin(t * Math.PI * 1.6 - 0.6) * amplitude;

    // La dispersión alrededor de la curva es lo que lo salva de parecer una
    // guirnalda: sin ella son cuentas en un hilo.
    const spread = (random() - 0.5) * amplitude * 1.5;
    const jitter = (random() - 0.5) * 5;

    return {
      cx: x + jitter,
      cy: y + spread,
      // Las escamas de los bordes más pequeñas: el banco se deshace en la
      // distancia en lugar de cortarse a plomo.
      r: 1.1 + random() * 1.5,
      rotate: -35 + random() * 70,
      fill: INKS[Math.floor(random() * INKS.length)],
      opacity: 0.55 + random() * 0.45,
    };
  });

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {scales.map((s, i) => (
        <ellipse
          key={i}
          cx={s.cx}
          cy={s.cy}
          // Una gota, no un círculo: alta y estrecha, girada. Es la forma del
          // manual y es lo que la lee como escama.
          rx={s.r * 0.52}
          ry={s.r}
          fill={s.fill}
          opacity={s.opacity}
          transform={`rotate(${s.rotate} ${s.cx} ${s.cy})`}
        />
      ))}
    </svg>
  );
}
