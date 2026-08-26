import Logo from '@/app/ui/logo';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import styles from '@/app/ui/home.module.css';
import { lusitana } from '@/app/ui/fonts';
import Image from 'next/image';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col p-6">
      <div className="flex h-20 shrink-0 items-end rounded-lg bg-brand-600 p-4 md:h-52">
        <Logo size={120} />
      </div>
      <div className="mt-4 flex grow flex-col gap-4 md:flex-row">
        <div className="flex flex-col justify-center gap-6 rounded-lg bg-gray-50 px-6 py-10 md:w-2/5 md:px-20">
        <div className={styles.shape} />
          <p
            className={`${lusitana.className} text-xl text-gray-800 md:text-3xl md:leading-normal`}
          >
            <strong>Amor Amar.</strong> Panel de administración: catálogo,
            inventario y pedidos en un solo lugar.
          </p>
          <Link
            href="/login"
            className="flex items-center gap-5 self-start rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500 md:text-base"
          >
            <span>Entrar</span> <ArrowRightIcon className="w-5 md:w-6" />
          </Link>
        </div>
        <div className="flex items-center justify-center p-6 md:w-3/5 md:px-28 md:py-12">
          {/* One image for both breakpoints. The tutorial shipped a desktop
              and a mobile crop; this asset scales, so serving two files would
              only mean two downloads to maintain. */}
          <Image
            src="/admin-hero.png"
            width={1672}
            height={941}
            priority
            sizes="(min-width: 768px) 60vw, 100vw"
            className="h-auto w-full rounded-lg"
            alt="Panel de administración mostrando productos e inventario"
          />
        </div>
      </div>
    </main>
  );
}
