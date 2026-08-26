import Image from 'next/image';
import Link from 'next/link';

/**
 * The brand mark.
 *
 * The source asset is a 1254px PNG; it is resized on the way into
 * `public/brand` rather than shipped at full weight for a 40px render.
 *
 * `variant="light"` is for dark surfaces — the footer — where the mark needs no
 * change but its wordmark does.
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
  return (
    <Link
      href="/"
      className="flex items-center gap-3"
      aria-label="Amor a Mar — inicio"
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
        <span
          className={`font-display text-lg tracking-[0.02em] ${
            variant === 'light' ? 'text-background' : 'text-brand'
          }`}
        >
          Amor a Mar
        </span>
      ) : null}
    </Link>
  );
}
