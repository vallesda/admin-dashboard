/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { WhatsAppIcon, InstagramIcon } from './social-icons';
import {
  WHATSAPP_URL,
  INSTAGRAM_URL,
  WHATSAPP_LABEL,
} from '@/lib/shop';

/**
 * Dos promesas que se rompen sin que se note al mirar la página.
 *
 * La primera es de contraste: estos iconos viven en dos suelos distintos —el
 * verde del pie y el turquesa de «Habla con nosotros»— y sólo son legibles en
 * ambos porque heredan el color del texto, que `DESIGN.md` ya midió para cada
 * superficie. Fijar aquí un color —el verde de WhatsApp, por ejemplo— los
 * volvería invisibles en el pie, que es verde.
 *
 * La segunda es de lectura: son decorativos. El texto de al lado ya dice
 * «WhatsApp», y anunciar «imagen, WhatsApp» antes de leerlo sólo repite.
 */

describe('las marcas', () => {
  it('heredan el color de su superficie', () => {
    const { container } = render(<WhatsAppIcon />);
    const svg = container.querySelector('svg')!;

    expect(svg.getAttribute('fill')).toBe('currentColor');
    // Ni un color propio en el trazo ni en una clase.
    expect(svg.getAttribute('class')).not.toMatch(/text-(brand|turquoise|sun)/);
  });

  it('no se anuncian a sí mismas', () => {
    for (const Icon of [WhatsAppIcon, InstagramIcon]) {
      const { container } = render(<Icon />);
      const svg = container.querySelector('svg')!;

      expect(svg.getAttribute('aria-hidden')).toBe('true');
      // `focusable=false` es lo que impide que un SVG entre en el orden de
      // tabulación en navegadores basados en Trident/EdgeHTML heredado.
      expect(svg.getAttribute('focusable')).toBe('false');
    }
  });

  it('escalan con el texto, no con un tamaño fijo', () => {
    // `1em` es lo que hace que el icono siga a la tipografía de donde se ponga:
    // 1.4rem en la página de contacto, tamaño de línea en el pie.
    const { container } = render(<InstagramIcon />);

    expect(container.querySelector('svg')!.getAttribute('class')).toContain('h-[1em]');
  });
});

describe('los destinos', () => {
  it('el WhatsApp apunta al número de la tienda', () => {
    // `wa.me` con el número en E.164 y sin signos: cualquier otra forma abre
    // WhatsApp sin conversación.
    expect(WHATSAPP_URL).toBe('https://wa.me/528129162142');
    expect(WHATSAPP_LABEL.replace(/\D/g, '')).toBe('8129162142');
  });

  it('Instagram apunta al perfil, no a la raíz del sitio', () => {
    // `https://instagram.com` a secas deja al cliente en un muro de acceso.
    expect(INSTAGRAM_URL).toMatch(/instagram\.com\/amoramarmx/);
  });
});
