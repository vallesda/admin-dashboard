# modules/ — bounded contexts

Un modular monolith con DDD pragmático. Cada carpeta es un **bounded context**
del [README de documentación](../DOCS/README.md#bounded-contexts).

DDD aquí **no** significa una carpeta `domain/` con entidades anémicas y puertos.
Para este tamaño, el layout corto por contexto es el que gana: la regla de
negocio está en `service.ts`, cerca del dato, y se lee de un vistazo.

## Archivos por contexto

| Archivo | Responsabilidad | Puede importar React |
|---|---|:--:|
| `service.ts` | Casos de uso y reglas de negocio. Aquí vive la transacción. | ❌ |
| `queries.ts` | Lecturas y read-models. Formas específicas para el admin. | ❌ |
| `validators.ts` | Zod de entrada. Valida **intención de usuario**, no el schema de DB. | ❌ |
| `actions.ts` | Adapter de Next: `'use server'`, autorización, parseo, `revalidatePath`. | ❌ |
| `components/` | Componentes propios del contexto. | ✅ |

## Reglas de dependencia

```text
IAM  (identity)

CAT  (catalog) ──────────┐
                         │
INV  (inventory) ── depends on CAT
                         │
CLI  (customers) ────────┤
                         ▼
                   SAL  (sales)
                         │
                 ┌───────┴────────┐
                 ▼                ▼
           ADM (admin)      TDA (storefront)
```

1. Una dependencia apunta **hacia el contexto que posee el dato**. Sin ciclos.
2. `admin/` y `storefront/` son capas de aplicación y read-models: **no poseen
   entidades ni duplican reglas de negocio**.
3. Las **queries** pueden cruzar contextos para armar read-models del admin.
   Las **mutaciones** no escriben datos ajenos: pasan por el `service.ts` del
   contexto propietario.
4. `service.ts` no importa React ni nada de `next/`. Si necesita saber de HTTP,
   la regla está en el sitio equivocado.
5. Una entidad persistente nueva vive en el archivo de schema de su contexto
   (`db/schema/<contexto>.ts`), nunca en `legacy.ts`.

## Qué NO va aquí

`app/lib/actions.ts`, `app/lib/data.ts` y `app/lib/definitions.ts` son código
heredado del tutorial. **Dejan de ser destino de código nuevo de ecommerce.**
Mueren con la tabla `invoices` (ver `DOCS/PLAN.md`).
