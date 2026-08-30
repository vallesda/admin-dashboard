'use server';

/**
 * CAT — Next.js adapter for Category use cases.
 *
 * Realiza: RF-CAT-001 · HU-CAT-001.
 *
 * This file does adapter work only — authorize, parse input, call the service,
 * revalidate. Business rules live in `service.ts` (DOCS/README.md, regla de
 * gobierno 2 y 3).
 */
import { revalidatePath } from 'next/cache';

import { AuthorizationError, requireRole } from '@/lib/auth/guard';
import { isDomainError } from '@/lib/errors';
import { redirectWithFlash } from '@/lib/flash';
import { failed, ok, type ActionResult } from '@/lib/action-result';
import * as service from './service';
import {
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  createPackageSchema,
  updatePackageSchema,
  packageItemSchema,
} from './validators';
import type {
  CategoryFormState,
  ProductFormState,
  PackageFormState,
} from './form-state';
import type { ProductStatus } from '@/db/schema/catalog';

const CATEGORIES_PATH = '/dashboard/categories';
const PRODUCTS_PATH = '/dashboard/products';

/** FormData → the shape the Zod schemas expect. */
function readForm(formData: FormData) {
  const slug = String(formData.get('slug') ?? '').trim();

  return {
    name: formData.get('name'),
    // An empty slug field means "derive it from the name", so it must reach the
    // schema as undefined rather than as ''.
    slug: slug === '' ? undefined : slug,
    sortOrder: formData.get('sortOrder') ?? 0,
    // An unchecked checkbox is absent from FormData entirely, which is the
    // difference between "false" and "missing".
    active: formData.get('active') === 'on',
    tagline: formData.get('tagline'),
    imageUrl: formData.get('imageUrl'),
    isFeatured: formData.get('isFeatured') === 'on',
  };
}

/**
 * Turns a DomainError into a field error when it names a field, and into a
 * form-level message otherwise. Anything that is not a DomainError is a real
 * bug and is rethrown so it surfaces instead of being hidden behind a friendly
 * message.
 */
function toFormState(error: unknown, fallback: string): CategoryFormState {
  if (!isDomainError(error)) throw error;

  if (error.field) {
    return { errors: { [error.field]: [error.message] }, message: null };
  }

  return { errors: {}, message: error.message ?? fallback };
}

export async function createCategory(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireRole('admin');

  const parsed = createCategorySchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Faltan campos o hay errores. No se creó la categoría.',
    };
  }

  try {
    await service.createCategory(parsed.data);
  } catch (error) {
    return toFormState(error, 'No se pudo crear la categoría.');
  }

  revalidatePath(CATEGORIES_PATH);
  redirectWithFlash(CATEGORIES_PATH, 'category.created');
}

export async function updateCategory(
  id: string,
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireRole('admin');

  const parsed = updateCategorySchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Faltan campos o hay errores. No se guardó la categoría.',
    };
  }

  try {
    await service.updateCategory(id, parsed.data);
  } catch (error) {
    return toFormState(error, 'No se pudo guardar la categoría.');
  }

  revalidatePath(CATEGORIES_PATH);
  redirectWithFlash(CATEGORIES_PATH, 'category.updated');
}

/**
 * Toggles a category between active and inactive.
 *
 * The MVP has no delete: `RF-CAT-001` asks for an active flag, and deactivating
 * keeps every product's `category_id` intact.
 */
export async function toggleCategoryActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    await requireRole('admin');
    await service.setCategoryActive(id, active);
  } catch (error) {
    // A DomainError is an expected refusal and belongs in a toast. Anything
    // else is a bug and is rethrown so it still fails loudly.
    if (error instanceof AuthorizationError) return failed(error.message);
    if (!isDomainError(error)) throw error;
    return failed(error.message);
  }

  revalidatePath(CATEGORIES_PATH);
  return ok(active ? 'Categoría activada.' : 'Categoría desactivada.');
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

/**
 * Same `toFormState` treatment as categories, but typed to the product form so
 * a stray field name cannot slip through.
 */
function toProductFormState(
  error: unknown,
  fallback: string,
): ProductFormState {
  if (!isDomainError(error)) throw error;

  if (error.field) {
    return { errors: { [error.field]: [error.message] }, message: null };
  }

  return { errors: {}, message: error.message ?? fallback };
}

/**
 * Reads the product form.
 *
 * Empty strings become `undefined` for the optional fields so the schema can
 * tell "not provided" from "provided as blank" — the difference between leaving
 * cost unrecorded and recording a cost of zero.
 */
function readProductForm(formData: FormData) {
  const text = (key: string) => {
    const value = String(formData.get(key) ?? '').trim();
    return value === '' ? undefined : value;
  };

  return {
    sku: formData.get('sku'),
    name: formData.get('name'),
    slug: text('slug'),
    description: text('description'),
    categoryId: text('categoryId'),
    priceCents: formData.get('priceCents'),
    costCents: text('costCents'),
    imageUrl: text('imageUrl'),
    unitType: formData.get('unitType'),
    netWeightGrams: text('netWeightGrams'),
  };
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireRole('admin');

  const parsed = createProductSchema.safeParse(readProductForm(formData));

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Faltan campos o hay errores. No se creó el producto.',
    };
  }

  try {
    await service.createProduct(parsed.data);
  } catch (error) {
    return toProductFormState(error, 'No se pudo crear el producto.');
  }

  revalidatePath(PRODUCTS_PATH);
  redirectWithFlash(PRODUCTS_PATH, 'product.created');
}

export async function updateProduct(
  id: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireRole('admin');

  const parsed = updateProductSchema.safeParse(readProductForm(formData));

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Faltan campos o hay errores. No se guardó el producto.',
    };
  }

  try {
    await service.updateProduct(id, parsed.data);
  } catch (error) {
    return toProductFormState(error, 'No se pudo guardar el producto.');
  }

  revalidatePath(PRODUCTS_PATH);
  redirectWithFlash(PRODUCTS_PATH, 'product.updated');
}

/**
 * Publish / archive / send back to draft (RF-CAT-005, RF-CAT-006).
 *
 * Illegal transitions are rejected by the service (INV-PRO-05). This adapter
 * lets the DomainError propagate rather than swallowing it: the buttons only
 * ever offer legal transitions, so reaching an illegal one means a forged POST
 * or a bug, and neither should look like a normal outcome.
 */
const PRODUCT_STATUS_DONE: Record<ProductStatus, string> = {
  active: 'Producto activado: ya aparece en la tienda.',
  archived: 'Producto archivado: se retiró de la tienda.',
  draft: 'Producto devuelto a borrador.',
};

export async function changeProductStatus(
  id: string,
  next: ProductStatus,
): Promise<ActionResult> {
  try {
    await requireRole('admin');
    await service.changeProductStatus(id, next);
  } catch (error) {
    if (error instanceof AuthorizationError) return failed(error.message);
    if (!isDomainError(error)) throw error;
    return failed(error.message);
  }

  revalidatePath(PRODUCTS_PATH);
  return ok(PRODUCT_STATUS_DONE[next]);
}

// ---------------------------------------------------------------------------
// Package
// ---------------------------------------------------------------------------

const PACKAGES_PATH = '/dashboard/packages';

/** FormData → the shape the package schemas expect. */
function readPackageForm(formData: FormData) {
  const slug = String(formData.get('slug') ?? '').trim();

  return {
    name: formData.get('name'),
    // An empty slug means "derive it from the name", so it must reach the
    // schema as undefined rather than as ''.
    slug: slug === '' ? undefined : slug,
    tagline: formData.get('tagline'),
    description: formData.get('description'),
    imageUrl: formData.get('imageUrl'),
    sortOrder: formData.get('sortOrder') ?? 0,
    // An unchecked checkbox is absent from FormData entirely, which is the
    // difference between "false" and "missing".
    active: formData.get('active') === 'on',
  };
}

function toPackageFormState(
  error: unknown,
  fallback: string,
): PackageFormState {
  if (!isDomainError(error)) throw error;

  if (error.field) {
    return { errors: { [error.field]: [error.message] }, message: null };
  }

  return { errors: {}, message: error.message ?? fallback };
}

export async function createPackage(
  _prevState: PackageFormState,
  formData: FormData,
): Promise<PackageFormState> {
  await requireRole('admin');

  const parsed = createPackageSchema.safeParse(readPackageForm(formData));

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Revisa los campos. No se creó el paquete.',
    };
  }

  let created;
  try {
    created = await service.createPackage(parsed.data);
  } catch (error) {
    return toPackageFormState(error, 'No se pudo crear el paquete.');
  }

  revalidatePath(PACKAGES_PATH);
  // Straight to the editor: a package with no lines is not finished, and the
  // next thing anyone does is add pieces to it.
  redirectWithFlash(`${PACKAGES_PATH}/${created.id}/edit`, 'package.created');
}

export async function updatePackage(
  id: string,
  _prevState: PackageFormState,
  formData: FormData,
): Promise<PackageFormState> {
  await requireRole('admin');

  const parsed = updatePackageSchema.safeParse(readPackageForm(formData));

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Revisa los campos. No se guardó el paquete.',
    };
  }

  try {
    await service.updatePackage(id, parsed.data);
  } catch (error) {
    return toPackageFormState(error, 'No se pudo guardar el paquete.');
  }

  revalidatePath(PACKAGES_PATH);
  revalidatePath(`${PACKAGES_PATH}/${id}/edit`);
  redirectWithFlash(PACKAGES_PATH, 'package.updated');
}

export async function togglePackageActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    await requireRole('admin');
    await service.setPackageActive(id, active);
  } catch (error) {
    if (error instanceof AuthorizationError) return failed(error.message);
    if (!isDomainError(error)) throw error;
    return failed(error.message);
  }

  revalidatePath(PACKAGES_PATH);
  return ok(active ? 'Paquete publicado.' : 'Paquete despublicado.');
}

export async function addPackageItem(
  packageId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = packageItemSchema.safeParse({
    productId: formData.get('productId'),
    quantity: formData.get('quantity') ?? 1,
  });

  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return failed(first ?? 'Revisa el producto y la cantidad.');
  }

  try {
    await requireRole('admin');
    await service.addPackageItem(packageId, parsed.data);
  } catch (error) {
    if (error instanceof AuthorizationError) return failed(error.message);
    if (!isDomainError(error)) throw error;
    return failed(error.message);
  }

  revalidatePath(`${PACKAGES_PATH}/${packageId}/edit`);
  revalidatePath(PACKAGES_PATH);
  return ok('Producto agregado al paquete.');
}

export async function removePackageItem(
  packageId: string,
  productId: string,
): Promise<ActionResult> {
  try {
    await requireRole('admin');
    await service.removePackageItem(packageId, productId);
  } catch (error) {
    if (error instanceof AuthorizationError) return failed(error.message);
    if (!isDomainError(error)) throw error;
    return failed(error.message);
  }

  revalidatePath(`${PACKAGES_PATH}/${packageId}/edit`);
  revalidatePath(PACKAGES_PATH);
  return ok('Producto quitado del paquete.');
}
