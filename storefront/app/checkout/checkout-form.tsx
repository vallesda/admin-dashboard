'use client';

import { useActionState, useRef, useState } from 'react';

import { useCart } from '@/components/cart/cart-context';
import Button, { ButtonLink } from '@/components/ui/button';
import { useDeliveryQuote } from './use-delivery-quote';
import { placeOrder } from './actions';
import { EMPTY_STATE } from './form-state';
import CustomerFields from './customer-fields';
import FulfillmentFields from './fulfillment-fields';
import OrderSummary from './order-summary';
import CheckoutSteps, { STEPS } from './checkout-steps';
import ReviewStep, { type ReviewValues } from './review-step';

/**
 * Checkout, en tres pasos.
 *
 * Este archivo es el índice del formulario, no su contenido. Cada zona vive en
 * su propio archivo con el nombre de lo que pregunta:
 *
 * - `customer-fields`  … quién es y cómo se le llama
 * - `fulfillment-fields` … cómo lo recibe y a dónde
 * - `review-step`      … lo que va a pagar, con un «Editar» por bloque
 * - `order-summary`    … qué se lleva y cuánto suma
 * - `checkout-steps`   … dónde va dentro del proceso
 *
 * Es un Componente de Cliente porque el carrito que está pagando vive en
 * `localStorage`: el servidor no puede leerlo, así que las líneas viajan en un
 * campo oculto. Van sólo identificadores y cantidades — el panel pone los
 * precios desde su propio catálogo, así que este contenido no puede cambiar lo
 * que se cobra.
 *
 * ## Un solo `<form>`, tres pantallas
 *
 * Los pasos se ocultan con el atributo `hidden`, **no** se desmontan. Un campo
 * desmontado no viaja en el `FormData`, así que al enviar desde «Revisar» se
 * perderían el nombre y el teléfono. Ocultos siguen enviándose, que es
 * exactamente lo que se necesita.
 *
 * De ahí sale `noValidate`: el navegador se niega a enviar un formulario con un
 * campo `required` vacío y **no puede enfocar uno oculto** para explicar por
 * qué, así que la validación nativa dejaría el botón muerto sin decir nada. El
 * `required` se queda por lo que le dice a un lector de pantalla; quien
 * comprueba es `validateStep`, y encima el servidor, que es el que manda.
 *
 * El modo de pago no está aquí ni en ninguna zona. Lo fija el servidor en
 * `placeOrder`: una regla que decide si se cobra no puede depender de un campo
 * que el navegador puede editar.
 */
export default function CheckoutForm() {
  const { cart, subtotalCents } = useCart();
  const [state, formAction, pending] = useActionState(placeOrder, EMPTY_STATE);

  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  /** Hasta dónde llegó, para poder volver atrás pulsando el indicador. */
  const [furthest, setFurthest] = useState(0);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState<ReviewValues>(EMPTY_REVIEW);

  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup');
  const [postalCode, setPostalCode] = useState('');

  /*
   * La cotización vive en su propio hook. Era la única lógica de verdad de este
   * archivo —cuándo pedir, qué respuesta descartar, cuándo lo que hay en
   * pantalla dejó de valer— y estaba mezclada con el marcado.
   */
  const { quote, loading: quoteLoading } = useDeliveryQuote({
    enabled: fulfillment === 'delivery',
    postalCode,
    subtotalCents,
  });

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 py-10">
        <p className="text-muted">
          Tu carrito está vacío, así que todavía no hay nada que pedir.
        </p>
        <ButtonLink href="/search" variant="secondary">
          Ver productos
        </ButtonLink>
      </div>
    );
  }

  const lines = cart.lines.map((l) => ({
    productId: l.productId,
    quantity: l.quantity,
  }));

  /** Lo escrito hasta ahora, leído del propio formulario. */
  function readValues(): ReviewValues {
    const form = formRef.current;
    if (!form) return EMPTY_REVIEW;

    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) ?? '').trim();

    return {
      name: text('name'),
      phone: text('phone'),
      email: text('email'),
      street: text('street'),
      extNumber: text('extNumber'),
      intNumber: text('intNumber'),
      neighborhood: text('neighborhood'),
      postalCode: text('postalCode'),
      city: text('city'),
      state: text('state'),
      references: text('references'),
      notes: text('notes'),
    };
  }

  /**
   * Las mismas reglas que aplica el servidor, con las mismas palabras.
   *
   * Duplicadas a propósito y no compartidas: estas existen para que el
   * comprador vea el problema junto al campo antes de esperar un viaje de red.
   * Las que cuentan son las de `placeOrder`, porque un cliente se puede editar.
   * Que las frases coincidan literalmente es lo que evita que el mismo error se
   * explique de dos maneras distintas.
   */
  function validateStep(index: number, values: ReviewValues) {
    const errors: Record<string, string> = {};

    if (index === 0) {
      if (values.name.length < 2) errors.name = 'Escribe tu nombre.';
      if (values.phone.replace(/\D/g, '').length < 10) {
        errors.phone = 'Escribe un teléfono de 10 dígitos.';
      }
      if (!values.email) {
        errors.email = 'Escribe tu correo: ahí te llega el comprobante.';
      } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
        errors.email = 'Ese correo no parece válido.';
      }
    }

    if (index === 1 && fulfillment === 'delivery') {
      if (!values.street) errors.street = 'Escribe la calle.';
      if (!values.extNumber) errors.extNumber = 'Falta el número.';
      if (!values.neighborhood) errors.neighborhood = 'Escribe la colonia.';
      if (!values.city) errors.city = 'Escribe el municipio o alcaldía.';
      if (!/^[0-9]{5}$/.test(values.postalCode)) {
        errors.postalCode = 'El código postal son 5 dígitos.';
      }
    }

    return errors;
  }

  function goNext() {
    const values = readValues();
    const errors = validateStep(step, values);

    setClientErrors(errors);
    if (Object.keys(errors).length > 0) {
      // El primer campo con problema recibe el foco: sin esto, en un teléfono
      // el error puede quedar fuera de la pantalla y el botón parece no hacer
      // nada.
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${Object.keys(errors)[0]}"]`)
        ?.focus();
      return;
    }

    setReview(values);
    const next = Math.min(step + 1, STEPS.length - 1);
    setStep(next);
    setFurthest((far) => Math.max(far, next));
  }

  function goTo(index: number) {
    if (index > step) {
      goNext();
      return;
    }
    setClientErrors({});
    setStep(index);
  }

  // Los del servidor ganan: llegan de una comprobación que el navegador no
  // puede saltarse, y aparecen justo después de intentar pagar.
  const fieldErrors = { ...clientErrors, ...state.fieldErrors };

  const outOfRange = fulfillment === 'delivery' && quote?.covered === false;
  const isLast = step === STEPS.length - 1;

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      className="grid gap-10 md:grid-cols-[1fr_21rem] md:gap-12"
    >
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      <div className="flex min-w-0 flex-col gap-8">
        <CheckoutSteps current={step} furthest={furthest} onGoTo={goTo} />

        {/* El fallo que el comprador no puede arreglar editando un campo —sin
            existencias, o una caída nuestra— se anuncia, no se deja descubrir. */}
        {state.error ? (
          <p
            role="alert"
            className="rounded-sm border border-brand bg-brand-soft px-4 py-3 text-sm text-foreground"
          >
            {state.error}
          </p>
        ) : null}

        {/*
          Ocultos, nunca desmontados: ver la cabecera del archivo. `hidden`
          además los saca del árbol de accesibilidad y del orden de tabulación,
          así que un lector de pantalla tampoco los encuentra fuera de su paso.
        */}
        <div hidden={step !== 0}>
          <CustomerFields errors={fieldErrors} />
        </div>

        <div hidden={step !== 1}>
          <FulfillmentFields
            fulfillment={fulfillment}
            onFulfillmentChange={setFulfillment}
            postalCode={postalCode}
            onPostalCodeChange={setPostalCode}
            errors={fieldErrors}
          />
        </div>

        <div hidden={step !== 2}>
          <ReviewStep values={review} fulfillment={fulfillment} onEdit={goTo} />
        </div>

        <StepNav
          step={step}
          isLast={isLast}
          pending={pending}
          blocked={outOfRange}
          onBack={() => goTo(step - 1)}
          onNext={goNext}
        />
      </div>

      <OrderSummary
        cart={cart}
        subtotalCents={subtotalCents}
        fulfillment={fulfillment}
        quote={quote}
        quoteLoading={quoteLoading}
      />
    </form>
  );
}

/**
 * La acción principal, siempre en el mismo sitio.
 *
 * Antes vivía dentro del panel lateral, que en un teléfono queda por debajo de
 * todo el formulario: había que pasar el resumen entero para encontrar el botón
 * que acababa de aparecer. Aquí cierra el paso que el comprador está mirando,
 * que es donde la mano ya está.
 */
function StepNav({
  step,
  isLast,
  pending,
  blocked,
  onBack,
  onNext,
}: {
  step: number;
  isLast: boolean;
  pending: boolean;
  blocked: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={onBack}>
            Atrás
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}

        {/*
          Las `key` distintas no son decorativas: son el arreglo.

          Sin ellas React reutiliza el mismo nodo `<button>` para los dos y le
          cambia el `type` de `button` a `submit` **durante** el despacho del
          clic, al re-renderizar con el paso nuevo. El navegador decide la
          acción por defecto *después*, leyendo el DOM ya mutado, así que
          «Continuar» enviaba el formulario y saltaba directo a Stripe sin pasar
          por «Revisar». Se vio en el E2E: el botón acababa diciendo
          «Llevándote a pagar…» tras pulsar «Continuar».

          Con `key` propia cada estado es un elemento distinto y no hay nodo que
          mutar. El `preventDefault` de abajo es el cinturón por si algún día
          otro cambio vuelve a compartir la identidad.
        */}
        {isLast ? (
          <Button
            key="pagar"
            type="submit"
            /*
             * Bloquear el envío es correcto: el pedido se rechazaría de todos
             * modos y el mensaje llegaría después de un viaje al servidor.
             */
            disabled={pending || blocked}
          >
            {pending ? 'Llevándote a pagar…' : 'Ir a pagar'}
          </Button>
        ) : (
          <Button
            key="continuar"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onNext();
            }}
            disabled={blocked}
          >
            Continuar
          </Button>
        )}
      </div>

      {/*
        Por qué el botón está muerto, junto al botón.

        Un control deshabilitado sin explicación es la forma más rápida de
        perder a alguien que sí quería comprar. El resumen lateral también lo
        dice, pero en un teléfono queda debajo.
      */}
      {blocked ? (
        <p role="alert" className="text-sm text-brand">
          Todavía no entregamos en ese código postal. Cambia a recoger en tienda
          para continuar.
        </p>
      ) : null}
    </div>
  );
}

const EMPTY_REVIEW: ReviewValues = {
  name: '',
  phone: '',
  email: '',
  street: '',
  extNumber: '',
  intNumber: '',
  neighborhood: '',
  postalCode: '',
  city: '',
  state: '',
  references: '',
  notes: '',
};
