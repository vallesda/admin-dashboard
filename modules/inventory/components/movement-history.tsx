import clsx from 'clsx';

import { listMovements } from '../queries';
import type { MovementType } from '@/db/schema/inventory';
import { TableShell, Table, THead, TH, TBody, TR, TD } from '@/app/ui/kit/table';

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
      <p className="text-sm text-ink-muted">
        Todavía no hay movimientos para este producto.
      </p>
    );
  }

  return (
    <TableShell>
      <Table>
        <THead>
          <TH>Cuándo</TH>
          <TH>Tipo</TH>
          <TH align="right">En mano</TH>
          <TH align="right">Reservado</TH>
          <TH>Nota</TH>
          <TH>Quién</TH>
        </THead>
        <TBody>
          {movements.map((m) => (
            <TR key={m.id}>
              <TD muted className="whitespace-nowrap">
                {dateTime.format(m.createdAt)}
              </TD>
              <TD className="whitespace-nowrap">{TYPE_LABEL[m.type]}</TD>
              {/*
                A signed delta is the one place in the panel where colour is
                allowed to carry meaning on its own — and it does not have to,
                because the sign is right there in the text. The colour just
                makes a column of entries and withdrawals separable at a glance.
              */}
              <TD
                numeric
                className={clsx(
                  'whitespace-nowrap font-medium',
                  m.onHandDelta < 0 && 'text-danger',
                  m.onHandDelta > 0 && 'text-ok',
                )}
              >
                {m.onHandDelta === 0 ? '—' : signed(m.onHandDelta)}
              </TD>
              <TD numeric muted className="whitespace-nowrap">
                {m.reservedDelta === 0 ? '—' : signed(m.reservedDelta)}
              </TD>
              <TD muted>{m.note ?? '—'}</TD>
              <TD muted className="whitespace-nowrap">
                {/* Null when the account was deleted: the movement survives. */}
                {m.actorName ?? 'Usuario eliminado'}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableShell>
  );
}
