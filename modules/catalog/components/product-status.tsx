import {
  CheckIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import type { ProductStatus } from '@/db/schema/catalog';

const LABEL: Record<ProductStatus, string> = {
  draft: 'Borrador',
  active: 'Activo',
  archived: 'Archivado',
};

/**
 * Product lifecycle badge.
 *
 * Three states, each with its own icon *and* word: `draft` and `archived` are
 * both "not for sale" but mean very different things operationally, and colour
 * alone would not tell them apart in greyscale.
 */
export default function ProductStatusBadge({
  status,
}: {
  status: ProductStatus;
}) {
  const Icon =
    status === 'active'
      ? CheckIcon
      : status === 'draft'
        ? PencilSquareIcon
        : ArchiveBoxIcon;

  return (
    <span
      className={clsx(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-1 text-xs',
        {
          'bg-green-500 text-white': status === 'active',
          'bg-amber-100 text-amber-800': status === 'draft',
          'bg-gray-100 text-gray-500': status === 'archived',
        },
      )}
    >
      {LABEL[status]}
      <Icon
        className={clsx('ml-1 w-4', {
          'text-white': status === 'active',
          'text-amber-800': status === 'draft',
          'text-gray-500': status === 'archived',
        })}
      />
    </span>
  );
}
