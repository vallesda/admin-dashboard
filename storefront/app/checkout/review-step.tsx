'use client';

/**
 * Lo último que se lee antes de ir a pagar.
 *
 * Sustituye al bloque «Cómo se paga», que explicaba con dos frases lo que
 * ahora se demuestra: aquí está tu pedido, este es el total, este botón te
 * lleva a pagarlo. Una pantalla que enseña los datos vale más que un párrafo
 * que promete lo que va a pasar con ellos.
 *
 * Cada bloque lleva su «Editar» al paso que lo produjo. Es la razón de ser de
 * un paso de revisión: encontrar un dígito mal en el teléfono y poder
 * arreglarlo sin deshacer el camino.
 */

export type ReviewValues = {
  name: string;
  phone: string;
  email: string;
  street: string;
  extNumber: string;
  intNumber: string;
  neighborhood: string;
  postalCode: string;
  city: string;
  state: string;
  references: string;
  notes: string;
};

export default function ReviewStep({
  values,
  fulfillment,
  onEdit,
}: {
  values: ReviewValues;
  fulfillment: 'pickup' | 'delivery';
  onEdit: (step: number) => void;
}) {
  return (
    <section className="flex flex-col gap-6" aria-labelledby="revisar-titulo">
      <div>
        <h2
          id="revisar-titulo"
          className="font-display text-2xl font-light"
        >
          Revisa antes de pagar
        </h2>
        <p className="mt-1 text-sm text-muted">
          Si algo no está bien, corrígelo aquí. Después te llevamos a la página
          de pago.
        </p>
      </div>

      <Block title="Tus datos" onEdit={() => onEdit(0)}>
        <Line label="Nombre" value={values.name} />
        <Line label="Teléfono" value={formatPhone(values.phone)} />
        <Line label="Correo" value={values.email} />
      </Block>

      <Block title="Entrega" onEdit={() => onEdit(1)}>
        <Line
          label="Cómo"
          value={
            fulfillment === 'pickup'
              ? 'Recoger en tienda'
              : 'Entrega a domicilio'
          }
        />

        {fulfillment === 'delivery' ? (
          <>
            <Line label="Dirección" value={streetLine(values)} />
            <Line
              label="Colonia"
              value={[values.neighborhood, values.postalCode]
                .filter(Boolean)
                .join(', ')}
            />
            <Line
              label="Municipio"
              value={[values.city, values.state].filter(Boolean).join(', ')}
            />
            {values.references ? (
              <Line label="Referencias" value={values.references} />
            ) : null}
          </>
        ) : null}

        {values.notes ? <Line label="Notas" value={values.notes} /> : null}
      </Block>
    </section>
  );
}

/**
 * `8112345678` → `81 1234 5678`.
 *
 * Sólo para leer. Un teléfono de diez dígitos corridos hay que recorrerlo con
 * el dedo para comprobarlo, y comprobarlo es la única razón de que esta
 * pantalla exista. Agrupado se ve el error de un vistazo.
 *
 * Lo que se envía sigue siendo lo que se escribió: esto no toca el campo.
 * Cualquier otra forma —una extensión, un número de diez dígitos con lada de
 * otro país— se devuelve tal cual en vez de partirla mal.
 */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 10) return value;
  return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
}

/** «Calle 123 int. 4», como se dice en voz alta. */
function streetLine(v: ReviewValues): string {
  const base = [v.street, v.extNumber].filter(Boolean).join(' ');
  return v.intNumber ? `${base} int. ${v.intNumber}` : base;
}

function Block({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-surface">
      <div className="flex items-baseline justify-between gap-4 border-b border-border px-4 py-3">
        <h3 className="font-display text-lg font-normal">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-sm text-sm text-brand underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
        >
          Editar
          <span className="sr-only"> {title.toLowerCase()}</span>
        </button>
      </div>

      <dl className="flex flex-col gap-2 px-4 py-3">{children}</dl>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 text-sm">
      <dt className="text-muted">{label}</dt>
      {/* `break-words`: un correo largo no puede ensanchar la columna y sacar
          el resumen de la pantalla en un teléfono. */}
      <dd className="break-words">{value || '—'}</dd>
    </div>
  );
}
