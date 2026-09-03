/**
 * Zonas de reparto del área metropolitana de Monterrey: `pnpm db:seed:zonas`.
 *
 * Las tarifas salen de los tabuladores de DERBY tomando como origen la tienda
 * en Río Amazonas 132 ote., y **son aproximadas**: el negocio las fijó por
 * tramos, no por cálculo exacto de distancia.
 *
 * ## El desajuste que hay que entender antes de tocar esto
 *
 * Las reglas del negocio están escritas **por colonia**. El sistema cobra **por
 * código postal**, y `delivery_zone_postal_codes` lleva un índice único sobre
 * `postal_code`: un CP pertenece a una zona y sólo a una, garantizado por la
 * base.
 *
 * En San Pedro eso choca en cuatro sitios, donde dos colonias de tramos
 * distintos comparten CP. La decisión del negocio (2 de septiembre de 2026) fue
 * **gana la tarifa menor**: nadie paga de más y la tienda absorbe la diferencia
 * en los repartos caros. Cada caso queda marcado abajo con su porqué.
 *
 * ## Lo que este archivo NO hace
 *
 * No inventa cobertura. Sólo asigna los CP de las colonias que el negocio
 * nombró explícitamente, más la resolución de los cuatro empates. San Pedro
 * tiene ~50 códigos postales y aquí hay bastantes menos: el resto queda **sin
 * zona**, que la tienda ya trata bien —«todavía no entregamos ahí, puedes
 * recoger»— y que es preferible a cobrar una tarifa que nadie decidió.
 *
 * Al terminar imprime los CP de San Pedro que quedaron fuera, para triarlos en
 * el panel.
 *
 * Idempotente: se puede correr las veces que haga falta.
 */
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

type Zone = {
  name: string;
  feeCents: number;
  sortOrder: number;
  /** CP → por qué está aquí. El comentario es la trazabilidad de la tarifa. */
  postalCodes: Record<string, string>;
};

const ZONES: Zone[] = [
  {
    name: 'San Pedro · Valle y Campestre',
    feeCents: 5_000,
    sortOrder: 10,
    postalCodes: {
      '66220': 'Del Valle, Jardines Del Valle',
      '66224': 'Fuentes del Valle',
      '66225': 'Zona del Valle',
      '66240': 'Tampiquito, Lomas de Tampiquito',
      '66263': 'Zona Campestre, Zona Santa Engracia',
      '66265': 'Valle del Campestre',
      '66267': 'Santa Engracia',
      '66268': 'Del Valle Sector Norte, Valle de Santa Engracia',
      // Los tres empates que la regla «gana la menor» resuelve a favor de $50.
      '66250': 'EMPATE → Jerónimo Siller ($50) sobre Bosques del Valle ($70)',
      '66270': 'EMPATE → Zona Tampiquito ($50) sobre Los Colorines ($70)',
      '66280': 'EMPATE → Balcones del Valle ($50) sobre Pedregal del Valle ($70)',
    },
  },
  {
    name: 'San Pedro · Bosques, Pedregal y San Agustín',
    feeCents: 7_000,
    sortOrder: 20,
    postalCodes: {
      '66230': 'Misión del Valle',
      '66285': 'Zona Bosques del Valle',
      '66287': 'Zona Pedregal del Valle',
      '66260': 'EMPATE → Zona San Agustín ($70) sobre Del Valle Oriente ($90)',
    },
  },
  {
    name: 'San Pedro · Valle Oriente, Privanzas y Rosario',
    feeCents: 9_000,
    sortOrder: 30,
    postalCodes: {
      '66235': 'Villa Montaña',
      '66247': 'Hacienda El Rosario',
      '66266': 'Zona Valle Oriente Norte',
      '66277': 'Privada Real de San Agustín',
      '66278': 'Real de San Agustín, Las Privanzas, Zona Valle Oriente',
    },
  },
  {
    name: 'San Pedro · Periferia y sierra',
    feeCents: 11_000,
    sortOrder: 40,
    postalCodes: {
      '66290': 'Olinalá, Valle de San Ángel',
      '66295': 'Alpino Chipinque, Mesa de la Corona',
      '66296': 'Colinas de San Ángel',
      '66297': 'Residencial Chipinque, Villa Chipinque',
    },
  },
  {
    name: 'Monterrey · Colinas de San Jerónimo',
    feeCents: 8_000,
    sortOrder: 50,
    postalCodes: { '64630': 'Colinas de San Jerónimo' },
  },
  {
    name: 'Monterrey · Colinas del Valle',
    feeCents: 10_000,
    sortOrder: 60,
    postalCodes: { '64650': 'Colinas del Valle' },
  },
  {
    name: 'Monterrey · La Estanzuela',
    feeCents: 12_000,
    sortOrder: 70,
    postalCodes: {
      '64988': 'La Estanzuela',
      '64984': 'La Estanzuela Vieja',
    },
  },
];

/**
 * Lo que el negocio nombró y aquí no se pudo resolver.
 *
 * Se imprime en cada corrida en vez de resolverse a ojo: una tarifa inventada
 * se cobra igual de bien que una decidida, y sólo se nota cuando alguien se
 * queja.
 */
const PENDIENTES = [
  'La Rioja ($120) — no se confirmó su código postal; se sembró sólo La Estanzuela.',
  'Valle Poniente ($90) — aparece como 66233 en **San Pedro**, no en Monterrey. Confirmar de cuál se habla.',
  'Centrito del Valle ($50) — es la zona comercial dentro de Del Valle, no un CP propio. Cubierta por 66220 si es eso.',
  'Envíos foráneos — «según peso y destino»: eso no es una zona, es otra regla, y el modelo actual no la expresa.',
];

/** Los ~50 CP de San Pedro, para saber cuáles quedaron sin cubrir. */
const SAN_PEDRO_CPS = [
  '66200', '66210', '66214', '66215', '66216', '66217', '66218', '66219',
  '66220', '66224', '66225', '66226', '66227', '66228', '66230', '66233',
  '66235', '66236', '66237', '66238', '66239', '66240', '66244', '66245',
  '66246', '66247', '66249', '66250', '66254', '66256', '66257', '66259',
  '66260', '66263', '66265', '66266', '66267', '66268', '66270', '66273',
  '66274', '66275', '66276', '66277', '66278', '66279', '66280', '66285',
  '66286', '66287', '66290', '66295', '66296', '66297',
];

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL no está definido. Corre con `pnpm db:seed:zonas`.');
  }

  const nuestros = ZONES.flatMap((z) => Object.keys(z.postalCodes));

  /*
   * Antes de escribir: ¿alguno de estos CP ya vive en una zona que no es
   * nuestra? El índice único lo rechazaría a mitad del seed y dejaría el
   * trabajo por la mitad. Mejor decirlo entero y no tocar nada.
   */
  const ajenos = await sql<{ postal_code: string; name: string }[]>`
    SELECT c.postal_code, z.name
    FROM delivery_zone_postal_codes c
    JOIN delivery_zones z ON z.id = c.zone_id
    WHERE c.postal_code = ANY(${nuestros})
      AND z.name <> ALL(${ZONES.map((z) => z.name)})
  `;

  if (ajenos.length > 0) {
    console.error('\n✗ Estos códigos postales ya están en otra zona:\n');
    for (const a of ajenos) console.error(`   ${a.postal_code} → «${a.name}»`);
    console.error('\nQuítalos de esa zona en el panel y vuelve a correr.\n');
    process.exitCode = 1;
    return;
  }

  for (const zone of ZONES) {
    /*
     * Buscar y luego decidir, en vez de `ON CONFLICT DO NOTHING`.
     *
     * `delivery_zones.name` **no tiene índice único**, así que el `ON CONFLICT`
     * no dispara nunca: la primera versión de este script creaba una zona nueva
     * en cada corrida y luego moría al reinsertar los códigos postales, que sí
     * son únicos. Decía «idempotente» en su propia cabecera y no lo era.
     */
    const existentes = await sql<{ id: string }[]>`
      SELECT id FROM delivery_zones WHERE name = ${zone.name}
    `;

    if (existentes.length > 1) {
      console.error(
        `✗ Hay ${existentes.length} zonas llamadas «${zone.name}». ` +
          'Deja una sola en el panel y vuelve a correr.',
      );
      process.exitCode = 1;
      return;
    }

    const id =
      existentes[0]?.id ??
      (
        await sql<{ id: string }[]>`
          INSERT INTO delivery_zones (name, fee_cents, free_over_cents, active, sort_order)
          VALUES (${zone.name}, ${zone.feeCents}, NULL, true, ${zone.sortOrder})
          RETURNING id
        `
      )[0].id;

    /*
     * La tarifa se actualiza; el umbral de envío gratis **no se toca**.
     *
     * El negocio no fijó ninguno para estas zonas, y sobrescribir con `NULL`
     * borraría el que alguien haya puesto a mano en el panel. Un seed que
     * deshace decisiones operativas es peor que no correrlo.
     */
    await sql`
      UPDATE delivery_zones
      SET fee_cents = ${zone.feeCents}, sort_order = ${zone.sortOrder},
          active = true, updated_at = now()
      WHERE id = ${id}
    `;

    const codes = Object.keys(zone.postalCodes);

    await sql`DELETE FROM delivery_zone_postal_codes WHERE zone_id = ${id}`;
    await sql`
      INSERT INTO delivery_zone_postal_codes (zone_id, postal_code)
      SELECT ${id}, unnest(${codes}::varchar[])
    `;

    console.log(
      `✓ ${zone.name} — $${(zone.feeCents / 100).toFixed(0)} · ${codes.length} CP`,
    );
  }

  const cubiertos = new Set(nuestros);
  const sinCubrir = SAN_PEDRO_CPS.filter((cp) => !cubiertos.has(cp));

  console.log(`\nSan Pedro sin cubrir (${sinCubrir.length} CP): ${sinCubrir.join(', ')}`);
  console.log('   Sin zona, la tienda ofrece recoger en lugar de inventar una tarifa.\n');

  console.log('Pendientes de decisión:');
  for (const p of PENDIENTES) console.log(`   · ${p}`);
  console.log();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
