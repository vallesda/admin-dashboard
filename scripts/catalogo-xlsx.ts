/**
 * La hoja de cálculo del catálogo: `pnpm catalogo:xlsx`.
 *
 * Genera `DOCS/productos_amoramar_2026_inicial.xlsx` a partir de
 * `catalogo-2026.data.ts` — el mismo módulo que siembra la base. Ese es el
 * punto: la hoja que se comparte con el mostrador y lo que la tienda cobra
 * salen del mismo sitio, así que no pueden discrepar.
 *
 * ## Por qué se escribe el XLSX a mano
 *
 * Un `.xlsx` es un zip con cinco XML dentro, y esto sólo necesita una hoja de
 * texto y números. Traer una librería de las grandes para eso serían varios
 * megas de dependencia —y una superficie de actualización perpetua— a cambio
 * de features que nadie va a usar. El zip lo hace `zip(1)`, que ya está en la
 * máquina.
 *
 * Se usan cadenas en línea (`inlineStr`) en vez de la tabla de cadenas
 * compartidas: es un formato válido, Excel y Numbers lo abren igual, y evita
 * mantener un índice cuyo único beneficio sería ahorrar bytes en un archivo de
 * trece filas.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PRODUCTOS, type Fila } from './catalogo-2026.data.ts';

const DESTINO = 'DOCS/productos_amoramar_2026_inicial.xlsx';

const COLUMNAS = [
  'ID',
  'SKU',
  'Nombre',
  'Precio',
  'Cantidad',
  'Unidad',
  'Categorias',
  'Nombre-En-Tienda',
  'Clave',
  'Imagenes',
] as const;

/**
 * El `ID` de la hoja se deriva del SKU, no se guarda.
 *
 * `AAM-0014` → `prod_0014`. Es un identificador de la propia hoja —un ancla
 * para hablar de una fila por teléfono— y duplicaría el SKU si se almacenara.
 * La base ya tiene dos identificadores por producto (su uuid y el SKU) y un
 * tercero sólo añadiría un sitio más donde equivocarse.
 */
const idDeHoja = (sku: string) => `prod_${sku.split('-')[1] ?? sku}`;

/** Las cinco cosas que XML no perdona dentro de un texto. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** `0` → `A`, `25` → `Z`, `26` → `AA`. */
function letraColumna(indice: number): string {
  let n = indice + 1;
  let salida = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    salida = String.fromCharCode(65 + resto) + salida;
    n = Math.floor((n - 1) / 26);
  }
  return salida;
}

function celda(fila: number, columna: number, valor: string | number): string {
  const ref = `${letraColumna(columna)}${fila}`;
  if (typeof valor === 'number') {
    return `<c r="${ref}"><v>${valor}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapar(valor)}</t></is></c>`;
}

/**
 * Una fila del catálogo tal como se ve en la hoja.
 *
 * `Categorias` va como texto separado por comas —igual que llegó del
 * mostrador— y no como columnas de sí/no: la hoja se lee y se reenvía por
 * correo, no se consulta, y una columna por categoría la volvería ilegible en
 * cuanto haya diez.
 */
function valores(fila: Fila): (string | number)[] {
  return [
    idDeHoja(fila.sku),
    fila.sku,
    fila.nombre,
    fila.precio,
    fila.cantidad,
    fila.unidad,
    fila.categorias.join(', '),
    fila.nombreEnTienda,
    fila.clave,
    `images/products/${fila.imagen}`,
  ];
}

function hoja(): string {
  const filas: string[] = [];

  filas.push(
    `<row r="1">${COLUMNAS.map((c, i) => celda(1, i, c)).join('')}</row>`,
  );

  PRODUCTOS.forEach((producto, indice) => {
    const n = indice + 2;
    filas.push(
      `<row r="${n}">${valores(producto)
        .map((v, i) => celda(n, i, v))
        .join('')}</row>`,
    );
  });

  // Anchos a ojo por columna: sin esto Excel abre todo a 8 caracteres y los
  // nombres del sistema —la columna más ancha— salen recortados.
  const anchos = [10, 11, 26, 9, 10, 9, 20, 30, 10, 42]
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols>${anchos}</cols>
<sheetData>${filas.join('')}</sheetData>
</worksheet>`;
}

const PARTES: Record<string, string> = {
  '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,

  '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,

  'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Productos" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,

  'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,

  'xl/worksheets/sheet1.xml': hoja(),
};

function main() {
  const carpeta = mkdtempSync(join(tmpdir(), 'xlsx-'));

  try {
    for (const [ruta, contenido] of Object.entries(PARTES)) {
      const destino = join(carpeta, ruta);
      mkdirSync(join(destino, '..'), { recursive: true });
      writeFileSync(destino, contenido, 'utf8');
    }

    const zip = join(carpeta, 'salida.xlsx');
    execFileSync('zip', ['-q', '-X', '-r', zip, ...Object.keys(PARTES)], {
      cwd: carpeta,
    });
    copyFileSync(zip, DESTINO);

    console.log(`${DESTINO} — ${PRODUCTOS.length} productos, ${COLUMNAS.length} columnas`);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
}

main();
