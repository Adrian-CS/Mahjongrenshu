import { BlockKind, Explanation, tileName } from "@/lib/mahjong";
import type { Lesson } from "@/lib/lessons";
import { TileDisplay } from "./TileDisplay";

const BLOCK_LABELS: Record<BlockKind, string> = {
  shuntsu: "Secuencia",
  koutsu: "Trío",
  toitsu: "Pareja",
  ryanmen: "Ryanmen",
  penchan: "Penchan",
  kanchan: "Kanchan",
  floating: "Suelto",
};

interface ExplanationPanelProps {
  explanation: Explanation;
  lesson: Lesson | null;
}

/** "Why?" section: lesson text (if any), how the hand reads and the engine-derived reasoning. */
export function ExplanationPanel({ explanation, lesson }: ExplanationPanelProps) {
  const { reading, optimal, form } = explanation;
  return (
    <section className="w-full space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">¿Por qué?</h2>

      {lesson && (
        <div className="space-y-2 rounded-md bg-amber-50 p-3 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-semibold">Lección: {lesson.title}</p>
          {lesson.explanation.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      <div>
        <p className="mb-2 text-sm text-zinc-500">
          {form === "chiitoitsu" ? "Parejas" : "Así se lee la mano"} tras cortar {tileName(optimal.discard)}:
        </p>
        <div className="flex flex-wrap gap-3">
          {reading.map((block, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="flex gap-px">
                {block.tiles.map((t, j) => (
                  <TileDisplay key={j} tile={t} size="sm" />
                ))}
              </span>
              <span className={`text-xs ${block.kind === "floating" ? "text-zinc-400" : "text-zinc-600 dark:text-zinc-300"}`}>
                {BLOCK_LABELS[block.kind]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ul className="list-disc space-y-1 pl-5">
        {explanation.points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </section>
  );
}
