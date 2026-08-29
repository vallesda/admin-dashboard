import Container from '@/components/ui/container';
import { STEPS, ZONES, DAYS, CUTOFF } from '@/lib/fulfillment';
import Eyebrow from '@/components/ui/eyebrow';
import Section from '@/components/ui/section';
import SectionHeader from '@/components/ui/section-header';

/**
 * How ordering works — three steps, no more.
 *
 * This matters more here than in most shops: the catalogue changes with what
 * arrives, so a shopper needs to understand up front that they are buying from
 * today's catch and not from a warehouse.
 *
 * The steps ARE numbered, and the numbers are load-bearing: this is a real
 * sequence in time, and step two cannot happen before step one. That is the
 * only thing that justifies numbering a list — decorative 01/02/03 above three
 * unordered features is the version of this pattern that means nothing.
 *
 * Zones, days and cut-off render only when `lib/fulfillment.ts` defines them.
 * An empty schedule is better than an invented one — a made-up delivery day is
 * a promise a customer will hold the shop to.
 */
export default function HowItWorks() {
  const facts = [
    { label: 'Cobertura', value: ZONES },
    { label: 'Días', value: DAYS },
    { label: 'Corte de pedido', value: CUTOFF },
  ].filter((f): f is { label: string; value: string } => f.value !== null);

  return (
    <Section labelledBy="como-funciona-heading">
      <Container>
        <SectionHeader
          id="como-funciona-heading"
          title={
            <>
              Cómo <em>funciona</em>
            </>
          }
          lede="Compras del producto que llegó ese día, no de una bodega. Son tres pasos."
          className="mb-12"
        />

        <ol className="grid grid-cols-1 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="border-t border-border pt-6 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:first:border-l-0 sm:first:pl-0"
            >
              {/* Sans, not the display face: this is an index, and the system
                  gives serif to voice and sans to anything the reader uses to
                  navigate. Brand at 35% keeps it a marker rather than a
                  headline competing with the step's own title. */}
              <span
                aria-hidden="true"
                className="font-sans text-sm tabular-nums text-brand/60"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 font-display text-xl font-light md:text-2xl">
                {step.title}
              </h3>
              <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        {facts.length > 0 ? (
          <dl className="mt-12 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:gap-12">
            {facts.map((fact) => (
              <div key={fact.label}>
                <Eyebrow as="dt">{fact.label}</Eyebrow>
                <dd className="mt-1 text-sm">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Container>
    </Section>
  );
}
