import { DiscardOption, Explanation, HandEvaluation, Shape, Tile } from "@/lib/mahjong";
import type { Lesson } from "@/lib/lessons";
import { ExplanationPanel } from "./ExplanationPanel";
import { shantenLabel } from "./labels";
import { UkeireTable } from "./UkeireTable";
import { SHAPE_LABELS } from "./shapeLabels";
import { TileDisplay } from "./TileDisplay";

interface ResultPanelProps {
  evaluation: HandEvaluation;
  chosen: DiscardOption;
  correct: boolean;
  category: Shape | null;
  explanation: Explanation | null;
  lesson: Lesson | null;
  lessonStep: number;
  /** Label for the next button, e.g. "Siguiente lección →". */
  nextLabel: string;
  generating: boolean;
  onNext: () => void;
}

export { shantenLabel };

function TileList({ tiles }: { tiles: Tile[] }) {
  return (
    <span className="inline-flex flex-wrap gap-0.5 align-middle">
      {tiles.map((t) => (
        <TileDisplay key={t} tile={t} size="sm" />
      ))}
    </span>
  );
}

export function ResultPanel({ evaluation, chosen, correct, category, explanation, lesson, lessonStep, nextLabel, generating, onNext }: ResultPanelProps) {
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
          {generating ? "Generando…" : nextLabel}
        </button>
      </div>

      {explanation && <ExplanationPanel explanation={explanation} lesson={lesson} lessonStep={lessonStep} />}

      <UkeireTable evaluation={evaluation} chosen={chosen.discard} />
    </section>
  );
}
