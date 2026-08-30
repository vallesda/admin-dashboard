import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import PageHeader from '@/app/ui/kit/page-header';
import PackageForm from '@/modules/catalog/components/package-form';

export const metadata = { title: 'Crear paquete' };

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Paquetes', href: '/dashboard/packages' },
          {
            label: 'Crear paquete',
            href: '/dashboard/packages/create',
            active: true,
          },
        ]}
      />

      <PageHeader
        title="Crear paquete"
        description="Primero el nombre y la foto. Al guardar podrás agregarle los productos."
      />

      <PackageForm />
    </div>
  );
}
