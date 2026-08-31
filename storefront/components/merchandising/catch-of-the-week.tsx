import Image from 'next/image';

import { firstAsset } from '@/lib/assets';

import { getProducts } from '@/lib/commerce';
import Container from '@/components/ui/container';
import { ButtonLink } from '@/components/ui/button';
import Price from '@/components/ui/price';
import Section from '@/components/ui/section';
import SectionHeader from '@/components/ui/section-header';
import SpecList, { type Spec } from '@/components/ui/spec-list';

/**
 * Seasonal merchandising — the single green moment in the middle of the page.
 *
 * Picks a product actually flagged `seasonal` in the admin, falling back to a
 * featured one. If neither exists the section does not render — an empty
 * "Pesca de la semana" is worse than no section, and inventing a highlight the
 * shop did not choose would be worse still.
 *
 * The band now names itself before it names the fish. Previously the section
 * heading *was* the product name, which meant the page's largest type said
 * "Atún aleta amarilla" with no indication of why, and a shopper landing
 * mid-scroll met a product with no frame around it. The section header says
 * what this is; the product then gets the full editorial treatment beneath it.
 *
 * The spec list is the same one the product page uses, in its on-brand tone.
 * A week's pick that shows a price and no cut is a poster; showing the cut and
 * the origin is what makes it an offer.
 *
 * No countdown, no "últimas piezas": the data does not support urgency, so the
 * copy does not claim it.
 *
 * ## Los títulos en amarillo
 *
 * El sustantivo destacado del título y el nombre del producto van en el
 * amarillo del manual (Pantone 106 U). Ésta es la única banda del sitio donde
 * eso es posible, y la razón es aritmética: sobre el verde de marca el amarillo
 * mide **7.94:1** —texto normal, no sólo grande— mientras que sobre el crema de
 * la página mide **1.19:1** y sería ilegible en cualquier otro sitio.
 *
 * Es exactamente el par que enseña la retícula de logotipos del manual (p. 9):
 * el amarillo no es una tinta que se pueda usar donde sea, es una tinta que
 * sólo existe sobre verde.
 *
 * La regla de escasez limita el amarillo a dos apariciones por pantalla y esta
 * banda lleva tres en reposo —los dos títulos y la etiqueta «De temporada»—
 * más el hover del botón como cuarta. Es una ampliación de la regla, anotada en
 * DESIGN.md en vez de dejada para que alguien la descubra como contradicción y
 * la «arregle». La banda se lo gana: es la única sección del sitio cuyo tema
 * entero es una pieza que no
 * siempre va a estar, que es precisamente lo que dice el amarillo.
 */
/*
 * Sin el archivo no se dibuja nada, y esa es la degradación correcta aquí: es
 * un sello de marca detrás del texto, no información. La banda funciona igual
 * sin él; con un hueco de imagen rota, no.
 */
export default async function CatchOfTheWeek() {
  const { items } = await getProducts();
  const product =
    items.find((p) => p.seasonal) ?? items.find((p) => p.featured) ?? null;

  if (!product) return null;

  // Dentro de la función, no en una constante de módulo: ver la nota en
  // `lib/assets.ts` sobre por qué un archivo que aparece después tiene que
  // poder verse.
  const semanal = firstAsset('/illustrations/semanal-fishes.svg');

  // The literal is annotated, not the filtered result: inferred, each entry
  // keeps its own narrow object shape and the type guard has nothing
  // assignable to narrow from. Rows the admin has not filled in are dropped
  // rather than rendered empty.
  const rows: (Spec | null)[] = [
    product.presentation
      ? { label: 'Presentación', value: product.presentation }
      : null,
    product.origin ? { label: 'Origen', value: product.origin } : null,
    product.netWeightGrams
      ? { label: 'Peso neto', value: `${product.netWeightGrams} g`, numeric: true }
      : null,
  ];
  const specs = rows.filter((s): s is Spec => s !== null);

  return (
    <Section
      labelledBy="pesca-heading"
      rhythm="none"
      className="bg-brand text-background edge-top edge-bottom"
    >
      <Container>
        <div className="py-20 md:py-28">
          <SectionHeader
            id="pesca-heading"
            tone="on-brand"
            title={
              <>
                La pesca de la <em className="text-sun">semana</em>
              </>
            }
            lede="Una pieza que elegimos esta semana y que no siempre vamos a tener."
            className="mb-12 md:mb-16"
          />

          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-brand-dark md:aspect-square">
              {product.featuredImage ? (
                <Image
                  src={product.featuredImage.url}
                  alt={product.featuredImage.altText}
                  fill
                  sizes="(min-width: 768px) 45vw, 90vw"
                  className="object-cover"
                />
              ) : null}

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-sm plate-on-brand"
              />

              {/* Una de las dos apariciones de amarillo que permite la pantalla; le
                  other is this section's own button on hover. The chip is the
                  system's designated home for "will not always be here". */}
              {product.seasonal ? (
                <span className="absolute left-3 top-3 rounded-sm bg-sun px-2 py-1 text-xs font-medium text-brand">
                  De temporada
                </span>
              ) : null}
            </div>

            <div className="relative">
              {/*
                La ilustración de los dos pescados colgados, con el círculo
                amarillo detrás. Va aquí y no junto a la fotografía porque las
                dos compiten: una es el producto real de esta semana y la otra
                es la marca hablando. Detrás del texto, a escala grande y
                anclada arriba a la derecha, hace de sello sin disputarle la
                atención a la pieza.

                `hidden lg:block`: en móvil la columna se apila bajo la foto y
                una ilustración a sangre detrás del texto lo volvería ilegible.

                SVG, no PNG: el dibujo es línea plana de cuatro tintas, que es
                justamente lo que un vector describe mejor que un mapa de bits.
                Escala sin pixelarse a cualquier densidad de pantalla, pesa
                menos comprimido que el WebP que sustituye y el fondo es
                transparente de nacimiento en vez de recortado a mano.

                `unoptimized` porque el optimizador de Next rechaza SVG salvo
                que se active `dangerouslyAllowSVG`, y activarlo para todo el
                sitio por un adorno sería abrir la puerta a servir SVG de
                terceros —que pueden traer scripts— desde nuestro dominio. Un
                archivo propio y estático no gana nada pasando por ahí.

                El sello va en su propia capa y el texto en otra por encima. Sin
                eso el orden de pintado juega en contra: un elemento posicionado
                se dibuja sobre los hermanos que no lo están, así que la
                ilustración tapaba las filas de la ficha —presentación, origen,
                peso— aunque en el código vaya antes que ellas.
              */}
              {semanal ? (
                <Image
                  src={semanal}
                  alt=""
                  aria-hidden="true"
                  width={551}
                  height={847}
                  unoptimized
                  className="pointer-events-none absolute -top-16 -right-1 z-0 hidden h-auto w-36 lg:block xl:-top-24 xl:w-44"
                />
              ) : null}

              <div className="relative z-10">

                {/* `h3`, not `h2`: the section already owns the h2 above, and the
                    product is a level inside it. Sized as a headline anyway —
                    outline depth and type scale are separate decisions. */}
                <h3 className="max-w-[14ch] font-display text-3xl font-light leading-[1.05] md:text-[2.75rem]">
                  {product.name}
                </h3>

                {product.shortDescription ? (
                  <p className="mt-5 max-w-[44ch] text-lg text-background/85">
                    {product.shortDescription}
                  </p>
                ) : null}

                <SpecList specs={specs} tone="on-brand" className="mt-8" />

                <p className="mt-8 font-sans text-2xl tabular-nums">
                  <Price value={product.price} unit={product.unit} tone="on-brand" />
                </p>

                <ButtonLink
                  href={`/product/${product.handle}`}
                  variant="onBrand"
                  className="mt-8"
                >
                  Ver producto
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
