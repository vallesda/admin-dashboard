import type { NextAuthConfig } from 'next-auth';
 
export const authConfig = {
  /**
   * El panel siempre vive detrás de un proxy de confianza.
   *
   * Sin esto, `trustHost` se deducía del entorno —`AUTH_URL ?? AUTH_TRUST_HOST
   * ?? VERCEL ?? NODE_ENV !== 'production'`— y bastaba con no tener ninguna de
   * esas para que Auth.js rechazara **toda** petición con «There was a problem
   * with the server configuration», el mismo mensaje genérico que da cuando
   * falta el secreto. Se comprobó en `@auth/core/lib/utils/assert.js`: la
   * comprobación de host va antes que la del secreto, así que ese error tapaba
   * cualquier otro diagnóstico.
   *
   * Declararlo aquí lo saca del entorno: en Vercel la cabecera `Host` la fija
   * el edge y en local es `localhost`. Es una constante del despliegue, no algo
   * que deba poder desconfigurarse desde un panel web.
   */
  trustHost: true,

  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;