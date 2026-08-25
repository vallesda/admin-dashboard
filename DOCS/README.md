# Documentación del proyecto — Pescadería en línea

Panel de administración y tienda para venta de **pescado y marisco fresco** con
entrega local, en **México**, en **español**.

## Los documentos

| Archivo | Qué contiene | Cambia cuando… |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | El **presente**: lo que ya está construido y funcionando | se completa una fase |
| [GLOSARIO.md](GLOSARIO.md) | Vocabulario normativo: término ↔ identificador en código | aparece un concepto nuevo del dominio |
| [SRS.md](SRS.md) | Requisitos `RF-*`, `RNF-*` y reglas de negocio `RN-*` | cambia el alcance o una regla del negocio |
| [MODELO-DATOS.md](MODELO-DATOS.md) | Entidades, columnas, FK, índices, invariantes y la máquina de estados | cambia el esquema |
| [FLUJOS.md](FLUJOS.md) | Flujos del MVP: actor, disparador, pasos, errores | cambia una operación |
| [HISTORIAS.md](HISTORIAS.md) | Backlog `HU-*` con criterios de aceptación | se planifica trabajo |
| [PLAN.md](PLAN.md) | Roadmap, features, deuda técnica y matriz de trazabilidad | cada semana |

**Por qué siete archivos y no uno.** Se separan por **ritmo de cambio**, no por
temática. El modelo de datos cambia con cada migración, el alcance con cada
conversación de negocio, el roadmap cada semana. En un solo archivo, el
historial de git se vuelve ilegible y revisar un cambio de alcance obliga a leer
un diff de esquema.

## Convención de identificadores

Todo elemento trazable tiene un ID estable y *greppable*.

| Prefijo | Qué es | Se **define** en |
|---|---|---|
| `RF-<MOD>-<NNN>` | Requisito funcional | SRS.md |
| `RNF-<CAT>-<NNN>` | Requisito no funcional | SRS.md |
| `RN-<NNN>` | Regla de negocio transversal | SRS.md |
| `E-<Entidad>` | Entidad de datos | MODELO-DATOS.md |
| `INV-<ENT>-<NN>` | Invariante de datos | MODELO-DATOS.md |
| `ST-PED-<nombre>` | Estado del pedido | MODELO-DATOS.md |
| `TR-PED-<NN>` | Transición legal | MODELO-DATOS.md |
| `FLU-<MOD>-<NN>` | Flujo | FLUJOS.md |
| `HU-<MOD>-<NNN>` | Historia de usuario | HISTORIAS.md |
| `CA-<HU>-<N>` | Criterio de aceptación | HISTORIAS.md |
| `F<fase>.<NN>` | Feature del roadmap | PLAN.md |
| `DT-<NNN>` | Deuda técnica | PLAN.md |

**Módulos (`MOD`)** — cerrados: `CAT` catálogo · `INV` inventario y lotes ·
`PED` pedidos · `ENT` entrega · `CLI` clientes · `PAG` pagos · `FIS` fiscal ·
`ADM` administración · `TDA` tienda · `REP` reportes.

**Categorías de RNF (`CAT`)** — elegidas por lo que puede matar este negocio:
`FRIO` cadena de frío · `TIEMPO` corte y concurrencia · `CAD` caducidad y FEFO ·
`REND` rendimiento · `A11Y` accesibilidad · `SEG` seguridad · `DAT` integridad y
respaldo · `DISPO` disponibilidad · `OBS` observabilidad.

### Reglas de gobierno

1. **Numeración perpetua.** Los números se asignan por orden de creación. Nunca
   se reordenan ni se reutilizan. Un requisito muerto se marca `OBSOLETO` con su
   motivo y su fila se queda. Renumerar rompe todo enlace externo: commits, PRs,
   comentarios en código.
2. **Cada ID se define en exactamente un archivo.** En los demás solo se
   referencia. Así `grep -rn "RF-PED-004" DOCS/` es un informe de impacto completo.
3. **Los `RF` son la columna vertebral.** El modelo, los flujos, las historias y
   las features apuntan *hacia arriba*. Un `RF` nunca lista sus historias en
   línea: se desincronizaría. La vista inversa se genera en un solo sitio, la
   matriz de `PLAN.md`.
4. **Los `RNF` se enganchan a la Definición de Hecho, no a features.** Un RNF no
   se "implementa una vez": se verifica en cada fase.
5. **La deuda técnica entra en el mismo grafo.** `DT-001..009` tienen fase
   asignada. Deja de ser una lista de lamentos y pasa a ser trabajo planificado.

### Anclaje al código

- Toda migración y toda server action nueva citan en su cabecera los IDs que
  realizan: `// RF-INV-003, INV-MOV-01`.
- Todo mensaje de commit cita la feature: `F2.03: recepción de mercancía con lote y caducidad`.

Con eso, `git log --grep=RF-INV-003` contesta *"quién construyó esto y cuándo"* —
la pregunta que un SRS sin anclaje al código nunca puede responder.

## Verificación de la trazabilidad

Un SRS sin estas comprobaciones es decoración. Las cuatro se ejecutan con `grep`:

Ejecutar desde `DOCS/`.

```bash
# 1. Huérfanos hacia arriba — ninguna historia sin requisito citado.
#    Debe imprimir "ninguna".
python3 -c "
import re
b=re.split(r'\n(?=### HU-)',open('HISTORIAS.md').read())
o=[re.match(r'### (HU-[A-Z]+-\d{3})',x).group(1) for x in b
   if re.match(r'### HU-',x) and not re.search(r'(RF|RNF|RN)-[A-Z0-9]',x)]
print('huérfanas:', o or 'ninguna')"

# 2. Referencias rotas — todo ID citado existe en su archivo de definición.
#    Cada comando debe imprimir vacío.
comm -13 <(grep -oE 'RF-[A-Z]+-[0-9]{3}'  SRS.md          | sort -u) <(grep -ohE 'RF-[A-Z]+-[0-9]{3}'  *.md | sort -u)
comm -13 <(grep -oE 'RNF-[A-Z]+-[0-9]{3}' SRS.md          | sort -u) <(grep -ohE 'RNF-[A-Z]+-[0-9]{3}' *.md | sort -u)
comm -13 <(grep -oE 'INV-[A-Z]+-[0-9]{2}' MODELO-DATOS.md | sort -u) <(grep -ohE 'INV-[A-Z]+-[0-9]{2}' *.md | sort -u)
comm -13 <(grep -oE 'TR-PED-[0-9]{2}'     MODELO-DATOS.md | sort -u) <(grep -ohE 'TR-PED-[0-9]{2}'     *.md | sort -u)

# 3. Cobertura de requisitos — qué RF aún no tiene historia.
#    NO debe estar vacío hoy: ver la nota de cobertura en HISTORIAS.md.
comm -23 \
  <(grep -oE 'RF-[A-Z]+-[0-9]{3}' SRS.md       | sort -u) \
  <(grep -oE 'RF-[A-Z]+-[0-9]{3}' HISTORIAS.md | sort -u)

# 4. Inventario de IDs definidos
for f in RF RNF RN INV TR FLU; do printf "%-4s " $f; done; echo
```

> La comprobación 3 se hace **contra `HISTORIAS.md`, no contra `PLAN.md`**: la
> matriz de trazabilidad usa rangos (`RF-CAT-001…015`) para ser legible, así que
> compararla por ID suelto daría falsos positivos en todos los requisitos
> intermedios.

## Estado

Fase 0 completada (ver [ARCHITECTURE.md](ARCHITECTURE.md) §4). El desarrollo del
ecommerce arranca en la **Fase 1**; ver [PLAN.md](PLAN.md).
