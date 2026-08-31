# Assets de marca

Archivos que el código espera aquí. Los nombres son los del brandbook, sin
renombrar, para que se puedan cotejar contra el manual sin traducir nada.

| Archivo | Qué es | Dónde se usa |
|---|---|---|
| `amoramarlogoverde.png` | Logotipo «AMOR A MAR / HONEST SEAFOOD», verde sobre transparente | Navbar y pie (`components/layout/logo.tsx`) |
| `ojoamoramar.png` | El ojo: anillo verde, iris amarillo, pupila negra | Junto al logotipo, en el mismo lockup |

## Requisitos

- **PNG con transparencia.** El logotipo se invierte por CSS para el pie
  (`brightness-0 invert`), y eso sólo funciona sobre un dibujo de un solo color
  con fondo transparente. Un PNG con fondo blanco saldría como un rectángulo
  negro.
- **Sin márgenes propios.** El espaciado lo pone el lockup; un margen dentro del
  archivo se sumaría al del componente y descuadraría la barra.
- Ancho suficiente para pantallas densas: el logotipo se renderiza a ~176 px, así
  que ≥ 700 px de ancho basta y sobra.

## Lo que ya no se usa

`amoramar-logo.png` era el ojo antes de que llegaran los archivos del brandbook.
Se puede borrar en cuanto los dos de arriba estén en su sitio.
