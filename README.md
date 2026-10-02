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
```

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

## Pendiente (Fase 2)

Supabase (auth mínima + tabla `problems_solved`) y repaso por categoría de error.
