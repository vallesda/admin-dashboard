import { FrozenIcon, WaveIcon } from '@/components/ui/category-icons';
import type { ProductSupply } from '@/lib/commerce/types';

/**
 * De dónde sale la pieza: fresca del día o de congelador.
 *
 * ## Por qué merece una etiqueta propia
 *
 * Es la primera pregunta que hace quien compra pescado, y hasta ahora la
 * respuesta estaba repartida: la categoría lo decía en el menú, y la tarjeta
 * sólo lo insinuaba con un «Siempre disponible» que hablaba de existencias, no
 * de producto. Puesto en la pieza, se contesta sin salir de la rejilla y sin
 * tener que entrar en cada ficha.
 *
 * ## Las dos esquinas dicen cosas distintas
 *
 * Arriba a la izquierda va lo que le pasa a **esta compra**: agotado, por
 * encargo, de temporada. Arriba a la derecha va lo que **es la pieza**, que no
 * cambia con el stock del día. Separarlas por esquina es lo que permite que
 * convivan sin leerse como dos versiones de la misma etiqueta.
 *
 * Por eso también desapareció «Siempre disponible» de la izquierda: decía a
 * medias lo que «Congelado» dice entero, y las dos juntas en la misma tarjeta
 * eran ruido.
 *
 * ## El color
 *
 * Opaco, no translúcido: esto se apoya sobre fotografía —papel de marca negro,
 * pieza al centro— y un fondo con alfa tendría un contraste distinto en cada
 * foto. Los dos pares están medidos sobre su propio fondo, no sobre la página:
 *
 * - **Fresco** — menta con tinta verde de marca: **9.23:1**
 * - **Congelado** — turquesa con tinta verde oscuro: **5.09:1**
 *
 * Los dos son claros y saturados, que es lo que los separa de la foto oscura.
 * La pareja obvia —verde de marca con crema— mide 9.48:1 y se leería
 * perfectamente… sobre un rectángulo verde oscuro encima de una foto oscura,
 * es decir, sin separarse de ella. Y el turquesa con crema, que era la otra
 * tentación, mide 2.77:1 y no pasa.
 *
 * El color nunca va solo: cada etiqueta lleva su palabra y su icono, así que
 * en escala de grises, o para quien no distinga menta de turquesa, sigue
 * diciendo lo mismo.
 *
 * ## Por encargo no lleva etiqueta aquí
 *
 * Un `preorder` no es fresco ni congelado: todavía no existe. Lo suyo es
 * *cuándo llega*, que es una fecha y ya la dice la etiqueta de la izquierda.
 * Ponerle además una de éstas obligaría a inventar un tercer color para una
 * pregunta que no es la que esta etiqueta contesta.
 */
const TAGS = {
  fresh: {
    label: 'Fresco',
    Icon: WaveIcon,
    className: 'bg-brand-soft text-brand',
  },
  stocked: {
    label: 'Congelado',
    Icon: FrozenIcon,
    className: 'bg-turquoise text-brand-dark',
  },
} as const;

export default function SupplyTag({
  supply,
  className = '',
}: {
  supply: ProductSupply;
  className?: string;
}) {
  const tag = supply.type === 'fresh' || supply.type === 'stocked'
    ? TAGS[supply.type]
    : null;

  if (!tag) return null;

  const { label, Icon } = tag;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium ${tag.className} ${className}`}
    >
      {/* 14 y no 18: aquí el icono acompaña a una palabra de 12px, y al tamaño
          del rail le ganaba. El trazo se queda en 1.25 — ver `category-icons`. */}
      <Icon size={14} />
      {label}
    </span>
  );
}
