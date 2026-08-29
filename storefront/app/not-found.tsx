
import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-container flex-col items-start gap-6 px-5 py-24 md:px-8">
      <h1 className="text-5xl">No encontramos esa página</h1>
      <p className="max-w-[48ch] text-lg text-muted">
        Puede que el producto ya no esté disponible o que la dirección haya
        cambiado.
      </p>
      <ButtonLink href="/">Ver todos los productos</ButtonLink>
    </div>
  );
}
