import { Tile } from "@/lib/mahjong";
import { TileDisplay, TileState } from "./TileDisplay";

interface HandRowProps {
  hand: Tile[];
  draw: Tile;
  /** Index into [...hand, draw] of the tile the player discarded, if any. */
  chosenIndex: number | null;
  bestDiscards: Tile[];
  onDiscard: (index: number) => void;
}

/** The player's 13 sorted tiles plus the drawn tile, set slightly apart. */
export function HandRow({ hand, draw, chosenIndex, bestDiscards, onDiscard }: HandRowProps) {
  const answered = chosenIndex !== null;
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
      disabled={answered}
    />
  );

  return (
    <div className="flex w-full items-end justify-center gap-px pt-3 sm:gap-0.5">
      {hand.map(render)}
      <span className="w-2 shrink-0 sm:w-4" />
      {render(draw, hand.length)}
    </div>
  );
}
