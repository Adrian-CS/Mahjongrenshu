"use client";

import { AnalyzeView } from "@/components/AnalyzeView";
import { HandRow } from "@/components/HandRow";
import { ResultPanel, shantenLabel } from "@/components/ResultPanel";
import { StatsPanel } from "@/components/StatsPanel";
import { SHAPE_LABELS } from "@/components/shapeLabels";
import { DIFFICULTIES, LESSON_STEPS, Mode, TIME_LIMITS, useGameController } from "@/hooks/useGameController";
import { TimerBar } from "@/components/TimerBar";
import { LESSONS } from "@/lib/lessons";

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
            <option value="review">Repaso por tipo de fallo</option>
            <option value="mistakes">Repetir mis fallos</option>
            <option value="lessons">Lecciones</option>
            <option value="timed">Contrarreloj</option>
            <option value="analyze">Analizar mi mano</option>
          </select>
          {game.mode === "lessons" ? (
            <select
              aria-label="Lección"
              value={game.lessonIndex}
              onChange={(e) => game.selectLesson(Number(e.target.value))}
              className="max-w-56 rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
            >
              {LESSONS.map((l, i) => (
                <option key={l.id} value={i}>
                  {game.lessonProgress[l.id]?.completed ? "✓ " : ""}
                  {i + 1}. {l.title}
                  {game.lessonProgress[l.id]?.completed
                    ? ` (${game.lessonProgress[l.id].correct}/${game.lessonProgress[l.id].answered})`
                    : ""}
                </option>
              ))}
            </select>
          ) : game.mode === "analyze" || game.mode === "mistakes" ? null : (
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
          )}
          {game.mode === "timed" && (
            <select
              aria-label="Tiempo por mano"
              value={game.timeLimit}
              onChange={(e) => game.changeTimeLimit(Number(e.target.value))}
              className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
            >
              {TIME_LIMITS.map((s) => (
                <option key={s} value={s}>
                  {s} s por mano
                </option>
              ))}
            </select>
          )}
          <span className="tabular-nums" title="Aciertos / intentos · racha">
            {score.correct}/{score.total} · racha {score.streak}
          </span>
        </div>
      </header>

      {game.mode === "analyze" ? (
        <AnalyzeView />
      ) : game.mode === "mistakes" && !problem && !game.generating ? (
        <div className="w-full rounded-xl border border-zinc-200 p-6 text-center dark:border-zinc-800">
          {game.mistakesError ? (
            <p>
              No se pudieron cargar tus fallos: {game.mistakesError}. Este modo necesita conexión con el servidor.
            </p>
          ) : (
            <p>
              No tienes fallos pendientes. Cada mano que falles en los otros modos aparecerá aquí hasta que la aciertes.
            </p>
          )}
        </div>
      ) : problem && evaluation ? (
        <>
          <div className="w-full rounded-xl bg-emerald-800 px-2 py-4 shadow-inner sm:px-4 short:py-2">
            <p className="mb-1 text-center text-sm text-emerald-100">
              {game.lesson && (
                <span className="mr-2 rounded bg-amber-300 px-1.5 py-0.5 font-semibold text-amber-950">
                  Lección {game.lessonIndex + 1}/{LESSONS.length}: {game.lesson.title} · problema {game.lessonStep + 1}/
                  {LESSON_STEPS}
                </span>
              )}
              {game.currentMistake && (
                <span className="mr-2 rounded bg-amber-300 px-1.5 py-0.5 font-semibold text-amber-950">
                  Fallo repetido · fallada {game.currentMistake.misses} {game.currentMistake.misses === 1 ? "vez" : "veces"} · quedan{" "}
                  {game.mistakes?.length ?? 0}
                </span>
              )}
              {game.reviewCategory && (
                <span className="mr-2 rounded bg-amber-300 px-1.5 py-0.5 font-semibold text-amber-950">
                  Repaso: {SHAPE_LABELS[game.reviewCategory]}
                </span>
              )}
              {game.mode === "review" && !game.reviewCategory && <span className="mr-2">Sin fallos que repasar ·</span>}
              Mano: {shantenLabel(evaluation.shanten)} tras el mejor descarte · último tile a la derecha (tsumo)
            </p>
            {game.deadline !== null && !game.timedOut && game.chosenIndex === null && (
              <div className="mb-2">
                <TimerBar deadline={game.deadline} seconds={game.timeLimit} />
              </div>
            )}
            <HandRow
              hand={problem.hand}
              draw={problem.draw}
              chosenIndex={game.chosenIndex}
              revealed={game.timedOut}
              bestDiscards={evaluation.bestDiscards}
              onDiscard={game.discard}
            />
          </div>

          {(chosen && correct !== null) || game.timedOut ? (
            <ResultPanel
              evaluation={evaluation}
              chosen={chosen}
              correct={correct ?? false}
              category={game.category}
              explanation={game.explanation}
              lesson={game.lesson}
              lessonStep={game.lessonStep}
              nextLabel={
                !game.lesson
                  ? "Siguiente problema →"
                  : game.lessonStep + 1 < LESSON_STEPS
                    ? "Siguiente problema de la lección →"
                    : "Siguiente lección →"
              }
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

      <StatsPanel stats={game.stats} synced={game.statsSynced} error={game.statsError} />

      <footer className="mt-auto pt-8 text-xs text-zinc-500 short:pt-2">
        Tiles: FluffyStuff/riichi-mahjong-tiles (CC0). Ukeire contado sobre las copias no visibles en tu mano.
      </footer>
    </main>
  );
}
