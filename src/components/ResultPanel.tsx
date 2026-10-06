import { DiscardOption, Explanation, HandEvaluation, Shape, Tile } from "@/lib/mahjong";
import type { Lesson } from "@/lib/lessons";
import { ExplanationPanel } from "./ExplanationPanel";
import { SHAPE_LABELS } from "./shapeLabels";
import { TileDisplay } from "./TileDisplay";

interface ResultPanelProps {
  evaluation: HandEvaluation;
  chosen: DiscardOption;
  correct: boolean;
  category: Shape | null;
  explanation: Explanation | null;
  lesson: Lesson | null;
  generating: boolean;
  onNext: () => void;
}

export function shantenLabel(shanten: number): string {
  if (shanten === -1) return "agari";
  if (shanten === 0) return "tenpai";
  return `${shanten}-shanten`;
}

function TileList({ tiles }: { tiles: Tile[] }) {
  return (
    <span className="inline-flex flex-wrap gap-0.5 align-middle">
      {tiles.map((t) => (
        <TileDisplay key={t} tile={t} size="sm" />
      ))}
    </span>
  );
}

export function ResultPanel({ evaluation, chosen, correct, category, explanation, lesson, generating, onNext }: ResultPanelProps) {
  const best = evaluation.options[0];
  return (
    <section className="w-full space-y-4">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 short:py-2 ${
          correct ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
        }`}
      >
        <div>
          <p className="text-lg font-semibold short:text-base">{correct ? "¡Correcto!" : "Incorrecto"}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            Tu descarte: <TileList tiles={[chosen.discard]} /> → {shantenLabel(chosen.shanten)}, ukeire{" "}
            <strong>{chosen.ukeire.total}</strong>
          </p>
          {!correct && (
            <p className="mt-1 flex flex-wrap items-center gap-2">
              Óptimo: <TileList tiles={evaluation.bestDiscards} /> → {shantenLabel(best.shanten)}, ukeire{" "}
              <strong>{best.ukeire.total}</strong>
            </p>
          )}
          {category && !lesson && <p className="mt-1 text-sm opacity-80">Tipo de problema: {SHAPE_LABELS[category]}</p>}
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={generating}
          autoFocus
          className="rounded-lg bg-zinc-900 px-5 py-2 font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Generando…" : lesson ? "Siguiente lección →" : "Siguiente problema →"}
        </button>
      </div>

      {explanation && <ExplanationPanel explanation={explanation} lesson={lesson} />}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-500">
            <tr>
              <th className="py-1 pr-3 font-medium">Descarte</th>
              <th className="py-1 pr-3 font-medium">Resultado</th>
              <th className="py-1 pr-3 font-medium">Ukeire</th>
              <th className="py-1 font-medium">Tiles que mejoran</th>
            </tr>
          </thead>
          <tbody>
            {evaluation.options.map((o) => {
              const isBest = evaluation.bestDiscards.includes(o.discard);
              const isChosen = o.discard === chosen.discard;
              return (
                <tr
                  key={o.discard}
                  className={`border-t border-zinc-200 dark:border-zinc-800 ${isBest ? "bg-emerald-50 dark:bg-emerald-950/40" : ""} ${
                    isChosen && !isBest ? "bg-red-50 dark:bg-red-950/40" : ""
                  }`}
                >
                  <td className="py-1 pr-3">
                    <TileList tiles={[o.discard]} />
                  </td>
                  <td className="py-1 pr-3 whitespace-nowrap">{shantenLabel(o.shanten)}</td>
                  <td className="py-1 pr-3 font-semibold tabular-nums">
                    {o.ukeire.total} <span className="font-normal text-zinc-500">({o.ukeire.tiles.length} tipos)</span>
                  </td>
                  <td className="py-1">
                    <TileList tiles={o.ukeire.tiles.map((u) => u.tile)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
