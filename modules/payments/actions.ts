'use server';

/**
 * PAG — Server Actions.
 *
 * Adapters, not domain (project principle 9): they authorise, validate with Zod
 * and delegate. Every rule about money lives in `service.ts`.
 *
 * Authorisation is `admin` throughout, matching the permission matrix in
 * SRS §4: a `staff` can prepare and hand over an order, but declaring that
 * money came in — or went back out — is an accounting statement.
 */
import { revalidatePath } from 'next/cache';

import { AuthorizationError, requireRole } from '@/lib/auth/guard';
import { isDomainError } from '@/lib/errors';
import { failed, ok, type ActionResult } from '@/lib/action-result';
import { formatCentavos } from '@/lib/money';
import * as sales from '@/modules/sales/service';
import * as service from './service';
import { providerRefund } from './stripe';
import { openCheckout, voidOpenAttempts } from './checkout';
import { allowedReturnOrigins } from '@/lib/stripe';
import {
  cancelWithMoneySchema,
  recordPaymentSchema,
  refundSchema,
} from './validators';

const ORDERS_PATH = '/dashboard/orders';

function revalidateOrder(orderId: string) {
  revalidatePath(ORDERS_PATH);
  revalidatePath(`${ORDERS_PATH}/${orderId}`);
}

/** Turns an expected refusal into a red toast; lets real bugs through. */
function toResult(error: unknown, fallback: string): ActionResult {
  if (error instanceof AuthorizationError) return failed(error.message);
  if (!isDomainError(error)) throw error;
  return failed(error.message ?? fallback);
}

/**
 * Records money taken at the counter, by the driver, or into the bank.
 *
 * Never used for Stripe: an online charge is written by the webhook from what
 * Stripe reports. Letting an operator type in a card payment Stripe never saw
 * would put a claim in the ledger that no reconciliation could settle — which
 * is why `recordPaymentSchema` does not accept `stripe` as a provider.
 */
export async function recordPayment(
  orderId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = recordPaymentSchema.safeParse({
    provider: formData.get('provider'),
    amountCents: formData.get('amount'),
    note: formData.get('note'),
  });

  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .filter(Boolean)[0];
    return failed(first ?? 'Revisa los datos del cobro.');
  }

  try {
    const session = await requireRole('admin');
    await service.recordPayment({
      orderId,
      provider: parsed.data.provider,
      amountCents: parsed.data.amountCents,
      note: parsed.data.note,
      actorId: session.user.id,
    });
  } catch (error) {
    return toResult(error, 'No se pudo registrar el cobro.');
  }

  revalidateOrder(orderId);
  return ok(`Cobro de ${formatCentavos(parsed.data.amountCents)} registrado.`);
}

/**
 * Collects and hands the order over in one move — gate P3 made usable.
 *
 * Blocking `completed` on an unpaid order is correct and, on its own, cruel:
 * it would send the person at the counter to another screen to record the
 * money and then back again, with a customer waiting. So the button that
 * appears on a `ready` order without a collection does both, in one
 * transaction. One click, two facts, and no orders handed over on trust.
 */
export async function settleAndComplete(
  orderId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = recordPaymentSchema.safeParse({
    provider: formData.get('provider'),
    amountCents: formData.get('amount'),
    note: formData.get('note'),
  });

  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .filter(Boolean)[0];
    return failed(first ?? 'Revisa los datos del cobro.');
  }

  try {
    const session = await requireRole('admin');

    await service.withTransaction(async (tx) => {
      await service.recordPayment(
        {
          orderId,
          provider: parsed.data.provider,
          amountCents: parsed.data.amountCents,
          note: parsed.data.note,
          actorId: session.user.id,
        },
        tx,
      );

      // Inside the same transaction, so the sale movement and the collection
      // are one fact. If the stock step fails, the money is not recorded
      // either — and the operator retries with nothing half-done behind them.
      await sales.changeOrderStatus(orderId, 'completed', session.user.id, {
        tx,
      });
    });
  } catch (error) {
    return toResult(error, 'No se pudo cobrar y entregar el pedido.');
  }

  revalidateOrder(orderId);
  return ok(
    `Cobro de ${formatCentavos(parsed.data.amountCents)} registrado y pedido entregado.`,
  );
}

/**
 * Gives money back.
 *
 * The service picks the branch: a Stripe charge goes through Stripe's API, a
 * counter payment goes back as notes and is only recorded here. The form is the
 * same either way, and so is the row it produces.
 */
export async function refundOrder(
  orderId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = refundSchema.safeParse({
    scope: formData.get('scope'),
    amountCents: formData.get('amount') || undefined,
    reason: formData.get('reason'),
    note: formData.get('note'),
  });

  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .filter(Boolean)[0];
    return failed(first ?? 'Revisa los datos del reembolso.');
  }

  let amount: number;

  try {
    const session = await requireRole('admin');
    const row = await service.refundOrder(
      {
        orderId,
        amountCents:
          parsed.data.scope === 'full' ? 'full' : parsed.data.amountCents!,
        reason: parsed.data.reason,
        note: parsed.data.note,
        actorId: session.user.id,
      },
      providerRefund,
    );
    amount = row.amountCents;
  } catch (error) {
    return toResult(error, 'No se pudo registrar el reembolso.');
  }

  revalidateOrder(orderId);
  return ok(`Reembolso de ${formatCentavos(amount)} registrado.`);
}

/**
 * Cancels an order that holds money — gate P4.
 *
 * Cancelling is not blocked; the decision about the money is what becomes
 * unavoidable. A shop legitimately keeps the payment sometimes: the customer
 * never came and the fish spoiled. What is unacceptable is keeping it with no
 * record, which is why `keep` demands a written reason.
 */
export async function cancelOrderWithMoney(
  orderId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = cancelWithMoneySchema.safeParse({
    decision: formData.get('decision'),
    note: formData.get('note'),
  });

  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .filter(Boolean)[0];
    return failed(first ?? 'Revisa la decisión sobre el dinero.');
  }

  try {
    const session = await requireRole('admin');

    if (parsed.data.decision === 'refund') {
      await service.refundOrder(
        {
          orderId,
          amountCents: 'full',
          reason: 'requested_by_customer',
          note: parsed.data.note,
          actorId: session.user.id,
        },
        providerRefund,
      );
    } else {
      // Kept: the money stays with the shop and the reason is written into the
      // ledger as a note on a zero-provider record, so the decision has an
      // author and a date like every other money movement.
      await service.noteRetainedPayment(
        orderId,
        parsed.data.note!,
        session.user.id,
      );
    }

    await sales.changeOrderStatus(orderId, 'cancelled', session.user.id, {
      confirmed: true,
    });
  } catch (error) {
    return toResult(error, 'No se pudo cancelar el pedido.');
  }

  revalidateOrder(orderId);
  return ok(
    parsed.data.decision === 'refund'
      ? 'Pedido cancelado y dinero devuelto.'
      : 'Pedido cancelado. El cobro se retuvo con nota.',
  );
}

/**
 * Sends a payment link for an order that was taken at the counter.
 *
 * The case the shop will ask for in its first week: a 1,400-peso phone order
 * for delivery that nobody wants to put on a motorbike uncollected.
 *
 * There is no new payment code here. It is `openCheckout` — the same function
 * the storefront calls — invoked from the admin instead, which is the evidence
 * that the abstraction sits in the right place: if this had needed a second
 * service, the model would have been wrong.
 *
 * The agreement changes with it. An order that is now expected to be paid
 * online must stop being advanceable by hand, or gate P1 would be enforced
 * against a mode that no longer describes the order.
 */
export async function sendPaymentLink(
  orderId: string,
  _prev: ActionResult,
): Promise<ActionResult> {
  let url: string;

  try {
    await requireRole('admin');

    const origin = allowedReturnOrigins()[0];

    if (!origin) {
      return failed(
        'Falta configurar STOREFRONT_ALLOWED_ORIGINS para poder generar ligas de pago.',
      );
    }

    const token = await service.publicTokenOf(orderId);

    /*
     * Order matters here, and getting it wrong the first time was a real bug:
     * flipping the mode before opening the session left the order stuck in
     * `online` when the provider was unavailable, and gate P1 then refused to
     * let the counter advance an order nobody could pay online either.
     *
     * Open first. Only once there is a live payment page does the agreement
     * change.
     */
    const result = await openCheckout({
      orderId,
      successUrl: `${origin}/pedido/${token}`,
      cancelUrl: `${origin}/pedido/${token}`,
    });

    await service.setPaymentModeOnline(orderId);

    url = result.checkoutUrl;
  } catch (error) {
    return toResult(error, 'No se pudo generar la liga de pago.');
  }

  revalidateOrder(orderId);
  // The URL travels in the toast so it can be copied straight into WhatsApp.
  // Anything longer-lived would mean storing a link that expires in 24 hours.
  return ok(`Liga de pago lista: ${url}`);
}

/**
 * Cancels an order and closes whatever was open to pay it.
 *
 * Cancellation moved here from Sales because it stopped being purely
 * operational the moment there was money to think about. Two things now have to
 * happen together, and Sales must not know about the second: `PAG` depends on
 * `SAL`, never the other way round (DOCS/README.md, dependencias permitidas).
 *
 * `admin`, not `staff`. SRS §4 has always said cancelling is an admin action —
 * it releases stock and, increasingly, touches money — and the action was
 * checking `staff` regardless. Same class of gap as `DT-009`: the rule was
 * written down and never enforced.
 *
 * Orders holding money go through `cancelOrderWithMoney` instead, which forces
 * the refund decision (gate P4). This one is for the rest.
 */
export async function cancelOrder(orderId: string): Promise<ActionResult> {
  try {
    const session = await requireRole('admin');

    // Before releasing the stock, not after: while the order still exists there
    // is something to attach the cancelled attempt to, and a customer staring
    // at a payment page should stop being able to pay for goods we just put
    // back on sale.
    await voidOpenAttempts(orderId);
    await sales.changeOrderStatus(orderId, 'cancelled', session.user.id);
  } catch (error) {
    return toResult(error, 'No se pudo cancelar el pedido.');
  }

  revalidateOrder(orderId);
  revalidatePath('/dashboard/inventory');

  return ok('Pedido cancelado y el inventario liberado.');
}
