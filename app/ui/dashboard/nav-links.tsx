'use client';

import {
  UserGroupIcon,
  HomeIcon,
  TagIcon,
  CubeIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

// Sidebar navigation. The order follows the operator's day: what you sell,
// how it is filed, what you have, what was ordered, and who ordered it.
const links = [
  { name: 'Panel', href: '/dashboard', icon: HomeIcon },
  { name: 'Productos', href: '/dashboard/products', icon: CubeIcon },
  { name: 'Categorías', href: '/dashboard/categories', icon: TagIcon },
  { name: 'Inventario', href: '/dashboard/inventory', icon: ArchiveBoxIcon },
  { name: 'Pedidos', href: '/dashboard/orders', icon: ClipboardDocumentListIcon },
  { name: 'Clientes', href: '/dashboard/customers', icon: UserGroupIcon },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-brand-50 hover:text-brand-600 md:flex-none md:justify-start md:p-2 md:px-3',
              {
                'bg-brand-100 text-brand-600': pathname === link.href,
              },
            )}
          >
            <LinkIcon className="w-6" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </>
  );
}
