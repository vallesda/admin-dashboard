import Image from 'next/image';

/**
 * Company mark.
 *
 * Replaces the tutorial's `AcmeLogo` (a rotated globe icon next to the word
 * "Acme"). Rendered on the brand-green panels in the sidebar and on the landing
 * page, so it needs no background of its own.
 *
 * `priority` because it sits above the fold in both places: without it the mark
 * pops in after the panel has already painted.
 */
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/amor-amar-logo.png"
      alt="Amor Amar"
      width={size}
      height={size}
      priority
      className="object-contain"
    />
  );
}
