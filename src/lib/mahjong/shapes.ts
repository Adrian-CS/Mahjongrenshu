import { Counts, Tile, isHonor } from "./tiles";

/**
 * Local shape a tile belongs to inside a hand. Used to categorise problems
 * (by the shape the optimal discard is cut from) for error-based review.
 *
 * This is a heuristic based on the tile's immediate neighbours, not a full
 * decomposition: a tile is reported as the most "complete" shape it can be
 * part of (triplet > sequence > pair > two-sided > edge > closed > isolated).
 */
export type Shape =
  | "isolated-honor"
  | "isolated-terminal"
  | "isolated-simple"
  | "kanchan"
  | "penchan"
  | "ryanmen"
  | "pair"
  | "triplet"
  | "sequence";

export const SHAPES: Shape[] = [
  "isolated-honor",
  "isolated-terminal",
  "isolated-simple",
  "kanchan",
  "penchan",
  "ryanmen",
  "pair",
  "triplet",
  "sequence",
];

export function classifyTile(tile: Tile, counts: Counts): Shape {
  const c = counts[tile];
  if (isHonor(tile)) {
    if (c >= 3) return "triplet";
    return c === 2 ? "pair" : "isolated-honor";
  }

  const rank = tile % 9;
  const has = (d: number) => rank + d >= 0 && rank + d <= 8 && counts[tile + d] > 0;

  if (c >= 3) return "triplet";
  if ((has(-2) && has(-1)) || (has(-1) && has(1)) || (has(1) && has(2))) return "sequence";
  if (c === 2) return "pair";
  if (has(-1) || has(1)) {
    const low = has(-1) ? rank - 1 : rank;
    return low === 0 || low === 7 ? "penchan" : "ryanmen";
  }
  if (has(-2) || has(2)) return "kanchan";
  return rank === 0 || rank === 8 ? "isolated-terminal" : "isolated-simple";
}
