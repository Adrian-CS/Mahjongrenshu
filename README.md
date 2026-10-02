# 何切る · Nanikiru Trainer

Entrenador de eficiencia de tiles para riichi mahjong. Genera manos cerradas
aleatorias de 14 tiles (13 + tsumo), el usuario elige qué descartar y la app lo
valida contra el descarte óptimo calculado algorítmicamente (mínimo shanten y,
a igualdad, máximo ukeire). Todo corre en el cliente; no hay backend.

## Uso

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # tests del motor (vitest)
npm run lint
npm run build   # export estático en out/
npm run typecheck
npm run db:migrate:local && npm run preview   # app + API + D1 local en http://localhost:8788
```

`npm run dev` no tiene API: los intentos se quedan en la cola local hasta que
haya servidor.

## Estructura

| Pieza del spec   | Fichero |
| ---------------- | ------- |
| TileGenerator    | `src/lib/mahjong/generator.ts` — muro de 136 tiles, Fisher-Yates, filtro por rango de shanten |
| HandEvaluator    | `src/lib/mahjong/evaluator.ts` — shanten + ukeire por cada descarte posible |
| Motor de shanten | `src/lib/mahjong/shanten.ts` — forma estándar, chiitoitsu y kokushi |
| TileDisplay      | `src/components/TileDisplay.tsx` |
| HandRow          | `src/components/HandRow.tsx` |
| ResultPanel      | `src/components/ResultPanel.tsx` |
| GameController   | `src/hooks/useGameController.ts` |
| Categorías / repaso | `src/lib/mahjong/shapes.ts`, `src/lib/mahjong/review.ts` |
| API              | `functions/api/attempts.ts` (POST), `functions/api/stats.ts` (GET) |
| Esquema D1       | `migrations/0001_attempts.sql` |

## Decisiones

- **Librería de cálculo: motor propio en vez de `mahjong-utils`.** El paquete
  `mahjong-utils@0.7.7` de npm se publica sin `dist/` (no importable); el bundle
  Kotlin/JS subyacente (`mahjong-utils-entry`) pesa ~1,8 MB y expone solo una
  API RPC por strings. El motor propio (~150 líneas) se valida en los tests
  contra [`syanten`](https://www.npmjs.com/package/syanten) (MIT, solo
  devDependency) en miles de manos aleatorias y de un solo palo.
- **14 tiles, no 13.** Un nanikiru necesita 13 + el tile robado para que haya
  algo que descartar; la mano se muestra ordenada con el tsumo aparte.
- **Ukeire** = copias no visibles (4 − copias en tus 14 tiles) de cada tile que
  reduce el shanten tras el descarte. Si varios descartes empatan, todos cuentan
  como acierto.
- **Tiles SVG:** [FluffyStuff/riichi-mahjong-tiles](https://github.com/FluffyStuff/riichi-mahjong-tiles),
  dominio público (CC0), optimizados con svgo en `public/tiles/`.

## PWA

Instalable desde el navegador (Android: "Instalar app"; iOS: Compartir →
"Añadir a pantalla de inicio"). El manifest (`src/app/manifest.ts`) pide
pantalla completa y orientación horizontal; Android lo respeta, iOS ignora la
orientación del manifest, así que ahí se muestra el aviso de girar el móvil.
`public/sw.js` cachea la app y los tiles para jugar sin conexión: al cambiar
la lista de assets precacheados, sube `VERSION`.

## Deploy (Cloudflare Pages)

Build command `npm run build`, output directory `out` (o
`npx wrangler pages deploy` con `wrangler.toml`). `public/_headers` evita que
`sw.js` y el manifest queden cacheados entre deploys.

## Fase 2: progreso y repaso (D1 + Cloudflare Access)

- **Datos:** cada respuesta se guarda en la tabla `attempts` de D1 a través de
  Pages Functions. El cliente las encola en `localStorage` y las envía por
  lotes, así que también se guardan las jugadas hechas sin conexión.
- **Categoría de problema:** la forma de la que sale el descarte óptimo (honor
  aislado, terminal aislado, kanchan, penchan…), según `classifyTile`. Si varios
  descartes empatan, gana la forma más básica.
- **Modo repaso:** elige una categoría con fallos, con más peso cuanto mayor es
  el % de error en los últimos 300 intentos, y genera una mano nueva de esa
  categoría. Si una categoría rara no sale en 1500 intentos, cae a un problema
  normal.
- **Login:** ninguno en la app. Toda la web va detrás de Cloudflare Access y la
  API usa el email que Access reenvía (`Cf-Access-Authenticated-User-Email`).
  **Sin Access la API queda abierta** y todo se guarda como usuario `local`.

### Puesta en marcha en Cloudflare

1. `npx wrangler d1 create nanikiru` y copia el `database_id` en `wrangler.toml`.
2. `npm run db:migrate:remote`.
3. Pages → proyecto conectado al repo: build `npm run build`, salida `out`. El
   binding `DB` se lee de `wrangler.toml`.
4. Zero Trust → Access → Applications → *Self-hosted*: dominio de la app (y
   `*.<proyecto>.pages.dev` para las previews), política *Allow* con tu email.
