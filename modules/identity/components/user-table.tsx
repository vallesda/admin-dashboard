import { UserGroupIcon } from '@heroicons/react/24/outline';

import { listAdminUsers } from '../queries';
import RoleBadge from './role-badge';
import { CreateUser, EditUser } from './user-buttons';
import { TableShell, Table, THead, TH, TBody, TR, TD } from '@/app/ui/kit/table';
import RecordCard from '@/app/ui/kit/record-card';
import EmptyState from '@/app/ui/kit/empty-state';
import Badge from '@/app/ui/kit/badge';

const dateFormat = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeZone: 'America/Mexico_City',
});

/**
 * Who has access.
 *
 * There is no delete. Deactivating cuts a session off on the very next request
 * — the JWT callback re-reads the row and drops the token — while keeping the
 * name attached to every inventory movement that person recorded. Deleting the
 * row would either orphan that history or cascade it away, and an append-only
 * ledger that loses its actor is no longer a ledger.
 */
export default async function UserTable({ actorId }: { actorId: string }) {
  const users = await listAdminUsers();

  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={UserGroupIcon}
          title="No hay cuentas"
          description="Crea la primera para dar acceso al panel."
          action={<CreateUser />}
        />
      </div>
    );
  }

  return (
    <>
      {/* Mobile */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {users.map((user) => (
          <RecordCard
            key={user.id}
            title={
              <>
                {user.name}
                {user.id === actorId ? (
                  <span className="ml-2 text-xs font-normal text-ink-muted">
                    (tú)
                  </span>
                ) : null}
              </>
            }
            subtitle={user.email}
            badge={<RoleBadge role={user.role} />}
            rows={[
              {
                label: 'Acceso',
                value: user.active ? 'Activo' : 'Desactivado',
              },
              { label: 'Alta', value: dateFormat.format(user.createdAt) },
            ]}
            actions={<EditUser id={user.id} name={user.name} />}
          />
        ))}
      </div>

      {/* Desktop */}
      <TableShell className="hidden md:block">
        <Table>
          <THead>
            <TH>Nombre</TH>
            <TH>Correo</TH>
            <TH>Rol</TH>
            <TH>Acceso</TH>
            <TH>Alta</TH>
            <TH srOnly>Acciones</TH>
          </THead>
          <TBody>
            {users.map((user) => (
              <TR key={user.id}>
                <TD className="whitespace-nowrap font-medium">
                  {user.name}
                  {/* Marked because the edit screen refuses to let someone
                      demote or switch off their own account, and knowing which
                      row is yours before you open it saves the trip. */}
                  {user.id === actorId ? (
                    <span className="ml-2 text-xs font-normal text-ink-muted">
                      (tú)
                    </span>
                  ) : null}
                </TD>
                <TD muted className="whitespace-nowrap">
                  {user.email}
                </TD>
                <TD>
                  <RoleBadge role={user.role} />
                </TD>
                <TD>
                  {user.active ? (
                    <Badge tone="ok">Activo</Badge>
                  ) : (
                    <Badge tone="danger">Desactivado</Badge>
                  )}
                </TD>
                <TD muted className="whitespace-nowrap">
                  {dateFormat.format(user.createdAt)}
                </TD>
                <TD>
                  <div className="flex justify-end">
                    <EditUser id={user.id} name={user.name} />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableShell>
    </>
  );
}
