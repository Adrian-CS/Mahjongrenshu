import { HandEvaluation, Tile } from "@/lib/mahjong";
import { shantenLabel } from "./labels";
import { TileDisplay } from "./TileDisplay";

function TileList({ tiles }: { tiles: Tile[] }) {
  return (
      <span className="inline-flex flex-wrap gap-0.5 align-middle">
        {tiles.map((t) => (
          <TileDisplay key={t} tile={t} size="sm" />
        ))}
      </span>
  );
}

/** Every possible discard with its result, ukeire and accepted tiles, best first. */
export function UkeireTable({ evaluation, chosen }: { evaluation: HandEvaluation; chosen: Tile | null }) {
  return (
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
          const isChosen = o.discard === chosen;
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
                {o.improvement && (
                  <span className="block text-xs font-normal text-zinc-500" title="Tiles que mejoran la forma sin avanzar la mano">
                    +{o.improvement.total} de mejora
                  </span>
                )}
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
  );
}
