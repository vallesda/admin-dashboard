import { describe, expect, it } from 'vitest';

import { jsonLdScript } from './shop';

/**
 * Los bloques de datos estructurados llevan nombre, descripción y origen del
 * producto **tal y como se escribieron en el panel**. Van dentro de un
 * `<script>` con `dangerouslySetInnerHTML`, así que lo único que separa un dato
 * de la base de una ejecución en la tienda pública es este escape.
 *
 * `JSON.stringify` a secas no lo hace, y es lo que había.
 */
describe('jsonLdScript', () => {
  it('no deja cerrar la etiqueta script', () => {
    // El ataque: un producto llamado así rompe el bloque y lo que sigue es HTML.
    const out = jsonLdScript({ name: '</script><img src=x onerror=alert(1)>' });

    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<img');
    expect(out).toContain('\\u003c');
  });

  it('el dato sigue llegando intacto a quien lo lea', () => {
    // `<` es JSON válido: el parser lo devuelve como `<`. Google recibe el
    // nombre real, no una versión mutilada.
    const name = 'Filete <especial> 500 g';

    expect(JSON.parse(jsonLdScript({ name })).name).toBe(name);
  });

  it('escapa los separadores de línea que rompen un literal de JavaScript', () => {
    // U+2028 y U+2029 son legales en JSON y NO en un literal de JS: sin
    // escaparlos, el script deja de parsear.
    const out = jsonLdScript({ name: 'a b c' });

    expect(out).not.toContain(' ');
    expect(out).not.toContain(' ');
    expect(JSON.parse(out).name).toBe('a b c');
  });
});
