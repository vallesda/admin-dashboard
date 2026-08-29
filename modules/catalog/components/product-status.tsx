import {
  CheckIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';

import type { ProductStatus } from '@/db/schema/catalog';
import Badge, { type BadgeTone } from '@/app/ui/kit/badge';

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
 *
 * `active` is `ok` rather than the old solid `bg-green-500 text-white`. In a
 * catalogue where nearly every product is active, a saturated white-on-green
 * chip is the loudest thing on the screen, repeated forty times, saying
 * "normal" — which leaves nothing louder for the row that actually needs
 * attention. A draft is `warn` because it is the state that needs a decision.
 */
const TONE: Record<ProductStatus, BadgeTone> = {
  active: 'ok',
  draft: 'warn',
  archived: 'neutral',
};

const ICON = {
  active: CheckIcon,
  draft: PencilSquareIcon,
  archived: ArchiveBoxIcon,
} as const;

export default function ProductStatusBadge({
  status,
}: {
  status: ProductStatus;
}) {
  return (
    <Badge tone={TONE[status]} icon={ICON[status]}>
      {LABEL[status]}
    </Badge>
  );
}
