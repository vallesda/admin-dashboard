'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { PhotoIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const MAX_BYTES = 6 * 1024 * 1024;

/**
 * Product image upload.
 *
 * Uploads straight from the browser to Vercel Blob and writes the resulting URL
 * into a hidden input, so the product form submits a URL exactly as it did when
 * the field was typed by hand. Nothing else about the form changes.
 *
 * The file never passes through a Server Action: those cap request bodies at
 * 1 MB by default, which a phone photo exceeds immediately.
 */
export default function ImagePicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(defaultValue ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);

    // Checked here for a fast, specific message; the upload endpoint enforces
    // the same limits server-side, which is where it actually counts.
    if (file.size > MAX_BYTES) {
      setError(
        `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El máximo son 6 MB.`,
      );
      return;
    }

    setBusy(true);

    try {
      const blob = await upload(`products/${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
      });

      setUrl(blob.url);
    } catch (e) {
      const message = (e as Error).message ?? '';

      if (message.includes('modo privado') || message.includes('private store')) {
        setError(
          'El store de Blob está en modo privado. Cámbialo a público en Vercel → Storage → Settings.',
        );
      } else if (
        message.includes('501') ||
        message.toLowerCase().includes('blob_read_write')
      ) {
        setError('El almacenamiento de imágenes todavía no está configurado.');
      } else {
        setError(`No se pudo subir la imagen. ${message}`);
      }
    } finally {
      setBusy(false);
      // Clear the file input so picking the same file again still fires change.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      {/* What the form actually submits. Clearing the image submits "", which
          the validator turns into null. */}
      <input type="hidden" name={name} value={url ?? ''} />

      <div className="flex items-start gap-4">
        <div className="flex h-24 w-24 flex-none items-center justify-center overflow-hidden rounded-md border border-line bg-subtle">
          {url ? (
            <Image
              src={url}
              alt=""
              width={96}
              height={96}
              className="h-24 w-24 object-cover"
              unoptimized
            />
          ) : (
            <PhotoIcon className="w-8 text-ink-subtle" aria-hidden="true" />
          )}
        </div>

        <div className="flex-1">
          <input
            ref={inputRef}
            id={`${name}-file`}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={`${name}-file`}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-xs font-medium text-ink transition-colors hover:bg-subtle"
            >
              {busy ? (
                <>
                  <ArrowPathIcon className="w-4 animate-spin" />
                  Subiendo…
                </>
              ) : (
                <>
                  <PhotoIcon className="w-4" />
                  {url ? 'Cambiar imagen' : 'Agregar imagen'}
                </>
              )}
            </label>

            {url && !busy ? (
              <button
                type="button"
                onClick={() => setUrl(null)}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-medium hover:bg-subtle"
              >
                <TrashIcon className="w-4" />
                Quitar
              </button>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-ink-muted">
            JPG, PNG, WebP o AVIF. Máximo 6 MB.
          </p>

          <div aria-live="polite" aria-atomic="true">
            {error ? (
              <p className="mt-2 text-sm text-danger">{error}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
