# Identidad y roles

> Contexto `IAM`.

---

## 1. Para qué existe

El servidor aplicaba roles desde la fase 0, pero **la interfaz no ocultaba
nada**: un `staff` veía «Archivar» y «Marcar pagado», los pulsaba y recibía un
error. Estaba anotado como `DT-009`.

## 2. Qué tiene que ser verdad

| Regla | Enunciado |
|---|---|
| `RF-IAM-003` | toda mutación verifica el rol en el servidor |
| SRS §4 | la matriz de permisos: `staff` opera, `admin` toca catálogo y dinero, `owner` gestiona cuentas |
| `INV-USR-03` | el hash de contraseña nunca sale en una proyección |

## 3. Cómo se decidió

### 3.1 Ocultar no es autorizar

**La decisión.** `RoleProvider` reparte el rol una vez desde el layout y `<Can>`
decide qué se dibuja. **Toda mutación sigue llamando a `requireRole`.**

**Por qué las dos cosas.** Una Server Action es un endpoint POST público y un
botón escondido no detiene a nadie. Lo que arregla `<Can>` es que la interfaz
deje de mentir: ofrecer una acción que va a ser rechazada es peor que no
ofrecerla.

### 3.2 Las cuentas no se borran

**La decisión.** Se desactivan. El JWT relee el rol en cada petición, así que
una cuenta apagada deja de entrar en la siguiente.

**Por qué.** Su nombre sigue firmando cada movimiento de inventario y cada cobro
que registró. Borrar la fila dejaría el libro sin autor, y un libro sin autor no
es un libro.

### 3.3 Una pantalla ajena no es un 404

**La decisión.** `pageRole()` devuelve `null` en vez de lanzar, y la página
renderiza «Esta pantalla no es tuya · Requiere el rol owner».

**Por qué.** `requireRole` lanza, que es correcto para una acción —un POST
forjado merece una excepción— y produce «A server error occurred» en una
navegación: exactamente la pantalla rota que este trabajo venía a eliminar.
Fingir un 404 dejaría a la persona buscando un enlace que nunca iba a aparecer.

### 3.4 Nadie se puede dejar fuera

**La decisión.** Dos guardas en el servicio: no puedes bajarte de rol ni
desactivarte a ti mismo, y no se puede degradar al último owner activo.

**Detalle de la interfaz.** En la propia fila, rol y acceso salen deshabilitados
— y como un control deshabilitado no se envía, los valores van repetidos en
campos ocultos. Sin eso, el formulario habría leído «sin rol» y «inactivo» y
habría dejado al owner fuera **a través del propio formulario que existe para
evitarlo**.

## 4. Cómo se comprueba

| Regla | Prueba | Capa |
|---|---|---|
| — | — | **ninguna** |

**Este módulo no tiene una sola prueba automatizada.** Se verificó a mano con el
navegador: el menú cambia por rol, un `staff` no ve «Archivar», la ruta de
usuarios responde con la pantalla de rechazo, la cuenta desactivada no entra.

### Lo que falta 🔴

- Los guardas de auto-bloqueo y último owner: por diseño la UI los hace
  inalcanzables, así que **sólo una prueba los ejercita de verdad**.
- Que las proyecciones no filtren `passwordHash` — hoy garantizado por nombrar
  las columnas a mano y por nada más.
- Autorización de acciones: que un `staff` no pueda cobrar, cancelar ni archivar.
