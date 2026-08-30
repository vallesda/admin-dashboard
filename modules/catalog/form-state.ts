/**
 * Shape passed between a Category form and its server action.
 *
 * Lives outside `actions.ts` because a `'use server'` module may only export
 * async functions — exporting the constant from there fails the build with
 * "A 'use server' file can only export async functions, found object".
 */
export type CategoryFormState = {
  errors?: {
    name?: string[];
    slug?: string[];
    sortOrder?: string[];
    active?: string[];
    tagline?: string[];
    imageUrl?: string[];
    isFeatured?: string[];
  };
  message?: string | null;
};

export const emptyCategoryFormState: CategoryFormState = {
  errors: {},
  message: null,
};

/**
 * Abierto en vez de una unión cerrada de claves.
 *
 * El formulario de producto ya tiene quince campos y el abastecimiento le suma
 * cinco más; mantener a mano la lista garantiza que se desincronice la primera
 * vez que alguien añada uno. Las claves son los `name` de los inputs, que es lo
 * que el componente busca de todos modos.
 */
export type ProductFormState = {
  errors?: Record<string, string[] | undefined>;
  message?: string | null;
};

export const emptyProductFormState: ProductFormState = {
  errors: {},
  message: null,
};

export type PackageFormState = {
  errors?: {
    name?: string[];
    slug?: string[];
    tagline?: string[];
    description?: string[];
    imageUrl?: string[];
    sortOrder?: string[];
    active?: string[];
  };
  message?: string | null;
};

export const emptyPackageFormState: PackageFormState = {
  errors: {},
  message: null,
};
