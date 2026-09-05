import 'server-only';

/**
 * NOT — el único sitio que sabe que existe Resend.
 *
 * Mismo patrón que `lib/stripe.ts` con los pagos: el dominio pide «avisa al
 * comprador» y este archivo traduce eso a un proveedor concreto. Cambiarlo por
 * otro no toca a quien llama.
 *
 * ## Degradación deliberada
 *
 * Sin `RESEND_API_KEY`, o con el dominio todavía sin verificar en el DNS, esto
 * **no lanza**: registra y devuelve. Un pedido pagado y confirmado no puede
 * fallar porque el correo no salió — y menos aún desde el webhook de Stripe,
 * donde un error se traduce en un reintento de la confirmación entera.
 *
 * Es la misma decisión que ya toma el checkout cuando Stripe no está
 * configurado: el camino principal sigue, la función accesoria se apaga sola y
 * lo dice.
 */
import { Resend } from 'resend';

import { allowedReturnOrigins } from '@/lib/stripe';

let client: Resend | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function resend(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

/**
 * De dónde salen los correos.
 *
 * `RESEND_EMAIL_DOMAIN` lo pone la integración del marketplace al provisionar.
 * Mientras ese dominio no tenga sus registros DNS, Resend responde 403 y el
 * envío se registra como fallido — que es exactamente lo que debe pasar, y por
 * qué esto no puede tumbar un pedido.
 */
function sender(): string {
  const domain = process.env.RESEND_EMAIL_DOMAIN?.trim();
  if (!domain) return 'Amor a Mar <onboarding@resend.dev>';
  return `Amor a Mar <pedidos@${domain}>`;
}

/**
 * La URL pública de la tienda, que el admin necesita para dos cosas: el enlace
 * al pedido y de dónde cuelga el ojo de la marca.
 *
 * Se reusa `STOREFRONT_ALLOWED_ORIGINS` en vez de añadir otra variable. Ya es
 * la lista de orígenes que este despliegue reconoce como suyos —la que valida
 * las URLs de retorno de Stripe— así que una segunda variable con el mismo
 * valor sería una oportunidad más de que discrepen.
 */
export function storefrontOrigin(): string | null {
  return allowedReturnOrigins()[0] ?? null;
}

export type SendResult =
  | { sent: true; id: string }
  | { sent: false; reason: string };

/**
 * Manda un correo y **nunca lanza**.
 *
 * Dos cosas que el SDK de Resend hace distinto de lo que uno espera, y que son
 * la razón de que esta función exista en vez de llamarlo directamente:
 *
 * 1. **No lanza excepciones.** Devuelve `{ data, error }`, así que un
 *    `try/catch` alrededor no atrapa un 403 ni un 429 — hay que mirar `error`.
 *    Envolverlo sin saberlo da la falsa sensación de estar manejando fallos.
 * 2. **La clave de idempotencia es lo que impide el correo duplicado.** Con la
 *    misma clave y el mismo contenido, Resend devuelve la respuesta original
 *    sin volver a enviar, durante 24 horas. Hace falta porque quien confirma un
 *    pedido —`fulfillCheckout`— corre dos veces por diseño: una por el webhook
 *    y otra por la página de retorno.
 */
export async function send(args: {
  to: string;
  subject: string;
  react: React.ReactElement;
  /** `<tipo-de-evento>/<id>`, como pide Resend. Máximo 256 caracteres. */
  idempotencyKey: string;
}): Promise<SendResult> {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'RESEND_API_KEY no está configurada.' };
  }

  const { data, error } = await resend().emails.send(
    {
      from: sender(),
      to: [args.to],
      subject: args.subject,
      react: args.react,
    },
    { idempotencyKey: args.idempotencyKey },
  );

  if (error) {
    return { sent: false, reason: `${error.name}: ${error.message}` };
  }

  return { sent: true, id: data?.id ?? '(sin id)' };
}
