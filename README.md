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
| Lectura de la mano | `src/lib/mahjong/decomposition.ts` |
| Explicaciones    | `src/lib/mahjong/explain.ts`, `src/components/ExplanationPanel.tsx` |
| Lecciones        | `src/lib/lessons.ts` (validadas en `src/lib/__tests__/lessons.test.ts`) |
| Categorías / repaso | `src/lib/mahjong/shapes.ts`, `src/lib/mahjong/review.ts` |
| API              | `functions/api/`: `attempts` (POST), `stats` (GET), `mistakes` (GET) y `mistakes/mastered` (POST), `lessons` (GET/PUT) |
| Esquema D1       | `migrations/` (intentos, fallos dominados, progreso de lecciones) |

## Decisiones

- **Librería de cálculo: motor propio en vez de `mahjong-utils`.** El paquete
  `mahjong-utils@0.7.7` de npm se publica sin `dist/` (no importable); el bundle
  Kotlin/JS subyacente (`mahjong-utils-entry`) pesa ~1,8 MB y expone solo una
  API RPC por strings. El motor propio (~150 líneas) se valida en los tests
  contra [`syanten`](https://www.npmjs.com/package/syanten) (MIT, solo
  devDependency) en miles de manos aleatorias y de un solo palo.
- **Desempate por calidad.** Si varios descartes dejan el mismo shanten y la
  misma aceptación, gana el que deja más *tiles de mejora*: los que, sin
  avanzar la mano, la cambian a una forma que acepta más (un kanchan 3-5 que
  roba un 6 pasa a ryanmen 5-6; un penchan no puede). Solo se calcula para los
  empatados arriba, porque es caro.
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

## Explicaciones y lecciones

- **Explicación automática** tras cada respuesta, en todos los modos: cómo se
  lee la mano tras el descarte óptimo (secuencias, parejas, esperas, sueltos),
  qué tiles pierdes con tu descarte, el recuento de bloques cuando sobra uno y
  el principio de eficiencia que aplica. Todo sale del motor.
- **Respuesta clara:** los problemas generados (normal y repaso) solo se
  aceptan si el descarte óptimo es único o si los empatados salen del mismo
  bloque (1s/2s de un penchan). Ver `hasClearAnswer` en `review.ts`.
- **Retomar donde lo dejaste:** modo, dificultad, lección, marcador y problema
  sin responder se guardan en el dispositivo (`localStorage`).
- **Modo Lecciones (15):** cada lección empieza con un ejemplo escogido a
  mano y explicado por escrito (`src/lib/lessons.ts`, verificado en
  `lessons.test.ts`), seguido de 5 problemas de práctica nuevos del mismo
  concepto (`src/lib/lessonPractice.ts`). Cada práctica se monta con los
  bloques del concepto en palos y números al azar, sin que se toquen entre sí,
  y solo se usa si el motor confirma que el descarte óptimo es el que enseña la
  lección. Las lecciones no cuentan para marcador, estadísticas ni repaso; el
  progreso (✓ y aciertos de la última vez) se guarda en el dispositivo. Para
  añadir una lección: su ejemplo en `LESSONS` (con cifras en el test) y su
  constructor en `PRACTICE`.

## Más modos

- **Contrarreloj:** 5, 10 o 20 segundos por mano; si se acaba el tiempo cuenta
  como fallo y se muestra la respuesta explicada.
- **Repetir mis fallos:** las manos exactas que has fallado (de cualquier modo)
  vuelven hasta que las aciertas; entonces se marcan `mastered` en D1. Necesita
  conexión.
- **Analizar mi mano:** monta una mano de una partida real (paleta de tiles o
  notación pegada) y ve el mejor descarte, la tabla y la explicación de
  cualquier corte.

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
2. `npm run db:migrate:remote` (repítelo cada vez que haya una migración nueva
   en `migrations/`; la app avisa en Estadísticas si falta alguna).
3. Pages → proyecto conectado al repo: build `npm run build`, salida `out`. El
   binding `DB` se lee de `wrangler.toml`.
4. Zero Trust → Access → Applications → *Self-hosted*: dominio de la app (y
   `*.<proyecto>.pages.dev` para las previews), política *Allow* con tu email.
