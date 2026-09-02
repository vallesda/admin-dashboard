/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

import type { Cart } from '@/lib/cart';

/**
 * El checkout por pasos.
 *
 * Dos cosas que sólo pueden romperse aquí y cuestan un pedido cada una:
 *
 * 1. **Los campos ocultos tienen que seguir enviándose.** Los pasos se ocultan
 *    con `hidden`, no se desmontan, justo porque un campo desmontado no viaja
 *    en el `FormData`. Si alguien "limpia" esto devolviéndolo a un montaje
 *    condicional, el pedido llegaría al servidor sin nombre ni teléfono.
 * 2. **No se puede llegar a pagar con datos inválidos.** La validación del
 *    servidor es la que manda, pero dejar avanzar tres pantallas para fallar al
 *    final es la peor manera de decírselo a alguien.
 */

const cart: Cart = {
  lines: [
    {
      productId: 'p1',
      handle: 'atun',
      name: 'Atún aleta amarilla',
      unitPrice: { amountCents: 48000, currency: 'MXN' },
      quantity: 2,
      image: null,
    },
  ],
} as Cart;

vi.mock('@/components/cart/cart-context', () => ({
  useCart: () => ({ cart, subtotalCents: 96000 }),
}));

vi.mock('./actions', () => ({ placeOrder: vi.fn(async () => ({ error: null, fieldErrors: {} })) }));

const quote = vi.fn(() => ({ quote: null, loading: false }));
vi.mock('./use-delivery-quote', () => ({ useDeliveryQuote: () => quote() }));

const { default: CheckoutForm } = await import('./checkout-form');
const { placeOrder } = await import('./actions');

beforeEach(() => {
  vi.clearAllMocks();
  quote.mockReturnValue({ quote: null, loading: false });
});

const paso = () => screen.getByRole('button', { name: /Continuar|Ir a pagar/ });
const campo = (name: string) =>
  document.querySelector<HTMLInputElement>(`[name="${name}"]`)!;

function llenarDatos({ email = 'ana@example.com' } = {}) {
  fireEvent.change(campo('name'), { target: { value: 'Ana Torres' } });
  fireEvent.change(campo('phone'), { target: { value: '8112345678' } });
  fireEvent.change(campo('email'), { target: { value: email } });
}

describe('avanzar entre pasos', () => {
  it('no deja pasar sin nombre ni teléfono', () => {
    render(<CheckoutForm />);
    fireEvent.click(paso());

    expect(screen.getByText('Escribe tu nombre.')).not.toBeNull();
    expect(screen.getByText('Escribe un teléfono de 10 dígitos.')).not.toBeNull();
  });

  it('exige el correo, que antes era opcional', () => {
    /*
     * Se volvió obligatorio al empezar a cobrar por adelantado: sin correo el
     * comprador se queda sin el comprobante de Stripe y sin nada escrito que
     * pruebe lo que pagó.
     */
    render(<CheckoutForm />);
    llenarDatos({ email: '' });
    fireEvent.click(paso());

    expect(
      screen.getByText('Escribe tu correo: ahí te llega el comprobante.'),
    ).not.toBeNull();
  });

  it('rechaza un correo con forma inservible', () => {
    render(<CheckoutForm />);
    llenarDatos({ email: 'ana@' });
    fireEvent.click(paso());

    expect(screen.getByText('Ese correo no parece válido.')).not.toBeNull();
  });

  it('con los datos completos llega hasta revisar', () => {
    render(<CheckoutForm />);
    llenarDatos();
    fireEvent.click(paso());          // → entrega
    fireEvent.click(paso());          // → revisar

    expect(screen.getByText('Revisa antes de pagar')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Ir a pagar' })).not.toBeNull();
  });

  it('«Continuar» no es un botón de envío', () => {
    /*
     * Media guardia, y conviene saber cuál es la otra mitad.
     *
     * El bug real fue de temporización en un navegador de verdad: sin `key`
     * propia, React reutilizaba el mismo nodo para «Continuar» y «Ir a pagar» y
     * le cambiaba el `type` a `submit` **durante** el clic; el navegador leía el
     * DOM ya mutado y enviaba, saltando «Revisar». Eso **no se reproduce aquí**
     * —happy-dom no ejecuta la acción por defecto igual— y se comprobó
     * quitando el arreglo: esta suite seguía en verde.
     *
     * Quien vigila esa regresión es `e2e/checkout-happy-path.spec.ts`, que
     * exige ver «Revisa antes de pagar» antes de pulsar. Lo que sí se fija aquí
     * es el invariante que un refactor puede borrar de un teclazo.
     */
    render(<CheckoutForm />);
    llenarDatos();

    expect(paso().getAttribute('type')).toBe('button');
    expect(placeOrder).not.toHaveBeenCalled();
  });
});

describe('lo que el formulario sigue enviando', () => {
  it('conserva los campos de los pasos anteriores', () => {
    /*
     * La regresión más cara de este archivo. Si los pasos se desmontaran en vez
     * de ocultarse, al enviar desde «Revisar» el pedido llegaría sin nombre ni
     * teléfono — y el servidor lo rechazaría con un error que el comprador no
     * puede entender ni arreglar.
     */
    render(<CheckoutForm />);
    llenarDatos();
    fireEvent.click(paso());
    fireEvent.click(paso());

    const form = document.querySelector('form')!;
    const data = new FormData(form);

    expect(data.get('name')).toBe('Ana Torres');
    expect(data.get('phone')).toBe('8112345678');
    expect(data.get('email')).toBe('ana@example.com');
  });

  it('manda sólo identificadores y cantidades del carrito', () => {
    render(<CheckoutForm />);

    const lines = document.querySelector<HTMLInputElement>('[name="lines"]')!;

    // Ni precios ni nombres: el panel los pone desde su propio catálogo, así
    // que manipular esto cambia qué se pide, nunca cuánto cuesta.
    expect(JSON.parse(lines.value)).toEqual([{ productId: 'p1', quantity: 2 }]);
  });
});

describe('fuera de cobertura', () => {
  it('bloquea el paso y dice por qué', () => {
    quote.mockReturnValue({
      quote: { covered: false, reason: 'out_of_range' },
      loading: false,
    } as never);

    render(<CheckoutForm />);
    llenarDatos();
    fireEvent.click(paso());

    fireEvent.click(
      screen.getByRole('radio', { name: /Entrega a domicilio/i }),
    );

    // Un control muerto sin explicación es la forma más rápida de perder a
    // alguien que sí quería comprar.
    expect(paso().hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByText(/Todavía no entregamos en ese código postal/i),
    ).not.toBeNull();
  });
});

describe('lo que se lee en revisar', () => {
  it('agrupa el teléfono para poder comprobarlo', () => {
    // Comprobar es la única razón de que esa pantalla exista; diez dígitos
    // corridos hay que recorrerlos con el dedo.
    render(<CheckoutForm />);
    llenarDatos();
    fireEvent.click(paso());
    fireEvent.click(paso());

    expect(screen.getByText('81 1234 5678')).not.toBeNull();
  });

  it('no toca lo que se envía', () => {
    render(<CheckoutForm />);
    llenarDatos();
    fireEvent.click(paso());
    fireEvent.click(paso());

    const data = new FormData(document.querySelector('form')!);
    expect(data.get('phone')).toBe('8112345678');
  });
});

describe('volver atrás', () => {
  it('se puede editar un bloque desde revisar', () => {
    render(<CheckoutForm />);
    llenarDatos();
    fireEvent.click(paso());
    fireEvent.click(paso());

    // Por encabezado: «Tus datos» es a la vez el rótulo del paso y el título
    // del bloque, y eso es correcto — el mismo nombre para lo mismo.
    const bloque = screen
      .getByRole('heading', { name: 'Tus datos', level: 3 })
      .closest('div')!;
    fireEvent.click(within(bloque).getByRole('button', { name: /Editar/ }));

    // De vuelta en el paso 1, con lo escrito intacto.
    expect(campo('name').value).toBe('Ana Torres');
  });
});
