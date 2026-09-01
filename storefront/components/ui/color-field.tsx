import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';

/**
 * Un campo de color: una sección cuyo suelo es un color de la paleta.
 *
 * ## De dónde sale
 *
 * De la lámina de paleta del manual, que es una retícula de campos plenos —uno
 * por color— cada uno con su etiqueta y su párrafo. Las tres páginas estáticas
 * del sitio —Cómo funciona, Nosotros, Preguntas frecuentes— eran lo contrario:
 * bloques de texto sobre crema con el mismo ritmo, uno detrás de otro, sin un
 * solo momento de color. Se leían como condiciones de servicio.
 *
 * Este componente es el mosaico de esa lámina convertido en sección.
 *
 * ## Los pares están medidos, no elegidos
 *
 * Cada tono trae su tinta fijada aquí, y no se puede combinar libremente: la
 * tabla de abajo es de contraste real, no de gusto. Si un color entra a la
 * paleta, entra con su par medido o no entra.
 *
 * | campo     | tinta        | ratio     |
 * |-----------|--------------|-----------|
 * | crema     | tinta de mar | 14.36 : 1 |
 * | menta     | verde marca  |  9.23 : 1 |
 * | verde     | crema        |  9.48 : 1 |
 * | amarillo  | verde marca  |  7.94 : 1 |
 * | coral     | tinta de mar |  6.09 : 1 |
 * | turquesa  | tinta de mar |  5.18 : 1 |
 *
 * ## Por qué no hay campo rojo
 *
 * El rojo del manual (`#EF3A3A`) **no sostiene texto con ningún color de la
 * paleta**: 3.50 con crema, 4.04 con el verde oscuro, 2.93 con el amarillo. El
 * mínimo es 4.5. No es una preferencia — es que no existe una tinta legible
 * para ese suelo, así que el rojo se queda donde el propio manual lo pone: un
 * acento dentro del patrón de escamas, nunca una superficie.
 *
 * ## La regla de escasez, y dónde deja de aplicar
 *
 * DESIGN.md limita a **dos** suelos por pantalla. Esa regla protege las
 * superficies donde se compra —portada, catálogo, ficha, carrito— en las que
 * el color tiene que ceder ante la fotografía y el precio.
 *
 * Las páginas estáticas no venden nada, y ahí la regla se cambia por otra: **un
 * campo, un color, y nunca dos colores dentro del mismo campo**. Es la
 * disciplina de la lámina del manual, que usa los seis a la vez sin que ninguno
 * se ensucie, porque cada uno tiene su propio rectángulo.
 */
type Tone = 'cream' | 'mint' | 'brand' | 'sun' | 'coral' | 'turquoise';

const TONES: Record<Tone, string> = {
  cream: 'bg-background text-foreground',
  mint: 'bg-brand-soft text-brand',
  brand: 'bg-brand text-background',
  sun: 'bg-sun text-brand',
  coral: 'bg-coral text-foreground',
  turquoise: 'bg-turquoise text-foreground',
};

export default function ColorField({
  tone = 'cream',
  id,
  as = 'h2',
  size = 'editorial',
  title,
  lede,
  children,
  className = '',
}: {
  tone?: Tone;
  id?: string;
  as?: 'h1' | 'h2';
  size?: 'editorial' | 'section';
  /** Envuelve un sustantivo en `<em>` para la cursiva editorial. */
  title?: React.ReactNode;
  lede?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`${TONES[tone]} ${className}`}
    >
      <Container>
        <div className="py-16 md:py-24">
          {title ? (
            /*
              El margen inferior sólo cuando hay algo debajo. Un campo que es
              únicamente título y entradilla —la portada de una página— cerraba
              con catorce de margen contra el relleno de la sección, y ese
              hueco se leía como contenido que no cargó.
            */
            <header className={children ? 'mb-10 md:mb-14' : ''}>
              {/*
                La regla de la cabecera va como elemento propio con `bg-current`
                y no como `border-current/25`: el modificador de opacidad de
                Tailwind necesita un triplete de canales y `currentColor` no lo
                tiene, así que la utilidad no emite nada y la línea saldría a
                plena tinta. Con un div de 1px y `opacity`, funciona en los seis
                campos sin que ninguno necesite su propia clase.
              */}
              <div aria-hidden="true" className="h-px w-full bg-current opacity-40" />

              <Heading id={id} as={as} size={size} className="mt-6">
                {title}
              </Heading>

              {/*
                La entradilla va a tinta plena, sin opacidad.

                Bajarla al 80 % es lo que se hace sobre crema, donde el par
                mide 14.36 y sobra margen. Sobre turquesa (5.18) y coral (6.09)
                no lo hay: medido en pantalla, la entradilla caía a **3.79:1**
                sobre turquesa y a **4.49** sobre coral, por debajo del mínimo.

                La regla que sale de aquí: **en un campo de color, la jerarquía
                la da el tamaño, no la opacidad.** El titular mide 48–60px y la
                entradilla 18–20; eso ya los separa sin tocar el contraste.
              */}
              {lede ? (
                <p className="mt-5 max-w-[54ch] text-lg leading-relaxed md:text-xl">
                  {lede}
                </p>
              ) : null}
            </header>
          ) : null}

          {children}
        </div>
      </Container>
    </section>
  );
}
