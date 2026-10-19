import { Tile } from "@/lib/mahjong";
import { TileDisplay, TileState } from "./TileDisplay";

interface HandRowProps {
  hand: Tile[];
  draw: Tile;
  /** Index into [...hand, draw] of the tile the player discarded, if any. */
  chosenIndex: number | null;
  bestDiscards: Tile[];
  onDiscard: (index: number) => void;
  /** Keep tiles clickable after a discard is chosen (hand analysis). */
  allowReselect?: boolean;
  /** Show the answer without a chosen tile (ran out of time). */
  revealed?: boolean;
  /** A new hand is on its way: nothing is clickable meanwhile. */
  busy?: boolean;
}

/** The player's 13 sorted tiles plus the drawn tile, set slightly apart. */
export function HandRow({ hand, draw, chosenIndex, bestDiscards, onDiscard, allowReselect = false, revealed = false, busy = false }: HandRowProps) {
  const answered = chosenIndex !== null || revealed;
  const stateFor = (tile: Tile, index: number): TileState => {
    if (!answered) return "idle";
    const isBest = bestDiscards.includes(tile);
    if (index === chosenIndex) return isBest ? "chosen-best" : "chosen";
    return isBest ? "best" : "dimmed";
  };

  const render = (tile: Tile, index: number) => (
    <TileDisplay
      key={index}
      tile={tile}
      size="fluid"
      state={stateFor(tile, index)}
      onClick={() => onDiscard(index)}
      disabled={busy || (answered && !allowReselect)}
    />
  );

  return (
    <div className={`flex w-full items-end justify-center gap-px pt-3 transition-opacity sm:gap-0.5 ${busy ? "opacity-50" : ""}`}>
      {hand.map(render)}
      <span className="w-2 shrink-0 sm:w-4" />
      {render(draw, hand.length)}
    </div>
  );
}
