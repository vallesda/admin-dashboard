import 'server-only';

/**
 * Vercel Blob helpers for product images.
 *
 * Uploads go straight from the browser to Blob (`@vercel/blob/client`), never
 * through a Server Action: Next caps Server Action bodies at 1 MB by default,
 * and a photo taken on a phone clears that on the first try. Client upload also
 * avoids paying to move every file twice — once to us, once to Blob.
 */
import { del } from '@vercel/blob';

/** What the product image picker accepts. */
export const IMAGE_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

/**
 * 6 MB. Comfortably fits a phone photo without letting someone park a video in
 * the product catalogue.
 */
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/** Folder prefix, so product images are distinguishable in the blob listing. */
export const PRODUCT_IMAGE_PREFIX = 'products';

/**
 * Deletes a blob, tolerating one that is already gone.
 *
 * Called when a product image is replaced or cleared. A failure here must never
 * fail the surrounding operation: the product save is what the user asked for,
 * and an orphaned blob is a cost problem, not a correctness one. It is logged
 * so the orphan is at least traceable.
 */
export async function deleteBlobQuietly(url: string | null): Promise<void> {
  if (!url) return;
  if (!isBlobUrl(url)) return;

  try {
    await del(url);
  } catch (error) {
    console.error('No se pudo borrar el blob:', url, error);
  }
}

/**
 * Whether a URL points at our Blob store.
 *
 * Guards `del()` against being handed an arbitrary external URL — the image
 * field accepted hand-typed URLs before this feature, and some products may
 * still carry one.
 */
export function isBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

/** True when the Blob store has been provisioned for this environment. */
export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
