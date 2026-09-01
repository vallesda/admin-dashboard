import Image from 'next/image';

/**
 * La ola de marca, de fondo detrás de una banda.
 *
 * Existe como componente y no como marcado suelto porque ya vive en dos sitios
 * —la banda del catálogo en la portada y las páginas de categoría— y son
 * exactamente las decisiones que no deben poder discrepar: la opacidad que
 * mantiene el contraste del texto, el degradado que evita el corte en seco, y
 * el `aria-hidden` que la deja fuera del árbol de accesibilidad. Copiada a mano
 * una segunda vez, la tercera copia habría llegado con otro número.
 *
 * `pointer-events-none` y `aria-hidden`: es decoración. No puede robarle un
 * clic a una tarjeta de producto ni una parada a un lector de pantalla.
 *
 * `unoptimized` no hace falta aquí —es un PNG, no un SVG— así que pasa por el
 * optimizador como cualquier otra imagen del sitio.
 *
 * Quien la use tiene que poner `relative overflow-hidden` en el contenedor y
 * subir el contenido a `relative z-10`. Sin lo primero la ola se escapa de la
 * banda; sin lo segundo queda por encima del texto.
 */
export default function WaveBackdrop({
  flip = false,
  opacity = 0.12,
  className = '',
}: {
  /**
   * Espeja la ola para que la cresta corra hacia el otro lado.
   *
   * La portada la usa espejada porque el hero ya lleva una sin espejar: dos
   * olas mirando al mismo lado leen como una repetición, enfrentadas dejan
   * respirar la página. El degradado se espeja con ella —la transformación
   * afecta también a la máscara—, así que el desvanecido siempre cae del lado
   * del que la cresta se aleja.
   */
  flip?: boolean;
  /**
   * Cuánto se ve. El número delicado, no un gusto.
   *
   * Va debajo de texto y precios, así que sube sólo hasta donde sigue siendo
   * textura. El 12 % por omisión mantiene el contraste del texto sobre crema
   * muy por encima del mínimo y basta para que el dibujo se lea.
   */
  opacity?: number;
  className?: string;
}) {
  const mask = 'linear-gradient(to left, transparent 0%, #000 35%, #000 100%)';

  return (
    <Image
      src="/brand/ola.png"
      alt=""
      aria-hidden="true"
      width={1100}
      height={1340}
      sizes="100vw"
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-0 h-full w-full select-none object-cover object-left-bottom ${
        flip ? '-scale-x-100' : ''
      } ${className}`}
      style={{ opacity, maskImage: mask, WebkitMaskImage: mask }}
    />
  );
}
