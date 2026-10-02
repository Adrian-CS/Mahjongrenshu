"use client";

import { HandRow } from "@/components/HandRow";
import { ResultPanel, shantenLabel } from "@/components/ResultPanel";
import { StatsPanel } from "@/components/StatsPanel";
import { SHAPE_LABELS } from "@/components/shapeLabels";
import { DIFFICULTIES, Mode, useGameController } from "@/hooks/useGameController";

export default function Home() {
  const game = useGameController();
  const { problem, evaluation, chosen, correct, score } = game;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-6 px-4 py-8 short:gap-3 short:py-3">
      <header className="flex w-full flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold short:text-lg">何切る · Nanikiru Trainer</h1>
          <p className="text-sm text-zinc-500 short:hidden">¿Qué tile descartas? Eficiencia pura (máximo ukeire).</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <select
            aria-label="Modo"
            value={game.mode}
            onChange={(e) => game.changeMode(e.target.value as Mode)}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          >
            <option value="normal">Modo normal</option>
            <option value="review">Repaso de fallos</option>
          </select>
          <select
            aria-label="Dificultad"
            value={game.difficulty.id}
            onChange={(e) => game.changeDifficulty(e.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <span className="tabular-nums" title="Aciertos / intentos · racha">
            {score.correct}/{score.total} · racha {score.streak}
          </span>
        </div>
      </header>

      {problem && evaluation ? (
        <>
          <div className="w-full rounded-xl bg-emerald-800 px-2 py-4 shadow-inner sm:px-4 short:py-2">
            <p className="mb-1 text-center text-sm text-emerald-100">
              {game.reviewCategory && (
                <span className="mr-2 rounded bg-amber-300 px-1.5 py-0.5 font-semibold text-amber-950">
                  Repaso: {SHAPE_LABELS[game.reviewCategory]}
                </span>
              )}
              {game.mode === "review" && !game.reviewCategory && <span className="mr-2">Sin fallos que repasar ·</span>}
              Mano: {shantenLabel(evaluation.shanten)} tras el mejor descarte · último tile a la derecha (tsumo)
            </p>
            <HandRow
              hand={problem.hand}
              draw={problem.draw}
              chosenIndex={game.chosenIndex}
              bestDiscards={evaluation.bestDiscards}
              onDiscard={game.discard}
            />
          </div>

          {chosen && correct !== null ? (
            <ResultPanel
              evaluation={evaluation}
              chosen={chosen}
              correct={correct}
              category={game.category}
              generating={game.generating}
              onNext={game.nextProblem}
            />
          ) : (
            <>
              <p className="text-zinc-500">Pulsa el tile que quieres descartar.</p>
              <p className="rounded-lg bg-zinc-100 px-3 py-2 text-center text-sm text-zinc-600 sm:hidden landscape:hidden dark:bg-zinc-900 dark:text-zinc-400">
                📱↻ Gira el móvil para ver los tiles más grandes.
              </p>
            </>
          )}
        </>
      ) : (
        <p className="text-zinc-500">Generando mano…</p>
      )}

      <StatsPanel stats={game.stats} synced={game.statsSynced} />

      <footer className="mt-auto pt-8 text-xs text-zinc-500 short:pt-2">
        Tiles: FluffyStuff/riichi-mahjong-tiles (CC0). Ukeire contado sobre las copias no visibles en tu mano.
      </footer>
    </main>
  );
}
