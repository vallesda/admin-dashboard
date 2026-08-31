/**
 * El ojo.
 *
 * El elemento gráfico de la marca (manual §5, «Elementos gráficos»): tres
 * anillos concéntricos, pupila negra y un punto de luz descentrado. Aparece en
 * el manual sobre amarillo, sobre verde y en la bolsa de tela, siempre solo o
 * acompañado de dos versiones más pequeñas en otros colores.
 *
 * ## Por qué un ojo y no un pez
 *
 * El concepto de la marca es **el tesoro**: monedas sacadas del mar. El ojo es
 * a la vez la moneda —un disco con anillos— y lo primero que un pescadero mira
 * para saber si una pieza está fresca. Un icono de pez habría dicho «vendemos
 * pescado»; el ojo dice cómo se elige.
 *
 * ## Por qué SVG y no la imagen del manual
 *
 * Son cuatro círculos concéntricos. Dibujarlo escala a cualquier tamaño sin
 * peso, cambia de color con la paleta y no pide una petición de red — y el
 * punto de luz puede colocarse con precisión en lugar de heredar el
 * antialiasing de un PNG a 40px.
 */

type Palette = 'green' | 'coral' | 'sun' | 'turquoise';

/**
 * Las combinaciones del manual, no combinaciones libres.
 *
 * Cada una es un par que aparece impreso: el anillo exterior y el iris. La
 * pupila es siempre negra y la luz siempre blanca — eso no varía en ninguna
 * aplicación.
 */
const RINGS: Record<Palette, { outer: string; iris: string }> = {
  green: { outer: 'rgb(var(--brand))', iris: 'rgb(var(--brand-soft))' },
  coral: { outer: 'rgb(var(--coral))', iris: 'rgb(var(--brand-soft))' },
  sun: { outer: 'rgb(var(--sun))', iris: 'rgb(var(--surface))' },
  turquoise: { outer: 'rgb(var(--turquoise))', iris: 'rgb(var(--brand-soft))' },
};

export default function Eye({
  size = 48,
  palette = 'green',
  className,
}: {
  size?: number;
  palette?: Palette;
  className?: string;
}) {
  const { outer, iris } = RINGS[palette];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      // Decorativo en todos sus usos: siempre acompaña a un texto que ya dice
      // lo que hay que saber. Un icono que repite su propio nombre en un lector
      // de pantalla es ruido.
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="50" cy="50" r="50" fill={outer} />
      <circle cx="50" cy="50" r="31" fill={iris} />
      <circle cx="50" cy="50" r="17" fill="#000000" />
      {/*
        El punto de luz va arriba a la izquierda y descentrado, como en el
        manual. Centrado, el ojo deja de mirar y se convierte en una diana.
      */}
      <circle cx="42" cy="41" r="5" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * El grupo de tres, tal como aparece en el manual.
 *
 * Uno grande y dos pequeños de distinto color, apoyados en la esquina. Es la
 * disposición impresa; separarlos en tres usos sueltos perdería el gesto.
 */
export function EyeCluster({ size = 96 }: { size?: number }) {
  return (
    <span
      className="relative inline-block"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Eye size={size * 0.72} palette="green" />
      <span
        className="absolute"
        style={{ right: 0, top: size * 0.12 }}
      >
        <Eye size={size * 0.2} palette="turquoise" />
      </span>
      <span
        className="absolute"
        style={{ right: size * 0.06, bottom: 0 }}
      >
        <Eye size={size * 0.28} palette="coral" />
      </span>
    </span>
  );
}
