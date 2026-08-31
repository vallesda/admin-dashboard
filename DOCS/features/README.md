# Funcionalidades

Un documento por funcionalidad. Cada uno responde, en este orden, las cuatro
preguntas que alguien nuevo se hace al llegar a un módulo:

1. **Para qué existe** — el caso de uso, contado como lo contaría el negocio.
2. **Qué tiene que ser verdad** — los requisitos y las reglas, con su `RF-`/`RN-`.
3. **Cómo se decidió** — las alternativas que se descartaron y por qué. Es la
   parte que un `git log` no conserva y la que evita deshacer una decisión sin
   saber que lo era.
4. **Cómo se comprueba** — qué prueba cubre cada regla, y qué no está cubierto.

## Por qué distribuido y no un solo documento

Un documento único de arquitectura envejece de golpe: se actualiza entero o no
se actualiza. Uno por funcionalidad envejece por partes, y la parte
desactualizada es visible — el documento de una funcionalidad que cambió y no se
tocó destaca.

La regla: **si tocas el módulo, tocas su documento.** Está en la Definition of
Done ([PLAN.md](../PLAN.md) §10).

## Índice

| Documento | Contexto | Qué cubre |
|---|---|---|
| [inventario-y-pedidos.md](inventario-y-pedidos.md) | `INV` · `SAL` | apartar, vender, cancelar; por qué reservar no es vender |
| [abastecimiento.md](abastecimiento.md) | `CAT` | fresco, congelado y por encargo; el ciclo semanal |
| [pagos.md](pagos.md) | `PAG` | el libro de cobros, las cuatro puertas, reembolsos |
| [envio-por-zona.md](envio-por-zona.md) | `DEL` | tarifa por código postal, gratis por monto, exención |
| [identidad-y-roles.md](identidad-y-roles.md) | `IAM` | quién puede qué, y por qué la UI dejó de mentir |

## Documentos relacionados

- [PLAN-PRUEBAS.md](../PLAN-PRUEBAS.md) — las tres capas de prueba y qué falta.
- [SEO-REGLAS.md](../SEO-REGLAS.md) — las reglas al escribir páginas públicas.
- [SRS.md](../SRS.md) — el catálogo completo de `RF-*` y `RN-*`.
- [MODELO-DATOS.md](../MODELO-DATOS.md) — el esquema y sus invariantes.
