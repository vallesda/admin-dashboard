import clsx from 'clsx';

import { listMovements } from '../queries';
import type { MovementType } from '@/db/schema/inventory';

const TYPE_LABEL: Record<MovementType, string> = {
  receive: 'Entrada',
  adjustment: 'Ajuste',
  reserve: 'Reserva',
  release: 'Liberación',
  sale: 'Venta',
};

const dateTime = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Mexico_City',
});

/** Signed number, so `+10` reads as clearly as `-3`. */
function signed(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

/**
 * The ledger for one product — the answer to "why is stock at 17?".
 *
 * Read-only by construction: the table is append-only in the database, so there
 * is deliberately no edit or delete affordance here. A correction is a new
 * adjustment.
 */
export default async function MovementHistory({
  productId,
}: {
  productId: string;
}) {
  const movements = await listMovements(productId);

  if (movements.length === 0) {
    return (
      <p className="mt-4 text-sm text-gray-500">
        Todavía no hay movimientos para este producto.
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-lg bg-gray-50 p-2">
      <table className="min-w-full text-gray-900">
        <thead className="text-left text-sm font-normal">
          <tr>
            <th scope="col" className="px-4 py-4 font-medium">
              Cuándo
            </th>
            <th scope="col" className="px-3 py-4 font-medium">
              Tipo
            </th>
            <th scope="col" className="px-3 py-4 text-right font-medium">
              En mano
            </th>
            <th scope="col" className="px-3 py-4 text-right font-medium">
              Reservado
            </th>
            <th scope="col" className="px-3 py-4 font-medium">
              Nota
            </th>
            <th scope="col" className="px-3 py-4 font-medium">
              Quién
            </th>
          </tr>
        </thead>
        <tbody className="bg-white text-sm">
          {movements.map((m) => (
            <tr key={m.id} className="border-b last-of-type:border-none">
              <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                {dateTime.format(m.createdAt)}
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                {TYPE_LABEL[m.type]}
              </td>
              <td
                className={clsx(
                  'whitespace-nowrap px-3 py-3 text-right tabular-nums',
                  m.onHandDelta < 0 && 'text-red-600',
                  m.onHandDelta > 0 && 'text-green-700',
                )}
              >
                {m.onHandDelta === 0 ? '—' : signed(m.onHandDelta)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-gray-500">
                {m.reservedDelta === 0 ? '—' : signed(m.reservedDelta)}
              </td>
              <td className="px-3 py-3 text-gray-500">{m.note ?? '—'}</td>
              <td className="whitespace-nowrap px-3 py-3 text-gray-500">
                {/* Null when the account was deleted: the movement survives. */}
                {m.actorName ?? 'Usuario eliminado'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
