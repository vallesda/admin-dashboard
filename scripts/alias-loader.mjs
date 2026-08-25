/**
 * ESM resolve hook for scripts run with `node --experimental-strip-types`.
 *
 * Adds the two resolutions that Next/tsc do but plain Node does not:
 *   1. the `@/*` path alias from tsconfig, mapped to the repo root;
 *   2. extensionless imports (`./validators` → `./validators.ts`).
 *
 * Used by scripts that exercise a module's service directly against the
 * database. Not part of the application build.
 */
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';
import { statSync } from 'node:fs';

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');

/** First candidate that is an actual FILE — a bare directory does not count. */
function withExtension(basePath) {
  for (const candidate of [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    resolvePath(basePath, 'index.ts'),
  ]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // not there; try the next candidate
    }
  }
  return undefined;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const found = withExtension(resolvePath(root, specifier.slice(2)));
    if (found) return nextResolve(pathToFileURL(found).href, context);
  }

  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    const found = withExtension(resolvePath(parentDir, specifier));
    if (found) return nextResolve(pathToFileURL(found).href, context);
  }

  return nextResolve(specifier, context);
}
