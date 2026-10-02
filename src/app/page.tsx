"use client";

import { HandRow } from "@/components/HandRow";
import { ResultPanel, shantenLabel } from "@/components/ResultPanel";
import { DIFFICULTIES, useGameController } from "@/hooks/useGameController";

export default function Home() {
  const game = useGameController();
  const { problem, evaluation, chosen, correct, score } = game;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-6 px-4 py-8">
      <header className="flex w-full flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">何切る · Nanikiru Trainer</h1>
          <p className="text-sm text-zinc-500">¿Qué tile descartas? Eficiencia pura (máximo ukeire).</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
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
          <div className="w-full rounded-xl bg-emerald-800 px-2 py-4 shadow-inner sm:px-4">
            <p className="mb-1 text-center text-sm text-emerald-100">
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
            <>
              <button
                type="button"
                onClick={game.nextProblem}
                autoFocus
                className="rounded-lg bg-zinc-900 px-5 py-2 font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Siguiente problema →
              </button>
              <ResultPanel evaluation={evaluation} chosen={chosen} correct={correct} />
            </>
          ) : (
            <p className="text-zinc-500">Pulsa el tile que quieres descartar.</p>
          )}
        </>
      ) : (
        <p className="text-zinc-500">Generando mano…</p>
      )}

      <footer className="mt-auto pt-8 text-xs text-zinc-500">
        Tiles: FluffyStuff/riichi-mahjong-tiles (CC0). Ukeire contado sobre las copias no visibles en tu mano.
      </footer>
    </main>
  );
}
