import Container from '@/components/ui/container';

/**
 * Announcement bar.
 *
 * Copy lives here as a single constant so it can be swapped without hunting
 * through markup. No carousel and no animation: a strip that moves competes
 * with the hero directly below it.
 *
 * This used to read "Selección fresca · Entrega refrigerada" — a near-verbatim
 * restatement of the hero subhead two elements below it, spending the page's
 * most valuable strip on repetition.
 *
 * It now carries the thing a first-time buyer most needs and the shop never
 * said: no card is charged. For a shop with no reviews, no press and no
 * certifications, "you pay when you have it" is the strongest reassurance
 * available — and it is simply true, so it claims nothing unestablished.
 */
/*
 * Decía «Pagas al recibir», y dejó de ser cierto cuando el pago cambió: el
 * efectivo es sólo al recoger en la tienda, y un pedido a domicilio se paga en
 * línea (`RN-011`). La barra estaba prometiendo la combinación que el checkout
 * rechaza.
 *
 * Lo que dice ahora es lo que el manual pone en su primera página y lo que el
 * sitio nunca había dicho: de dónde viene el producto.
 */
const ANNOUNCEMENT =
  'Producto de Baja California · Entrega refrigerada en San Pedro y Monterrey';

export default function AnnouncementBar() {
  return (
    <div className="bg-brand text-background">
      <Container>
        <p className="py-2 text-center text-xs tracking-[0.08em] md:text-sm">
          {ANNOUNCEMENT}
        </p>
      </Container>
    </div>
  );
}
