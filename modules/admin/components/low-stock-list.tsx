import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { lusitana } from '@/app/ui/fonts';
import { listLowStock } from '../queries';

/**
 * Products that need restocking (RF-INV-008).
 *
 * Replaces the tutorial's revenue chart, which plotted a hardcoded `revenue`
 * table nobody wrote to.
 */
export default async function LowStockList() {
  const items = await listLowStock();

  return (
    <div className="flex w-full flex-col md:col-span-4">
      <h2 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Bajo stock
      </h2>
      <div className="flex grow flex-col justify-between rounded-xl bg-gray-50 p-4">
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-gray-500">
            Ningún producto activo está por debajo de su umbral.
          </p>
        ) : (
          <div className="bg-white px-6">
            {items.map((item, i) => (
              <Link
                key={item.productId}
                href={`/dashboard/inventory/${item.productId}`}
                className={`flex flex-row items-center justify-between py-4 hover:bg-gray-50 ${
                  i !== 0 ? 'border-t' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold md:text-base">
                    {item.name}
                  </p>
                  <p className="font-mono text-sm text-gray-500">{item.sku}</p>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <ExclamationTriangleIcon className="w-4 text-amber-600" />
                  <span className="text-sm tabular-nums">
                    {item.available} disp.
                  </span>
                  <span className="text-xs text-gray-500 tabular-nums">
                    (umbral {item.lowStockThreshold})
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
