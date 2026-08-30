import type { AdminRole } from '@/db/schema/identity';
import Badge, { type BadgeTone } from '@/app/ui/kit/badge';

/**
 * What a role can do, said in one word.
 *
 * The tones are ranked by reach rather than by alarm: `owner` is the only role
 * that can grant access, so it is the one that stands out; `admin` runs the
 * catalogue and the money; `staff` works the counter.
 */
const LABEL: Record<AdminRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
};

const TONE: Record<AdminRole, BadgeTone> = {
  owner: 'info',
  admin: 'ok',
  staff: 'neutral',
};

export default function RoleBadge({ role }: { role: AdminRole }) {
  return <Badge tone={TONE[role]}>{LABEL[role]}</Badge>;
}

/** What each role is allowed to do, for the form's help text. */
export const ROLE_DESCRIPTION: Record<AdminRole, string> = {
  staff:
    'Toma pedidos, los hace avanzar, recibe y ajusta inventario, y da de alta clientes.',
  admin:
    'Todo lo de staff, más el catálogo completo, los paquetes, los umbrales de stock y registrar cobros.',
  owner: 'Todo lo de admin, más crear cuentas y cambiar roles.',
};
