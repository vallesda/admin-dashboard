import { CheckIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

import Badge from '@/app/ui/kit/badge';

/**
 * Active/inactive badge.
 *
 * State is never carried by colour alone — icon plus text — so it survives
 * greyscale and colour blindness (RNF-A11Y).
 */
export default function CategoryStatus({ active }: { active: boolean }) {
  return active ? (
    <Badge tone="ok" icon={CheckIcon}>
      Activa
    </Badge>
  ) : (
    <Badge tone="neutral" icon={EyeSlashIcon}>
      Inactiva
    </Badge>
  );
}
