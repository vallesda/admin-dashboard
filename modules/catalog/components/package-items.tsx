'use client';

import { useActionState, useEffect, useRef } from 'react';

import { formatCentavos } from '@/lib/money';
import { IDLE_RESULT, type ActionResult } from '@/lib/action-result';
import { addPackageItem } from '../actions';
import type { PackageItemRowView } from '../queries';
import { RemoveItem } from './package-buttons';
import Panel from '@/app/ui/kit/panel';
import Badge from '@/app/ui/kit/badge';
import EmptyState from '@/app/ui/kit/empty-state';
import { Button } from '@/app/ui/button';
import { useToast } from '@/app/ui/kit/toast';
import { TableShell, Table, THead, TH, TBody, TR, TD } from '@/app/ui/kit/table';

/**
 * The lines of one package: what the recipe needs, and how much of each.
 *
 * A form rather than a modal. Adding four pieces to a bundle is a repetitive
 * task, and a dialog that has to be reopened for every one of them turns four
 * actions into twelve. The select keeps focus after each add, so the whole
 * bundle can be filled without touching the mouse.
 *
 * Only `active` products are offered. Putting a draft into a published bundle
 * would publish it through a side door, and the storefront would then drop the
 * line silently because it filters to active — a bundle quietly missing a piece
 * is exactly the failure this screen exists to prevent.
 */
export default function PackageItems({
  packageId,
  items,
  options,
}: {
  packageId: string;
  items: PackageItemRowView[];
  options: { id: string; name: string; sku: string; priceCents: number }[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    addPackageItem.bind(null, packageId),
    IDLE_RESULT,
  );
  const { notify } = useToast();
  const announced = useRef<ActionResult>(IDLE_RESULT);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'idle' || announced.current === state) return;
    announced.current = state;
    notify({
      tone: state.status === 'ok' ? 'ok' : 'error',
      message: state.message,
    });
    // Reset only on success, so a rejected quantity stays on screen to be fixed.
    if (state.status === 'ok') formRef.current?.reset();
  }, [state, notify]);

  const total = items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0,
  );

  return (
    <Panel
      title="Productos del paquete"
      description="El total es la suma de las líneas. Un paquete no tiene precio propio."
      bodyClassName=""
    >
      <div className="border-b border-line p-4">
        <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label
              htmlFor="productId"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Producto
            </label>
            <select
              id="productId"
              name="productId"
              required
              className="field cursor-pointer"
              defaultValue=""
            >
              <option value="" disabled>
                Elige un producto…
              </option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} · {o.sku} · {formatCentavos(o.priceCents)}
                </option>
              ))}
            </select>
          </div>

          <div className="w-28">
            <label
              htmlFor="quantity"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Cantidad
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              max={99}
              defaultValue={1}
              required
              className="field tabular-nums"
            />
          </div>

          <Button type="submit" disabled={pending || options.length === 0}>
            {pending ? 'Agregando…' : 'Agregar'}
          </Button>
        </form>

        {options.length === 0 ? (
          <p className="mt-2 text-xs text-warn">
            No hay productos activos que agregar. Activa alguno desde Productos.
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="El paquete está vacío"
          description="Agrega las piezas que lleva la receta. Mientras no tenga ninguna, no aparece en la tienda."
        />
      ) : (
        <>
          <TableShell className="rounded-none border-0">
            <Table>
              <THead>
                <TH>Producto</TH>
                <TH>SKU</TH>
                <TH align="right">Precio</TH>
                <TH align="right">Cantidad</TH>
                <TH align="right">Importe</TH>
                <TH srOnly>Acciones</TH>
              </THead>
              <TBody>
                {items.map((item) => (
                  <TR key={item.productId}>
                    <TD>
                      <span className="font-medium text-ink">{item.name}</span>
                      {item.status !== 'active' ? (
                        /* The line still exists but the storefront drops it,
                           so the bundle silently ships short. Said out loud. */
                        <Badge tone="danger" className="ml-2">
                          No activo
                        </Badge>
                      ) : null}
                    </TD>
                    <TD muted className="whitespace-nowrap font-mono text-xs">
                      {item.sku}
                    </TD>
                    <TD numeric muted className="whitespace-nowrap">
                      {formatCentavos(item.priceCents)}
                    </TD>
                    <TD numeric className="whitespace-nowrap">
                      {item.quantity}
                    </TD>
                    <TD numeric className="whitespace-nowrap font-medium">
                      {formatCentavos(item.priceCents * item.quantity)}
                    </TD>
                    <TD>
                      <div className="flex justify-end">
                        <RemoveItem
                          packageId={packageId}
                          productId={item.productId}
                          name={item.name}
                        />
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
              <tfoot className="border-t-2 border-line bg-subtle/60">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink">
                    Total del paquete
                  </td>
                  <td className="px-4 py-2.5 text-right text-base font-semibold tabular-nums text-ink">
                    {formatCentavos(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </Table>
          </TableShell>
        </>
      )}
    </Panel>
  );
}
