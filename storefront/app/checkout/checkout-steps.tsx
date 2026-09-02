'use client';

/**
 * Dónde va el comprador dentro del checkout.
 *
 * Los números son legítimos aquí y sólo aquí. El sistema los prohíbe como
 * adorno de sección —`01 / 02 / 03` sobre tres columnas que no tienen orden—,
 * pero un formulario por pasos **sí** tiene una secuencia, y saber cuántos
 * faltan es justo lo que decide si alguien lo termina o lo abandona.
 *
 * El estado nunca se dice sólo con color: el paso activo lleva `aria-current`,
 * peso tipográfico y una regla de 2px; los cumplidos cambian el número por una
 * palomita dibujada. Quien no distinga el verde del gris sigue sabiendo dónde
 * está.
 */

export type StepId = 'datos' | 'entrega' | 'revisar';

export const STEPS: { id: StepId; label: string }[] = [
  { id: 'datos', label: 'Tus datos' },
  { id: 'entrega', label: 'Entrega' },
  { id: 'revisar', label: 'Revisar' },
];

export default function CheckoutSteps({
  current,
  furthest,
  onGoTo,
}: {
  current: number;
  /** Hasta dónde ha llegado: sólo lo ya visitado se puede volver a pulsar. */
  furthest: number;
  onGoTo: (index: number) => void;
}) {
  return (
    <nav aria-label="Pasos del pedido">
      <ol className="flex items-stretch gap-1">
        {STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;
          const reachable = index <= furthest;

          return (
            <li key={step.id} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => reachable && onGoTo(index)}
                disabled={!reachable}
                aria-current={active ? 'step' : undefined}
                className={[
                  'group flex w-full flex-col gap-2 pb-2 text-left',
                  // La regla de 2px es la que carga el estado. El color la
                  // acompaña; no la sustituye.
                  active
                    ? 'border-b-2 border-brand'
                    : done
                      ? 'border-b-2 border-brand/35'
                      : 'border-b-2 border-border',
                  reachable
                    ? 'cursor-pointer'
                    : 'cursor-default',
                ].join(' ')}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={[
                      'flex h-6 w-6 flex-none items-center justify-center rounded-full border text-xs tabular-nums transition-colors',
                      active
                        ? 'border-brand bg-brand text-background'
                        : done
                          ? 'border-brand bg-brand-soft text-brand'
                          : 'border-border-strong text-muted',
                    ].join(' ')}
                  >
                    {done ? <CheckMark /> : index + 1}
                  </span>

                  <span
                    className={[
                      'truncate text-sm',
                      active
                        ? 'font-medium text-foreground'
                        : done
                          ? 'text-brand'
                          : 'text-muted',
                    ].join(' ')}
                  >
                    {step.label}
                  </span>
                </span>

                {/* Para lectores de pantalla, el número dicho con palabras. */}
                <span className="sr-only">
                  {`Paso ${index + 1} de ${STEPS.length}`}
                  {done ? ', completado' : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Dibujada, no un carácter.
 *
 * Un «✓» de Unicode se renderiza distinto en cada sistema y hereda la métrica
 * de la fuente de texto; este trazo es el mismo en todas partes y del mismo
 * grosor que el resto de iconos del sitio.
 */
function CheckMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}
