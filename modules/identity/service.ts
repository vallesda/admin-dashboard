import 'server-only';

/**
 * IAM — Identity & Access use cases.
 *
 * Realiza: RF-IAM-001, RF-IAM-002 · HU-IAM-001.
 */
import { eq, and, ne } from 'drizzle-orm';
import bcrypt from 'bcrypt';

import { db } from '@/db';
import { adminUsers, type AdminRole } from '@/db/schema/identity';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { countOtherActiveOwners } from './queries';
import type {
  CreateAdminUserInput,
  UpdateAdminUserInput,
} from './validators';

/**
 * What a session is allowed to carry.
 *
 * Deliberately does NOT include `passwordHash` (INV-USR-03). Returning the row
 * type here would let the hash reach the JWT the moment someone spreads the
 * object, which is exactly how the tutorial leaked it.
 */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
};

/**
 * Coste de bcrypt, uno solo para todo el archivo.
 *
 * Arriba del todo porque lo usan tres sitios —el alta, el reseteo y el hash
 * señuelo de más abajo— y `const` no se iza: declararlo a media página hacía
 * que el señuelo no compilara.
 */
const BCRYPT_ROUNDS = 10;

/**
 * Verifies email + password and returns the session payload, or null.
 *
 * Returns null for every failure — unknown email, wrong password, inactive
 * account — so the caller cannot distinguish them and neither can an attacker
 * probing for valid addresses.
 *
 * An inactive user is rejected even with the right password (INV-USR-02).
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const [user] = await db
    .select({
      id: adminUsers.id,
      name: adminUsers.name,
      email: adminUsers.email,
      role: adminUsers.role,
      active: adminUsers.active,
      passwordHash: adminUsers.passwordHash,
    })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  if (!user) {
    // Compare against a dummy hash anyway so a missing account takes about as
    // long as a wrong password; otherwise response time reveals which emails
    // exist.
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }

  const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordsMatch) return null;

  if (!user.active) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

/**
 * El hash contra el que se compara cuando la cuenta no existe.
 *
 * Iguala el tiempo de respuesta: sin esto, un correo inexistente vuelve al
 * instante y uno real tarda lo que tarda bcrypt, y esa diferencia dice cuáles
 * existen.
 *
 * **Se genera, no se escribe a mano.** El valor anterior estaba fijado en el
 * código y llevaba 57 caracteres tras `$2b$10$` donde bcrypt usa 53 — 22 de sal
 * y 31 de resumen. Medido, daba igual: `compare` sólo necesita el prefijo y la
 * sal para rehacer el cálculo, así que el estiramiento se ejecutaba entero y
 * los tiempos ya coincidían (~44 ms en ambos casos). O sea que **no había
 * agujero**, y quien vea esto no debe ir a buscarlo.
 *
 * Se cambia igualmente por dos razones que sí valen: un literal escrito a mano
 * puede degradarse hasta dejar de ser parseable en una revisión futura, y
 * generarlo con el mismo coste que las contraseñas reales (`BCRYPT_ROUNDS`)
 * mantiene los tiempos alineados solo si alguien sube el coste. Cuesta una vez
 * al cargar el módulo, no por petición.
 */
const DUMMY_HASH = bcrypt.hashSync(
  'contraseña que nadie usa jamás',
  BCRYPT_ROUNDS,
);

/** Reads a user's current role and active flag — never the hash. */
export async function getSessionUserById(
  id: string,
): Promise<SessionUser | null> {
  const [user] = await db
    .select({
      id: adminUsers.id,
      name: adminUsers.name,
      email: adminUsers.email,
      role: adminUsers.role,
      active: adminUsers.active,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  if (!user || !user.active) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// ---------------------------------------------------------------------------
// Managing access
// ---------------------------------------------------------------------------

const EMAIL_TAKEN = () =>
  new ConflictError(
    'admin_user.email_taken',
    'Ya existe una cuenta con ese correo.',
    'email',
  );

async function emailExists(email: string, exceptId?: string) {
  const [row] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(
      exceptId
        ? and(eq(adminUsers.email, email), ne(adminUsers.id, exceptId))
        : eq(adminUsers.email, email),
    )
    .limit(1);

  return row !== undefined;
}

export async function createAdminUser(
  input: CreateAdminUserInput,
): Promise<void> {
  if (await emailExists(input.email)) throw EMAIL_TAKEN();

  await db.insert(adminUsers).values({
    name: input.name,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    role: input.role,
    active: true,
  });
}

/**
 * Edits someone's name, address, role and access.
 *
 * `actorId` is not decoration. Two things are refused here and both are about
 * not being able to undo them from the interface:
 *
 * 1. **You cannot change your own role or switch yourself off.** Someone
 *    demoting themselves by accident would need another owner to restore them,
 *    and if they were the only one there is nobody.
 * 2. **The last active owner stays an active owner.** Losing every owner leaves
 *    nobody who can create users or grant roles, and the only way back is a
 *    hand-written UPDATE against production.
 *
 * The guard lives in the service rather than the form because a Server Action
 * is a public POST endpoint, and a check that only exists in a component is not
 * a check.
 */
export async function updateAdminUser(
  id: string,
  input: UpdateAdminUserInput,
  actorId: string,
): Promise<void> {
  const [existing] = await db
    .select({ role: adminUsers.role, active: adminUsers.active })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('admin_user.not_found', 'La cuenta no existe.');
  }

  const demoting = existing.role === 'owner' && input.role !== 'owner';
  const deactivating = existing.active && !input.active;

  if (id === actorId && (demoting || deactivating)) {
    throw new ConflictError(
      'admin_user.self_lockout',
      'No puedes quitarte tu propio rol ni desactivar tu cuenta. Pídeselo a otro owner.',
    );
  }

  if (existing.role === 'owner' && (demoting || deactivating)) {
    if ((await countOtherActiveOwners(id)) === 0) {
      throw new ConflictError(
        'admin_user.last_owner',
        'Es el único owner activo. Nombra a otro owner antes de cambiar este.',
      );
    }
  }

  if (await emailExists(input.email, id)) throw EMAIL_TAKEN();

  await db
    .update(adminUsers)
    .set({
      name: input.name,
      email: input.email,
      role: input.role,
      active: input.active,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, id));
}

/**
 * Sets a new password.
 *
 * There is no "current password" step: this is an owner resetting someone
 * else's access, not a person changing their own. The distinction matters — an
 * owner who had to know the old password could never help anyone who forgot it,
 * which is the entire reason a reset exists.
 */
export async function resetAdminUserPassword(
  id: string,
  password: string,
): Promise<void> {
  const result = await db
    .update(adminUsers)
    .set({
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, id))
    .returning({ id: adminUsers.id });

  if (result.length === 0) {
    throw new NotFoundError('admin_user.not_found', 'La cuenta no existe.');
  }
}
