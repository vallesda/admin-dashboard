'use client';

import { useState } from 'react';

import {
  ADDRESS,
  GOOGLE_MAPS_EMBED_SRC,
  GOOGLE_MAPS_URL,
  LOCALITY,
  REGION,
  SHOP_NAME,
} from '@/lib/shop';

/**
 * Dónde está el mostrador.
 *
 * ## Por qué no se carga el mapa de entrada
 *
 * El iframe de Google Maps trae cerca de un megabyte de JavaScript y **pone
 * cookies de Google antes de que nadie haya pedido un mapa**. Ponerlo suelto en
 * una página que la mayoría abre para leer otra cosa cuesta rendimiento en cada
 * visita y mete un tercero en la vida de quien no lo usó.
 *
 * Así que primero se ve una fachada —la dirección, que es el dato que la
 * mayoría venía a buscar, y un botón— y el iframe entra al pulsarlo. Quien sólo
 * quería la calle ya la tiene sin pagar nada; quien quiere el mapa lo pide.
 *
 * No es un patrón exótico: es lo mismo que hace un reproductor de vídeo con su
 * miniatura.
 *
 * ## Y el enlace siempre está
 *
 * «Cómo llegar» es un ancla normal a la ficha de Google, así que funciona sin
 * JavaScript, en un lector de pantalla y en el teléfono de alguien que prefiere
 * abrir su app de mapas. El botón del mapa es el extra, no el camino.
 */
export default function StoreMap() {
  const [showMap, setShowMap] = useState(false);

  if (!ADDRESS.streetAddress) return null;

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-display text-lg">{SHOP_NAME}</p>

          {/*
            `address` de verdad, no un `div`. Es el elemento que existe para
            esto y lo que hace que un lector de pantalla anuncie «dirección».
          */}
          <address className="mt-1 text-sm not-italic leading-relaxed text-muted">
            {ADDRESS.streetAddress}
            <br />
            {LOCALITY}, {REGION}
            {ADDRESS.postalCode ? ` · C.P. ${ADDRESS.postalCode}` : ''}
          </address>

          {ADDRESS.phone ? (
            <p className="mt-3 text-sm">
              <a
                href={`tel:${ADDRESS.phoneE164 ?? ADDRESS.phone}`}
                className="rounded-sm underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
              >
                {ADDRESS.phone}
              </a>
            </p>
          ) : null}
        </div>

        <div className="flex flex-none flex-col gap-2 sm:items-end">
          <a
            href={GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded border border-border-strong bg-surface px-6 py-3 text-sm font-medium transition-colors hover:bg-sand"
          >
            Cómo llegar
            <span className="sr-only"> — abre Google Maps en otra pestaña</span>
            <ExternalIcon />
          </a>

          {!showMap ? (
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="rounded-sm px-2 py-1 text-sm text-brand underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
            >
              Ver el mapa aquí
            </button>
          ) : null}
        </div>
      </div>

      {showMap ? (
        <iframe
          src={GOOGLE_MAPS_EMBED_SRC}
          title={`Mapa de ${SHOP_NAME} en ${LOCALITY}`}
          className="block h-[320px] w-full border-0 border-t border-border md:h-[420px]"
          loading="lazy"
          /*
           * `strict-origin-when-cross-origin`: Google recibe el origen del
           * sitio, que necesita para servir el mapa, pero no la ruta concreta
           * que la persona estaba leyendo.
           */
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <div
          aria-hidden="true"
          className="h-[120px] w-full border-t border-border bg-sand md:h-[160px]"
          style={{
            /*
             * La retícula insinúa un mapa sin dibujar uno falso. Dos gradientes
             * de 1px sobre la arena del sistema: mismo peso que los filetes que
             * separan el resto de superficies, así que la fachada pertenece a
             * la página en vez de parecer una imagen rota.
             */
            backgroundImage:
              'linear-gradient(rgb(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--border) / 0.6) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      )}
    </div>
  );
}

/** Dibujado, en el mismo trazo que el resto de iconos del sitio. */
function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.5 3.5H3.5v9h9v-3" />
      <path d="M9.5 3.5h3v3" />
      <path d="M12.5 3.5 7.5 8.5" />
    </svg>
  );
}
