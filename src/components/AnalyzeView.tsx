"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Tile,
  TILE_KINDS,
  calculateShanten,
  calculateUkeire,
  evaluateHand,
  explain,
  findOption,
  formatHand,
  isSameValue,
  parseHand,
  representativeDiscard,
  sortTiles,
  tileName,
  toCounts,
} from "@/lib/mahjong";
import { ExplanationPanel } from "./ExplanationPanel";
import { HandRow } from "./HandRow";
import { shantenLabel } from "./labels";
import { TileDisplay } from "./TileDisplay";
import { UkeireTable } from "./UkeireTable";

const STORAGE_KEY = "nanikiru:analyze";
const SUIT_ROWS: Tile[][] = [
  Array.from({ length: 9 }, (_, i) => i),
  Array.from({ length: 9 }, (_, i) => 9 + i),
  Array.from({ length: 9 }, (_, i) => 18 + i),
  Array.from({ length: 7 }, (_, i) => 27 + i),
];

function loadTiles(): Tile[] {
  try {
    const tiles = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Tile[];
    const valid = Array.isArray(tiles) && tiles.length <= 14 && tiles.every((t) => Number.isInteger(t) && t >= 0 && t < TILE_KINDS);
    return valid && Math.max(0, ...toCounts(tiles)) <= 4 ? tiles : [];
  } catch {
    return [];
  }
}

/**
 * "Analiza mi mano": build a hand from a real game (tap tiles or paste
 * notation) and see the best discard, the full table and the explanation of
 * any discard. Nothing here is saved to stats.
 */
export function AnalyzeView() {
  // Tiles in the order they were added; the last one plays the role of the draw.
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [editing, setEditing] = useState(true);
  const [notation, setNotation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Tile | null>(null);

  useEffect(() => {
    const saved = loadTiles();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTiles(saved);
    setEditing(saved.length < 14);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tiles));
    } catch {
      // Storage unavailable: the hand is just not remembered.
    }
  }, [tiles]);

  const counts = toCounts(tiles);
  const full = tiles.length === 14;

  const update = (next: Tile[]) => {
    setTiles(next);
    setSelected(null);
    setError(null);
    if (next.length === 14) setEditing(false);
  };
  const add = (t: Tile) => {
    if (tiles.length < 14 && counts[t] < 4) update([...tiles, t]);
  };
  const removeAt = (sortedIndex: number) => {
    const tile = sortTiles(tiles)[sortedIndex];
    const i = tiles.lastIndexOf(tile);
    update(tiles.filter((_, k) => k !== i));
  };
  const load = () => {
    let parsed: Tile[];
    try {
      parsed = parseHand(notation);
    } catch {
      return setError("No entiendo esa notación. Ejemplo: 123m456p789s1122z3z");
    }
    if (parsed.length < 1 || parsed.length > 14) return setError(`La mano tiene ${parsed.length} tiles: usa 13 o 14.`);
    if (Math.max(...toCounts(parsed)) > 4) return setError("Hay más de 4 copias de algún tile.");
    update(parsed);
    setEditing(parsed.length < 14);
  };

  const analysis = useMemo(() => {
    if (!full) return null;
    const problem = { hand: sortTiles(tiles.slice(0, 13)), draw: tiles[13] };
    const evaluation = evaluateHand(tiles);
    return { problem, evaluation, best: representativeDiscard(problem, evaluation) };
  }, [tiles, full]);

  const discard = selected ?? analysis?.best ?? null;
  const explanation = analysis && discard !== null ? explain(analysis.problem, analysis.evaluation, discard) : null;
  const handTiles = analysis ? [...analysis.problem.hand, analysis.problem.draw] : [];
  const chosenIndex = discard !== null && analysis ? handTiles.lastIndexOf(discard) : null;

  return (
    <section className="w-full space-y-4">
      {editing || !analysis ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={notation}
              onChange={(e) => setNotation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Pega la mano: 123m456p789s1122z3z"
              aria-label="Mano en notación"
              className="min-w-0 flex-1 rounded border border-zinc-300 bg-transparent px-2 py-1 font-mono text-sm dark:border-zinc-700"
            />
            <button type="button" onClick={load} className="rounded bg-zinc-900 px-3 py-1 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              Cargar
            </button>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div>
            <p className="mb-1 text-sm text-zinc-500">
              Tu mano ({tiles.length}/14){tiles.length > 0 && " · toca un tile para quitarlo"}
            </p>
            <div className="flex min-h-12 flex-wrap gap-0.5">
              {sortTiles(tiles).map((t, i) => (
                <TileDisplay key={i} tile={t} size="md" onClick={() => removeAt(i)} />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-zinc-500">Toca para añadir (el último que añadas hace de tsumo):</p>
            {SUIT_ROWS.map((row, r) => (
              <div key={r} className="flex flex-wrap gap-0.5">
                {row.map((t) => (
                  <TileDisplay key={t} tile={t} size="md" onClick={() => add(t)} disabled={full || counts[t] >= 4} />
                ))}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <button type="button" onClick={() => update([])} className="rounded border border-zinc-300 px-3 py-1 dark:border-zinc-700">
              Borrar todo
            </button>
            {full && (
              <button type="button" onClick={() => setEditing(false)} className="rounded bg-emerald-700 px-3 py-1 font-semibold text-white">
                Analizar
              </button>
            )}
          </div>

          {tiles.length === 13 && <ThirteenTileSummary tiles={tiles} />}
        </div>
      ) : (
        <>
          <div className="w-full rounded-xl bg-emerald-800 px-2 py-4 shadow-inner sm:px-4 short:py-2">
            <p className="mb-1 text-center text-sm text-emerald-100">
              {formatHand(tiles)} · {shantenLabel(analysis.evaluation.shanten)} tras el mejor descarte · toca un tile para ver qué pasa si lo cortas
            </p>
            <HandRow
              hand={analysis.problem.hand}
              draw={analysis.problem.draw}
              chosenIndex={chosenIndex}
              bestDiscards={analysis.evaluation.bestDiscards}
              onDiscard={(i) => setSelected(handTiles[i])}
              allowReselect
            />
          </div>

          {explanation && discard !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-100 p-4 dark:bg-zinc-900">
              <div>
                <p className="text-lg font-semibold">
                  {isSameValue(findOption(analysis.evaluation, discard), analysis.evaluation.options[0])
                    ? `Mejor descarte: ${analysis.evaluation.bestDiscards.map(tileName).join(" o ")}`
                    : `Cortando ${tileName(discard)}: no es lo mejor`}
                </p>
                <p className="text-sm">
                  {tileName(discard)} → {shantenLabel(explanation.chosen.shanten)}, ukeire {explanation.chosen.ukeire.total}
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <button type="button" onClick={() => setEditing(true)} className="rounded border border-zinc-300 px-3 py-1 dark:border-zinc-700">
                  Editar mano
                </button>
                <button
                  type="button"
                  onClick={() => {
                    update([]);
                    setEditing(true);
                  }}
                  className="rounded bg-zinc-900 px-3 py-1 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Otra mano
                </button>
              </div>
            </div>
          )}

          {explanation && <ExplanationPanel explanation={explanation} lesson={null} lessonStep={0} />}
          <UkeireTable evaluation={analysis.evaluation} chosen={discard} />
        </>
      )}
    </section>
  );
}

/** With 13 tiles there is nothing to cut yet: show how far the hand is and what improves it. */
function ThirteenTileSummary({ tiles }: { tiles: Tile[] }) {
  const counts = toCounts(tiles);
  const shanten = calculateShanten(counts);
  const ukeire = calculateUkeire(counts);
  return (
    <div className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
      <p>
        Con 13 tiles: <strong>{shantenLabel(shanten)}</strong>, {ukeire.total} tiles la mejoran ({ukeire.tiles.length} tipos). Añade el tile que
        robas para ver qué cortar.
      </p>
      <div className="mt-1 flex flex-wrap gap-0.5">
        {ukeire.tiles.map((u) => (
          <TileDisplay key={u.tile} tile={u.tile} size="sm" />
        ))}
      </div>
    </div>
  );
}
