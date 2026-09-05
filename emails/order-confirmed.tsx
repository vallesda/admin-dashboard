import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from '@react-email/components';

/**
 * El correo que recibe el comprador cuando su pago se confirma.
 *
 * ## Se tiene que leer sin imágenes
 *
 * Gmail y Outlook bloquean las imágenes remotas por defecto, así que el ojo de
 * la marca es un refuerzo y **nunca** el soporte de una información. Si no
 * carga, arriba sigue leyéndose «Amor a Mar» en texto y el desglose entero
 * funciona igual. Por eso el ojo va acompañado del nombre en vez de sustituirlo.
 *
 * ## Por qué tablas y no rejilla
 *
 * `Row`/`Column` generan tablas, que es lo único que compone igual en Outlook —
 * su motor es Word, no un navegador. Nada de flex, nada de grid, nada de
 * `media queries`: en correo no son «menos compatibles», simplemente no están.
 *
 * ## Los importes vienen calculados
 *
 * Este componente no suma nada. Recibe los centavos ya resueltos por el mismo
 * pedido que se cobró, porque un total que se recalcula para el correo es un
 * total que puede discrepar del que se cobró — y el cliente cree lo que lee
 * aquí.
 */

export type OrderConfirmedProps = {
  orderNumber: number;
  customerName: string;
  lines: { name: string; quantity: number; lineTotalCents: number }[];
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  fulfillment: 'pickup' | 'delivery';
  /** Sólo para entrega a domicilio; ya formateada en una línea. */
  deliveryAddress?: string | null;
  /** Dónde ver el pedido. Lleva el token opaco, nunca el número. */
  orderUrl: string;
  /** Base pública de la tienda, de donde cuelga el ojo de la marca. */
  assetsBaseUrl: string;
  shopAddress: string;
  whatsappUrl: string;
  whatsappLabel: string;
};

/** MXN con dos decimales, como lo escribe el resto del sitio. */
function money(cents: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(cents / 100);
}

export default function OrderConfirmed({
  orderNumber,
  customerName,
  lines,
  subtotalCents,
  deliveryFeeCents,
  totalCents,
  fulfillment,
  deliveryAddress,
  orderUrl,
  assetsBaseUrl,
  shopAddress,
  whatsappUrl,
  whatsappLabel,
}: OrderConfirmedProps) {
  const isDelivery = fulfillment === 'delivery';

  return (
    <Html lang="es-MX">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                // Los del manual de identidad, no muestreados de un logo.
                brand: '#0C473F',
                cream: '#F7F3E1',
                surface: '#FCFAF0',
                ink: '#0A2622',
                muted: '#4E6963',
                rule: '#D2C8B7',
                sand: '#E9E2CB',
              },
              fontFamily: {
                // Spectral y Figtree no existen en un cliente de correo, así
                // que la pila termina en algo que sí: serif de sistema para la
                // voz, sans para lo que se usa.
                display: ['Spectral', 'Georgia', 'Times New Roman', 'serif'],
                body: ['Figtree', 'Helvetica Neue', 'Arial', 'sans-serif'],
              },
            },
          },
        }}
      >
        <Head />
        <Body className="bg-cream font-body m-0 p-0">
          {/*
            Lo que se lee en la bandeja antes de abrir. Lleva el número porque
            es lo que permite distinguir dos correos del mismo remitente.
          */}
          <Preview>{`Pedido #${orderNumber} confirmado · ${money(totalCents)}`}</Preview>

          <Container className="mx-auto my-0 w-full max-w-[600px] p-0">
            {/* --- Cabecera de marca ------------------------------------- */}
            <Section className="bg-brand px-8 py-8">
              <Row>
                <Column className="w-[56px] align-middle">
                  {/*
                    Enlazado no, decorativo tampoco: el nombre de al lado ya
                    identifica al remitente, así que el ojo lleva `alt=""` y un
                    lector de pantalla lo salta en vez de leer «logo» dos veces.
                  */}
                  <Img
                    src={`${assetsBaseUrl}/brand/ojoLogoAmorAMar.png`}
                    alt=""
                    width="44"
                    height="44"
                  />
                </Column>
                <Column className="align-middle">
                  <Text className="font-display m-0 text-[22px] font-normal leading-[1.2] text-cream">
                    Amor a Mar
                  </Text>
                  <Text className="m-0 text-[12px] uppercase tracking-[0.1em] text-cream opacity-70">
                    Honest Seafood
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* --- El hecho --------------------------------------------- */}
            <Section className="bg-surface px-8 pb-2 pt-8">
              <Heading
                as="h1"
                className="font-display m-0 text-[28px] font-normal leading-[1.15] text-ink"
              >
                Tu pedido está confirmado
              </Heading>

              <Text className="mb-0 mt-3 text-[15px] leading-[1.6] text-ink">
                Gracias, {customerName}. Ya recibimos tu pago y estamos
                preparando el pedido{' '}
                <strong className="whitespace-nowrap">#{orderNumber}</strong>.
              </Text>

              <Text className="mb-0 mt-3 text-[14px] leading-[1.6] text-muted">
                {isDelivery
                  ? 'Te llamamos para acordar el horario de entrega.'
                  : 'Te avisamos por WhatsApp en cuanto puedas pasar por él.'}
              </Text>
            </Section>

            {/* --- El desglose ------------------------------------------ */}
            <Section className="bg-surface px-8 pb-2 pt-6">
              <Text className="m-0 mb-3 text-[11px] uppercase tracking-[0.1em] text-muted">
                Lo que pediste
              </Text>

              {lines.map((line) => (
                <Row key={`${line.name}-${line.quantity}`} className="mb-2">
                  <Column className="align-top">
                    <Text className="m-0 text-[14px] leading-[1.5] text-ink">
                      {line.name}
                    </Text>
                    <Text className="m-0 text-[13px] leading-[1.5] text-muted">
                      {line.quantity} ×
                    </Text>
                  </Column>
                  {/*
                    Alineado a la derecha y con ancho fijo: es lo que hace que
                    la columna de importes quede a plomo cuando un nombre de
                    producto ocupa dos líneas y otro una.
                  */}
                  <Column className="w-[110px] text-right align-top">
                    <Text className="m-0 text-[14px] leading-[1.5] text-ink">
                      {money(line.lineTotalCents)}
                    </Text>
                  </Column>
                </Row>
              ))}

              <Hr className="my-4 border-none border-t border-solid border-rule" />

              <Row>
                <Column>
                  <Text className="m-0 text-[14px] leading-[1.6] text-muted">
                    Subtotal
                  </Text>
                </Column>
                <Column className="w-[110px] text-right">
                  <Text className="m-0 text-[14px] leading-[1.6] text-muted">
                    {money(subtotalCents)}
                  </Text>
                </Column>
              </Row>

              {deliveryFeeCents > 0 ? (
                <Row>
                  <Column>
                    <Text className="m-0 text-[14px] leading-[1.6] text-muted">
                      Envío
                    </Text>
                  </Column>
                  <Column className="w-[110px] text-right">
                    <Text className="m-0 text-[14px] leading-[1.6] text-muted">
                      {money(deliveryFeeCents)}
                    </Text>
                  </Column>
                </Row>
              ) : null}

              <Hr className="my-4 border-none border-t border-solid border-rule" />

              <Row>
                <Column>
                  <Text className="font-display m-0 text-[18px] leading-[1.3] text-ink">
                    Total pagado
                  </Text>
                </Column>
                <Column className="w-[110px] text-right">
                  <Text className="font-display m-0 text-[18px] leading-[1.3] text-ink">
                    {money(totalCents)}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* --- Cómo lo recibe --------------------------------------- */}
            <Section className="bg-surface px-8 pb-6 pt-6">
              <Section className="rounded-[3px] border border-solid border-rule bg-sand px-5 py-4">
                <Text className="m-0 mb-1 text-[11px] uppercase tracking-[0.1em] text-muted">
                  {isDelivery ? 'Entrega a domicilio' : 'Recoges en la tienda'}
                </Text>
                <Text className="m-0 text-[14px] leading-[1.6] text-ink">
                  {isDelivery ? deliveryAddress : shopAddress}
                </Text>
              </Section>
            </Section>

            {/* --- Dónde seguirlo --------------------------------------- */}
            <Section className="bg-surface px-8 pb-8">
              <Text className="m-0 text-[14px] leading-[1.6] text-ink">
                {/*
                  Un enlace de texto y no un botón: el botón compite con el
                  desglose, que es lo que la persona abrió el correo a leer.
                  El texto dice a dónde va, no «haz clic aquí».
                */}
                <Link
                  href={orderUrl}
                  className="text-brand underline underline-offset-2"
                >
                  Ver el estado de tu pedido
                </Link>
              </Text>
              <Text className="mb-0 mt-3 text-[13px] leading-[1.6] text-muted">
                ¿Algo no cuadra? Escríbenos por WhatsApp al{' '}
                <Link href={whatsappUrl} className="text-brand underline">
                  {whatsappLabel}
                </Link>
                .
              </Text>
            </Section>

            {/* --- Pie -------------------------------------------------- */}
            <Section className="bg-brand px-8 py-6">
              <Text className="m-0 text-[12px] leading-[1.6] text-cream opacity-80">
                Amor a Mar · {shopAddress}
              </Text>
              <Text className="m-0 mt-1 text-[12px] leading-[1.6] text-cream opacity-60">
                Este correo confirma tu pedido. Stripe te envía por separado el
                comprobante del cargo.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/*
 * Datos de vista previa: un pedido a domicilio con dos líneas y envío, que es
 * el caso con más partes móviles. `pnpm email` lo pinta en el navegador.
 */
OrderConfirmed.PreviewProps = {
  orderNumber: 61,
  customerName: 'Ana Torres',
  lines: [
    { name: 'Filete Aleta Azul', quantity: 2, lineTotalCents: 300_000 },
    { name: 'Almeja Chione (kg)', quantity: 1, lineTotalCents: 14_500 },
  ],
  subtotalCents: 314_500,
  deliveryFeeCents: 5_000,
  totalCents: 319_500,
  fulfillment: 'delivery',
  deliveryAddress: 'Río Nazas 120, Del Valle, San Pedro Garza García, N.L. · C.P. 66220',
  orderUrl: 'https://amoramar.mx/pedido/f08a1306-d885-4e8f-9e8c-300bd825ad4d',
  assetsBaseUrl: 'https://amoramar.mx',
  shopAddress: 'Río Amazonas 132 Ote., Local 1A, Col. Del Valle, San Pedro Garza García',
  whatsappUrl: 'https://wa.me/528129162142',
  whatsappLabel: '(81) 2916 2142',
} satisfies OrderConfirmedProps;

export { OrderConfirmed };
