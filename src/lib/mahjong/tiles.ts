/**
 * Tile model.
 *
 * Tiles are represented as indices 0..33:
 *   0-8   manzu 1m..9m
 *   9-17  pinzu 1p..9p
 *   18-26 souzu 1s..9s
 *   27-33 honors: East, South, West, North, Haku, Hatsu, Chun (1z..7z)
 *
 * Hands are passed around either as a list of indices or as a 34-length
 * count array ("counts"), which is what the shanten engine works on.
 */

export type Tile = number;
export type Counts = number[];

export const TILE_KINDS = 34;
export const COPIES_PER_TILE = 4;

const SUIT_CHARS = ["m", "p", "s", "z"] as const;

export function tileToString(tile: Tile): string {
  const suit = Math.floor(tile / 9);
  const rank = (tile % 9) + 1;
  return `${rank}${SUIT_CHARS[suit]}`;
}

export function isHonor(tile: Tile): boolean {
  return tile >= 27;
}

export function isTerminalOrHonor(tile: Tile): boolean {
  return isHonor(tile) || tile % 9 === 0 || tile % 9 === 8;
}

/** Parses compact notation such as "123m456p789s11z" into tile indices. */
export function parseHand(notation: string): Tile[] {
  const tiles: Tile[] = [];
  let pending: number[] = [];
  for (const ch of notation.replace(/\s+/g, "")) {
    if (ch >= "0" && ch <= "9") {
      // "0" is commonly used for red fives; treat it as a regular 5.
      pending.push(ch === "0" ? 5 : Number(ch));
      continue;
    }
    const suit = SUIT_CHARS.indexOf(ch as (typeof SUIT_CHARS)[number]);
    if (suit === -1) throw new Error(`Invalid suit character "${ch}" in "${notation}"`);
    for (const rank of pending) {
      if (suit === 3 && rank > 7) throw new Error(`Invalid honor ${rank}z in "${notation}"`);
      tiles.push(suit * 9 + rank - 1);
    }
    pending = [];
  }
  if (pending.length > 0) throw new Error(`Missing suit after digits in "${notation}"`);
  return tiles;
}

/** Formats tiles in compact notation, sorted: [0,1,2,9] -> "123m1p". */
export function formatHand(tiles: Tile[]): string {
  const sorted = sortTiles(tiles);
  let out = "";
  let digits = "";
  let currentSuit = -1;
  for (const tile of sorted) {
    const suit = Math.floor(tile / 9);
    if (suit !== currentSuit && digits) {
      out += digits + SUIT_CHARS[currentSuit];
      digits = "";
    }
    currentSuit = suit;
    digits += String((tile % 9) + 1);
  }
  if (digits) out += digits + SUIT_CHARS[currentSuit];
  return out;
}

export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => a - b);
}

export function toCounts(tiles: Tile[]): Counts {
  const counts = new Array<number>(TILE_KINDS).fill(0);
  for (const tile of tiles) counts[tile]++;
  return counts;
}

export function countTiles(counts: Counts): number {
  return counts.reduce((sum, c) => sum + c, 0);
}
