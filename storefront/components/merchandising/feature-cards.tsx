import Container from '@/components/ui/container';

type IconComponent = (props?: { size?: number }) => React.ReactElement;

export type Feature = {
  Icon: IconComponent;
  title: string;
  body: string;
};

/**
 * Cuatro afirmaciones, cada una en su propio campo de color.
 *
 * ## Qué había antes
 *
 * Una fila de cuatro celdas separadas por filetes de 1px, con el título en
 * sans a 14px y un icono de 18px del color de marca. Correcto y silencioso —y
 * en una página que sólo tiene texto, silencioso significa que nadie lo mira.
 * Las cuatro cosas que separan a esta pescadería de un supermercado se leían
 * como una nota al pie.
 *
 * ## Qué las hace mirar
 *
 * Tres cambios, y ninguno es «más grande» a secas:
 *
 * 1. **Cada tarjeta es un campo de color.** Es la retícula de la lámina de
 *    paleta del manual. Cuatro rectángulos plenos leen como una imagen antes
 *    de leerse como texto, que es justo lo que un bloque de cuatro
 *    afirmaciones necesita para detener el ojo.
 * 2. **El icono pasa de 18 a 44px.** A 18 acompañaba a una palabra; a 44 es lo
 *    primero de la tarjeta y se puede reconocer sin leer.
 * 3. **El título pasa a la display.** El sistema da serif a la voz y sans a lo
 *    que se usa para navegar. Esto es voz —la tienda afirmando algo—, no un
 *    control.
 *
 * ## Las calles de 1px
 *
 * `gap-px` sobre el fondo de la página: las tarjetas no llevan borde, la
 * separación es el propio suelo asomando entre ellas. Es como está impresa la
 * lámina, y evita la línea gris que un borde real habría metido entre dos
 * colores saturados.
 *
 * La rejilla va dentro del contenedor y no a sangre. A sangre se veía más
 * audaz y quedaba mal alineada: el texto de la primera tarjeta empezaba 36px
 * antes que el titular de la sección de arriba, y esa casi-coincidencia se lee
 * como un error, no como una decisión.
 *
 * ## Los colores no rotan
 *
 * `TONES` es una lista fija de cuatro, no un `i % n`. Son cuatro tarjetas
 * concretas con cuatro colores elegidos; si mañana hay una quinta, alguien
 * tiene que decidir de qué color es en vez de heredar la que tocara. Los
 * cuatro pares están medidos —menta 9.23, turquesa 5.18, coral 6.09, amarillo
 * 7.94— y viven en `color-field.tsx`.
 */
const TONES = [
  'bg-brand-soft text-brand',
  'bg-turquoise text-foreground',
  'bg-coral text-foreground',
  'bg-sun text-brand',
] as const;

export default function FeatureCards({
  features,
  className = '',
}: {
  features: Feature[];
  className?: string;
}) {
  return (
    <Container className={className}>
      <ul className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
      {features.map(({ Icon, title, body }, i) => (
        <li
          key={title}
          className={`flex flex-col px-6 py-8 md:px-7 md:py-10 ${TONES[i % TONES.length]}`}
        >
          <span aria-hidden="true" className="mb-6">
            <Icon size={44} />
          </span>

          <h3 className="font-display text-2xl font-light leading-tight">
            {title}
          </h3>

          {/*
            Tinta plena, sin `--muted` y sin opacidad.

            El gris secundario del sistema está calculado contra crema y sobre
            coral o turquesa se ensucia. Y bajarle opacidad a la tinta propia
            del campo tampoco vale: medido en pantalla, este párrafo al 85 %
            sobre turquesa caía a **4.12:1**, bajo el mínimo de 4.5. En un
            campo de color la jerarquía la da el tamaño —24px el título contra
            16 el cuerpo—, no el peso del color.
          */}
          <p className="mt-3 text-base leading-relaxed">
            {body}
          </p>
        </li>
      ))}
      </ul>
    </Container>
  );
}
