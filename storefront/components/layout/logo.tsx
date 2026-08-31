import Image from 'next/image';
import Link from 'next/link';

import Eye from '@/components/brand/eye';
import { firstAsset } from '@/lib/assets';

/**
 * El lockup de la marca: el ojo y el logotipo.
 *
 * El manual define el logotipo como Arrus con un tratamiento hecho a mano
 * «para dar un aspecto de sello, como las monedas del mar». Eso es un dibujo:
 * ninguna fuente lo reproduce, así que se usa el archivo cuando está.
 *
 * ## Los dos se degradan, y de forma distinta
 *
 * Esto no es defensa gratuita. Este componente aparece en la barra **y** en el
 * pie, así que un archivo ausente rompe la vista de todas las páginas del
 * sitio — que es exactamente lo que ocurrió al cablearlo antes de que los
 * archivos del brandbook estuvieran en el repositorio.
 *
 * - **El ojo** cae a su versión en SVG (`components/brand/eye.tsx`), que no es
 *   un marcador de posición: son los mismos cuatro círculos y los mismos
 *   colores del manual. Escala sin peso y no pide una petición de red.
 * - **El logotipo** cae a tipografía. Aquí sí se pierde algo —el trazo a mano
 *   no se reproduce con una fuente— pero un nombre bien compuesto es
 *   infinitamente mejor que un icono roto.
 *
 * Cuando alguien suelta los archivos en `public/brand/`, los dos suben solos.
 */
export default function Logo({
  size = 40,
  withName = true,
  variant = 'dark',
}: {
  size?: number;
  withName?: boolean;
  variant?: 'dark' | 'light';
}) {
  /*
   * La búsqueda va **dentro** del componente, no en una constante de módulo.
   *
   * A nivel de módulo se evalúa una sola vez al cargar, así que un archivo que
   * aparece después nunca se ve — que es justo lo que pasó aquí. En producción
   * el resultado está memoizado, así que esto es una lectura de un `Map`; en
   * desarrollo es un `existsSync`, y soltar el archivo funciona al recargar.
   */
  const wordmark = firstAsset(
    '/brand/amoramarlogoverde.png',
    '/brand/amoramar-wordmark.png',
  );
  const eyeFile = firstAsset(
    '/brand/ojoLogoAmorAMar.png',
    '/brand/ojoamoramar.png',
  );

  const ink = variant === 'light' ? 'text-background' : 'text-brand';

  return (
    <Link
      href="/"
      className="flex items-center gap-3"
      aria-label="Amor a Mar, honest seafood — inicio"
    >
      {eyeFile ? (
        <Image
          src={eyeFile}
          alt=""
          width={size}
          height={size}
          priority
          className="shrink-0 object-contain"
        />
      ) : (
        <Eye size={size} palette="green" className="shrink-0" />
      )}

      {withName ? (
        wordmark ? (
          /*
           * El mismo archivo sirve para las superficies verdes —el pie—
           * invertido por CSS. El dibujo es de un solo color, así que el filtro
           * da el negativo exacto y no hay dos archivos que se desincronicen.
           */
          <Image
            src={wordmark}
            alt=""
            /* Las medidas del archivo: 349 × 72. Declararlas exactas es lo que
               deja a Next reservar el hueco correcto y no mover el layout al
               cargar. */
            width={349}
            height={72}
            priority
            className={`h-auto w-auto object-contain ${
              variant === 'light' ? 'brightness-0 invert' : ''
            }`}
            style={{ height: size * 0.62, width: 'auto' }}
          />
        ) : (
          <span className={`flex flex-col leading-none ${ink}`}>
            <span className="font-display text-lg tracking-[0.02em]">
              Amor a Mar
            </span>
            <span className="mt-[3px] font-sans text-[9px] font-medium uppercase tracking-[0.22em] opacity-80">
              Honest Seafood
            </span>
          </span>
        )
      ) : null}
    </Link>
  );
}
