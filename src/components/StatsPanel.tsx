import type { Stats } from "@/lib/api";
import { weakness } from "@/lib/mahjong";
import { SHAPE_LABELS } from "./shapeLabels";

interface StatsPanelProps {
  stats: Stats;
  synced: boolean;
}

/** Per-category accuracy over recent attempts, weakest first. */
export function StatsPanel({ stats, synced }: StatsPanelProps) {
  const rows = [...stats.categories].sort((a, b) => weakness(b) - weakness(a));
  const pct = (correct: number, total: number) => (total ? `${Math.round((100 * correct) / total)}%` : "–");

  return (
    <details className="w-full rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <summary className="cursor-pointer font-semibold">
        Estadísticas · {stats.overall.correct}/{stats.overall.total} ({pct(stats.overall.correct, stats.overall.total)})
        {!synced && <span className="ml-2 font-normal text-zinc-500">(sin conexión con el servidor: solo esta sesión)</span>}
      </summary>
      {rows.length === 0 ? (
        <p className="mt-2 text-zinc-500">Aún no hay intentos.</p>
      ) : (
        <table className="mt-2 w-full text-left">
          <thead className="text-zinc-500">
            <tr>
              <th className="py-1 pr-3 font-medium">Tipo de problema (descarte óptimo)</th>
              <th className="py-1 pr-3 font-medium">Aciertos</th>
              <th className="py-1 font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.category} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="py-1 pr-3">{SHAPE_LABELS[r.category]}</td>
                <td className="py-1 pr-3 tabular-nums">
                  {r.correct}/{r.total}
                </td>
                <td className="py-1 tabular-nums">{pct(r.correct, r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-2 text-xs text-zinc-500">
        El modo repaso genera más problemas de los tipos con más fallos (últimos 300 intentos).
      </p>
    </details>
  );
}
