/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FulfillmentFields from './fulfillment-fields';

/**
 * Cómo lo quiere recibir, y a dónde.
 *
 * Dos reglas con consecuencia real: la dirección sólo se pide cuando hace falta
 * —pedirla para recoger en tienda es fricción pura— y el estado va fijo mientras
 * la tienda sólo reparta en Nuevo León.
 *
 * La segunda esconde una trampa que ya se pisó una vez: un control deshabilitado
 * **no viaja en el envío del formulario**. Sin el campo oculto, el estado llega
 * vacío al servidor y el pedido se cae con un error que nadie escribió.
 */
function Harness({ initial = 'pickup' }: { initial?: 'pickup' | 'delivery' }) {
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>(initial);
  const [postalCode, setPostalCode] = useState('');

  return (
    <FulfillmentFields
      fulfillment={fulfillment}
      onFulfillmentChange={setFulfillment}
      postalCode={postalCode}
      onPostalCodeChange={setPostalCode}
      errors={{}}
    />
  );
}

const direccion = () => screen.queryByLabelText(/^Calle$/);

describe('la dirección', () => {
  it('no se pide para recoger en tienda', () => {
    render(<Harness initial="pickup" />);

    expect(direccion()).toBeNull();
  });

  it('aparece al elegir domicilio', async () => {
    render(<Harness initial="pickup" />);

    await userEvent.click(screen.getByRole('radio', { name: /domicilio/i }));

    expect(direccion()).not.toBeNull();
    expect(screen.getByLabelText(/código postal/i)).not.toBeNull();
  });

  it('desaparece al volver a recoger', async () => {
    render(<Harness initial="delivery" />);
    expect(direccion()).not.toBeNull();

    await userEvent.click(screen.getByRole('radio', { name: /recoger/i }));

    // Importa que salga del DOM: un campo escondido se sigue enviando, y
    // mandaría una dirección para un pedido que se recoge en el mostrador.
    expect(direccion()).toBeNull();
  });
});

describe('el estado', () => {
  it('va fijo en Nuevo León y no se puede cambiar', async () => {
    render(<Harness initial="delivery" />);

    const visible = screen.getByLabelText('Estado') as HTMLInputElement;
    expect(visible.value).toBe('Nuevo León');
    expect(visible.disabled).toBe(true);
  });

  it('LA TRAMPA: aun deshabilitado, el valor sí se envía', async () => {
    // Un `disabled` no viaja en el `FormData`. Sin el campo oculto el servidor
    // recibiría un estado vacío y rechazaría un pedido perfectamente válido.
    const { container } = render(<Harness initial="delivery" />);

    const oculto = container.querySelector('input[type="hidden"][name="state"]');
    expect(oculto?.getAttribute('value')).toBe('Nuevo León');
  });

  it('dice por qué está fijo, en vez de dejarlo sin explicación', async () => {
    render(<Harness initial="delivery" />);

    expect(screen.getByText(/sólo entregamos en Nuevo León/i)).not.toBeNull();
  });
});

describe('el código postal', () => {
  it('sube al formulario, que es quien cotiza el envío', async () => {
    const onPostalCodeChange = vi.fn();

    render(
      <FulfillmentFields
        fulfillment="delivery"
        onFulfillmentChange={() => {}}
        postalCode=""
        onPostalCodeChange={onPostalCodeChange}
        errors={{}}
      />,
    );

    await userEvent.type(screen.getByLabelText(/código postal/i), '66');

    expect(onPostalCodeChange).toHaveBeenCalled();
  });
});
