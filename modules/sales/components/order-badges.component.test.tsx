/**
 * @vitest-environment happy-dom
 *
 * El DOM se pide por archivo, no por patrón en la configuración.
 *
 * `environmentMatchGlobs` dejó de aplicarse en Vitest 4 y el fallo fue mudo:
 * las pruebas corrían en Node y morían con «document is not defined». Una
 * directiva en el archivo que la necesita no se puede desincronizar de la
 * configuración, porque no depende de ella.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { OrderStatusBadge, PaymentStatusBadge } from './order-badges';

/**
 * Los distintivos de estado.
 *
 * Se prueban porque son la única cosa que un operador lee de un vistazo en una
 * tabla de cien filas, y porque el proyecto tiene una regla explícita al
 * respecto: **el estado nunca se comunica sólo con color**. Un cambio que
 * quitara el texto pasaría desapercibido en una revisión visual y rompería la
 * página para quien no distingue el verde del ámbar.
 */
describe('OrderStatusBadge', () => {
  it('dice el estado con palabras, no sólo con color', () => {
    render(<OrderStatusBadge status="preparing" />);
    expect(screen.getByText('En preparación')).toBeDefined();
  });

  it('cubre los seis estados sin caer en el identificador crudo', () => {
    const statuses = [
      ['pending', 'Pendiente'],
      ['confirmed', 'Confirmado'],
      ['preparing', 'En preparación'],
      ['ready', 'Listo'],
      ['completed', 'Completado'],
      ['cancelled', 'Cancelado'],
    ] as const;

    for (const [status, label] of statuses) {
      const { unmount } = render(<OrderStatusBadge status={status} />);
      expect(screen.getByText(label), status).toBeDefined();
      unmount();
    }
  });
});

describe('PaymentStatusBadge', () => {
  it('distingue «cobrando» de «sin pagar»', () => {
    // La distinción que motivó añadir el estado: un vale emitido no es un
    // cliente que no pagó, y el mostrador decide distinto según cuál sea.
    const { unmount } = render(<PaymentStatusBadge status="processing" />);
    expect(screen.getByText('Cobrando')).toBeDefined();
    unmount();

    render(<PaymentStatusBadge status="unpaid" />);
    expect(screen.getByText('Sin pagar')).toBeDefined();
  });

  it('nombra el reembolso parcial en vez de redondearlo', () => {
    // Un pedido de $540 al que se devolvieron $180 no es «pagado» ni
    // «reembolsado»; llamarlo cualquiera de los dos sería mentir.
    render(<PaymentStatusBadge status="partially_refunded" />);
    expect(screen.getByText('Reembolso parcial')).toBeDefined();
  });

  it('cubre los cinco estados de pago', () => {
    const statuses = [
      ['unpaid', 'Sin pagar'],
      ['processing', 'Cobrando'],
      ['paid', 'Pagado'],
      ['partially_refunded', 'Reembolso parcial'],
      ['refunded', 'Reembolsado'],
    ] as const;

    for (const [status, label] of statuses) {
      const { unmount } = render(<PaymentStatusBadge status={status} />);
      expect(screen.getByText(label), status).toBeDefined();
      unmount();
    }
  });
});
