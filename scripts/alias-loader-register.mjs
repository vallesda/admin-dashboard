/** Registers the `@/*` resolve hook for scripts run with plain Node. */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./alias-loader.mjs', pathToFileURL(import.meta.filename));
