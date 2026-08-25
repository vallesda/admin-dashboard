import { CheckIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

/**
 * Active/inactive badge.
 *
 * Mirrors the shape of `app/ui/invoices/status.tsx`. State is never carried by
 * colour alone — icon plus text — so it survives greyscale and colour blindness
 * (RNF-A11Y).
 */
export default function CategoryStatus({ active }: { active: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-1 text-xs',
        {
          'bg-green-500 text-white': active,
          'bg-gray-100 text-gray-500': !active,
        },
      )}
    >
      {active ? (
        <>
          Activa
          <CheckIcon className="ml-1 w-4 text-white" />
        </>
      ) : (
        <>
          Inactiva
          <EyeSlashIcon className="ml-1 w-4 text-gray-500" />
        </>
      )}
    </span>
  );
}
