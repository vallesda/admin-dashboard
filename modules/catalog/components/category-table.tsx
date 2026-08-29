import { TagIcon } from '@heroicons/react/24/outline';

import { listCategories } from '../queries';
import CategoryStatus from './category-status';
import { UpdateCategory, ToggleCategory } from './buttons';
import { TableShell, Table, THead, TH, TBody, TR, TD } from '@/app/ui/kit/table';
import RecordCard from '@/app/ui/kit/record-card';
import EmptyState from '@/app/ui/kit/empty-state';
import { ButtonLink } from '@/app/ui/button';

/**
 * Admin list of categories.
 *
 * Server component that fetches its own data, so it can sit behind its own
 * `<Suspense>` boundary.
 *
 * No search or pagination on purpose: a flat category list for one shop is tens
 * of rows. Products do need both (RF-CAT-004).
 */
export default async function CategoryTable() {
  const categories = await listCategories();

  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={TagIcon}
          title="Todavía no hay categorías"
          description="Las categorías agrupan el catálogo en la tienda. Crea la primera para poder clasificar productos."
          action={
            <ButtonLink href="/dashboard/categories/create">
              Crear categoría
            </ButtonLink>
          }
        />
      </div>
    );
  }

  return (
    <>
      {/* Mobile */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {categories.map((category) => (
          <RecordCard
            key={category.id}
            title={category.name}
            subtitle={`/${category.slug}`}
            badge={<CategoryStatus active={category.active} />}
            rows={[
              { label: 'Orden', value: category.sortOrder, numeric: true },
            ]}
            actions={
              <>
                <UpdateCategory id={category.id} name={category.name} />
                <ToggleCategory
                  id={category.id}
                  name={category.name}
                  active={category.active}
                />
              </>
            }
          />
        ))}
      </div>

      {/* Desktop */}
      <TableShell className="hidden md:block">
        <Table>
          <THead>
            <TH>Nombre</TH>
            <TH>URL</TH>
            <TH align="right">Orden</TH>
            <TH>Estado</TH>
            <TH srOnly>Acciones</TH>
          </THead>
          <TBody>
            {categories.map((category) => (
              <TR key={category.id}>
                <TD className="whitespace-nowrap font-medium">
                  {category.name}
                </TD>
                <TD muted className="whitespace-nowrap font-mono text-xs">
                  /{category.slug}
                </TD>
                {/* Digits line up between rows, which is what makes the sort
                    order scannable at a glance. */}
                <TD numeric className="whitespace-nowrap">
                  {category.sortOrder}
                </TD>
                <TD>
                  <CategoryStatus active={category.active} />
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-1.5">
                    <UpdateCategory id={category.id} name={category.name} />
                    <ToggleCategory
                      id={category.id}
                      name={category.name}
                      active={category.active}
                    />
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
