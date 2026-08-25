import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

import { requireRole, AuthorizationError } from '@/lib/auth/guard';
import {
  IMAGE_CONTENT_TYPES,
  MAX_IMAGE_BYTES,
  isBlobConfigured,
} from '@/lib/blob';

/**
 * Issues short-lived upload tokens for the product image picker.
 *
 * The browser asks here first, uploads straight to Blob with the token it gets
 * back, and only then hands the resulting URL to the product form.
 *
 * SECURITY: `onBeforeGenerateToken` is the only gate on this endpoint. Without
 * the role check it would be an open upload URL for anyone on the internet, so
 * the authorization has to happen before a token is ever minted — not after the
 * file has arrived.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Authorize before anything else. Checking configuration first would tell an
  // anonymous caller which environment variables this server is missing, and
  // that is not information a stranger should be able to probe for.
  try {
    await requireRole('admin');
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  if (!isBlobConfigured()) {
    return NextResponse.json(
      {
        error:
          'El almacenamiento de imágenes no está configurado. Falta BLOB_READ_WRITE_TOKEN.',
      },
      { status: 501 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Checked again here, not only above: this is the hook the SDK
        // guarantees runs before a token is minted, so the guarantee should not
        // depend on someone remembering to keep the early check in place.
        await requireRole('admin');

        return {
          allowedContentTypes: [...IMAGE_CONTENT_TYPES],
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          // Blob appends a random suffix, so two products called "salmon.jpg"
          // cannot overwrite each other.
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Vercel calls this from its own servers, so it never fires against
        // localhost. Nothing depends on it: the URL reaches the database
        // through the form the user submits, not through this callback.
        console.log('Imagen subida:', blob.url);
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const message = (error as Error).message ?? '';

    // A store created in private mode rejects `access: 'public'` with a message
    // that means nothing to whoever is uploading a photo. Product images are
    // meant to be served publicly, so the fix is a store setting, not code —
    // say so instead of surfacing the SDK's wording.
    if (message.includes('private store')) {
      return NextResponse.json(
        {
          error:
            'El store de Blob está en modo privado. Cámbialo a público en Vercel → Storage → Settings para poder publicar imágenes de producto.',
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
