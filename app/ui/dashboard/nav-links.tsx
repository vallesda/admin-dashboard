'use client';

import {
  UserGroupIcon,
  HomeIcon,
  TagIcon,
  CubeIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  Squares2X2Icon,
  KeyIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

import { useRole } from '@/app/ui/kit/role';
import { hasRole, type Role } from '@/lib/auth/roles';

/**
 * Sidebar navigation.
 *
 * The order follows the operator's day: what you sell, how it is filed, what you
 * have, what was ordered, and who ordered it. Grouped, because six flat links
 * make the operator read all six to find the one they want — "Catálogo" and
 * "Operación" are the two halves of this job and they are rarely done in the
 * same sitting.
 */
const GROUPS: { label: string | null; role?: Role; links: NavLink[] }[] = [
  { label: null, links: [{ name: 'Panel', href: '/dashboard', icon: HomeIcon }] },
  {
    label: 'Catálogo',
    links: [
      { name: 'Productos', href: '/dashboard/products', icon: CubeIcon },
      { name: 'Categorías', href: '/dashboard/categories', icon: TagIcon },
      { name: 'Paquetes', href: '/dashboard/packages', icon: Squares2X2Icon },
      { name: 'Inventario', href: '/dashboard/inventory', icon: ArchiveBoxIcon },
    ],
  },
  {
    label: 'Operación',
    links: [
      {
        name: 'Pedidos',
        href: '/dashboard/orders',
        icon: ClipboardDocumentListIcon,
      },
      { name: 'Clientes', href: '/dashboard/customers', icon: UserGroupIcon },
      { name: 'Reparto', href: '/dashboard/delivery', icon: TruckIcon },
    ],
  },
  {
    label: 'Administración',
    // Hidden below `owner`. The routes refuse anyone else anyway, so showing
    // the link would only offer a door that opens onto an error page — the
    // same lie the role gating was built to stop telling.
    role: 'owner',
    links: [{ name: 'Usuarios', href: '/dashboard/users', icon: KeyIcon }],
  },
];

type NavLink = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

/**
 * `/dashboard` matches exactly; every other entry also matches its children, so
 * `/dashboard/products/abc/edit` keeps "Productos" lit. Without the prefix match
 * the sidebar went blank the moment anyone opened a record — the operator lost
 * their place exactly when they were deepest in a task.
 */
function isActive(pathname: string, href: string) {
  return href === '/dashboard'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavLinks() {
  const pathname = usePathname();
  const role = useRole();
  const groups = GROUPS.filter((g) => !g.role || hasRole(role, g.role));

  // The group wrapper is `display: contents` at every width, not just from
  // `md`. As a plain block below `md` each group stayed a single flex child of
  // the nav, so the six links laid out as three stacked columns — Productos,
  // Categorías and Inventario in a vertical pile — and ate 220px of a phone
  // screen. Dissolved, all six are direct children of the nav and scroll as one
  // row.
  return (
    <>
      {groups.map((group, i) => (
        <div key={group.label ?? 'root'} className="contents">
          {group.label ? (
            <p
              className={clsx(
                'hidden px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-ink-subtle md:block',
                i > 0 && 'pt-4',
              )}
            >
              {group.label}
            </p>
          ) : null}

          {group.links.map((link) => {
            const Icon = link.icon;
            const active = isActive(pathname, link.href);

            return (
              <Link
                key={link.name}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  // Mobile: an icon over its label, in a scrolling row.
                  // Desktop: a 36px row, which is the density the rest of the
                  // panel is drawn at.
                  'relative flex shrink-0 flex-col items-center gap-1 rounded-md px-3 py-2 text-[11px] font-medium transition-colors',
                  'md:h-9 md:flex-row md:gap-2.5 md:px-3 md:py-0 md:text-sm',
                  active
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-ink-muted hover:bg-subtle hover:text-ink',
                )}
              >
                {/*
                  The active state is a fill AND a left bar AND `aria-current`.
                  Colour alone would be the only signal, and brand green against
                  ink-muted is not a difference everyone can see.
                */}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-1 -left-px hidden w-0.5 rounded-full bg-brand-600 md:block"
                  />
                ) : null}
                <Icon className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap">{link.name}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}
