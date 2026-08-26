import Image from 'next/image';
import Link from 'next/link';

/**
 * One shopping intent.
 *
 * When the catalogue has photography for the occasion it leads; when it does
 * not, the card falls back to a brand surface with the name set large. That is
 * deliberate — a grey rectangle labelled "Sashimi" reads as broken, while a
 * confident green tile reads as designed until the photograph arrives.
 */
export type Occasion = {
  handle: string;
  title: string;
  description: string;
  image?: { url: string; altText: string } | null;
};

export default function OccasionCard({ occasion }: { occasion: Occasion }) {
  return (
    <Link
      href={`/search/${occasion.handle}`}
      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-sm"
    >
      {occasion.image ? (
        <>
          <Image
            src={occasion.image.url}
            alt={occasion.image.altText}
            fill
            sizes="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
          {/* Scrim, not a decorative gradient: without it the text fails
              contrast over a bright photograph. */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-brand" />
      )}

      <div className="relative p-5">
        <h3 className="font-display text-2xl text-background md:text-3xl">
          {occasion.title}
        </h3>
        <p className="mt-1 text-sm text-background/80">
          {occasion.description}
        </p>
      </div>
    </Link>
  );
}
