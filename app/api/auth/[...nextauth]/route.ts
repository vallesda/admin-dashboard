/**
 * Auth.js route handler.
 *
 * Everything under `/api/auth/*` is served from here: the credentials
 * callback, `/session`, `/signout`, `/csrf` and the error page.
 *
 * Signing in from a Server Action does not go over HTTP — `signIn()` runs Auth
 * in-process and sets the cookies itself — which is why the panel appeared to
 * work without this file. But when that in-process call returns no redirect,
 * next-auth falls back to redirecting the browser at the URL it built, and
 * without this route that fallback is a 404 instead of the error page. The
 * client-side session endpoint has no fallback at all.
 *
 * `proxy.ts` deliberately excludes `/api` from its matcher, so these routes are
 * never wrapped by the dashboard's authorization check.
 */
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
