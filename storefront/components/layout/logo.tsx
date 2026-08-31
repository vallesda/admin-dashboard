import Image from 'next/image';
import Link from 'next/link';

/**
 * El lockup de la marca.
 *
 * El manual (§5) define la marca como wordmark **más descriptor**:
 * «AMOR A MAR» sobre «SEAFOOD MARKET», centrado y con tracking abierto. Así va
 * en el toldo de la tienda, en el delantal y en la bolsa. El sitio llevaba sólo
 * el wordmark, que es la marca a medias — y el descriptor no es decoración:
 * es lo que dice a qué se dedica el negocio a alguien que llega sin saberlo.
 *
 * El signo gráfico es la imagen: el manual define el logotipo como Arrus con un
 * tratamiento hecho a mano «para dar un aspecto de sello, como las monedas del
 * mar». Eso es un dibujo y se usa como dibujo; sólo el descriptor es tipografía.
 *
 * `variant="light"` es para superficies verdes —el pie— donde el crema del
 * manual es la tinta correcta.
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
  const ink = variant === 'light' ? 'text-background' : 'text-brand';

  return (
    <Link
      href="/"
      className="flex items-center gap-3"
      aria-label="Amor a Mar, seafood market — inicio"
    >
      <Image
        src="/brand/amoramar-logo.png"
        alt=""
        width={size}
        height={size}
        priority
        className="object-contain"
      />
      {withName ? (
        <span className={`flex flex-col leading-none ${ink}`}>
          <span className="font-display text-lg tracking-[0.02em]">
            Amor a Mar
          </span>
          {/*
            El descriptor a un cuarto del tamaño y con el tracking del manual.
            Va en versales porque en el toldo va en versales, y el interletraje
            abierto es lo que impide que a 9px se convierta en una mancha.
          */}
          <span className="mt-[3px] font-sans text-[9px] font-medium uppercase tracking-[0.22em] opacity-80">
            Seafood Market
          </span>
        </span>
      ) : null}
    </Link>
  );
}
