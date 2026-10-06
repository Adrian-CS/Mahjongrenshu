import { Tile, tileName, tileToString } from "@/lib/mahjong";

export function tileLabel(tile: Tile): string {
  return tileName(tile);
}

const SIZES = {
  sm: "w-6",
  md: "w-10 sm:w-12",
  // Shares the row width with its siblings; used for the 14-tile hand.
  fluid: "min-w-0 flex-1 max-w-14",
} as const;

export type TileState = "idle" | "chosen" | "best" | "chosen-best" | "dimmed";

const STATE_CLASSES: Record<TileState, string> = {
  idle: "",
  chosen: "ring-4 ring-red-500 -translate-y-2",
  best: "ring-4 ring-emerald-500",
  "chosen-best": "ring-4 ring-emerald-500 -translate-y-2",
  dimmed: "opacity-60",
};

interface TileDisplayProps {
  tile: Tile;
  size?: keyof typeof SIZES;
  state?: TileState;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * Renders a single tile: the blank tile front with the face drawn on top.
 * Art: FluffyStuff/riichi-mahjong-tiles (CC0), see public/tiles/LICENSE.md.
 */
export function TileDisplay({ tile, size = "md", state = "idle", onClick, disabled }: TileDisplayProps) {
  const code = tileToString(tile);
  const body = (
    <span className="relative block aspect-[3/4] w-full">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVGs, no optimisation needed */}
      <img src="/tiles/front.svg" alt="" className="absolute inset-0 h-full w-full" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/tiles/${code}.svg`}
        alt={tileLabel(tile)}
        className="absolute inset-[8%] h-[84%] w-[84%]"
        draggable={false}
      />
      {/* The CC0 set draws Haku as a blank face; frame it so it doesn't read as an empty tile. */}
      {code === "5z" && <span className="absolute inset-x-[24%] inset-y-[22%] rounded-[8%] border-2 border-sky-700/70" />}
    </span>
  );

  const className = `${SIZES[size]} shrink-0 rounded-[12%] transition ${STATE_CLASSES[state]}`;
  if (!onClick) {
    return (
      <span className={`inline-block ${className}`} title={tileLabel(tile)}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tileLabel(tile)}
      className={`${className} cursor-pointer enabled:hover:-translate-y-2 disabled:cursor-default`}
    >
      {body}
    </button>
  );
}
