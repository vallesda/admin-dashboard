import Link from 'next/link';
import { LockClosedIcon } from '@heroicons/react/24/outline';

import type { Role } from '@/lib/auth/roles';

const ROLE_LABEL: Record<Role, string> = {
  owner: 'owner',
  admin: 'admin',
  staff: 'staff',
};

/**
 * A screen someone reached but may not use.
 *
 * It says which role the screen needs and who to ask, because "no tienes
 * permiso" with no next step turns a member of staff into a support ticket. It
 * is not a 404: pretending the screen does not exist would leave them looking
 * for a link that was never going to appear.
 */
export default function Forbidden({ needs }: { needs: Role }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-6 py-14 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-subtle text-ink-muted">
        <LockClosedIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="text-lg font-semibold text-ink">Esta pantalla no es tuya</h1>
      <p className="max-w-[52ch] text-sm text-ink-muted">
        Requiere el rol {ROLE_LABEL[needs]}. Si necesitas entrar, pídele a un
        owner que te lo asigne.
      </p>
      <Link
        href="/dashboard"
        className="mt-1 inline-flex h-9 items-center rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-subtle"
      >
        Volver al panel
      </Link>
    </div>
  );
}
