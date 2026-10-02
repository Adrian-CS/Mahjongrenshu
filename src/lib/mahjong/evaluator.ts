import { calculateShanten } from "./shanten";
import { COPIES_PER_TILE, Counts, TILE_KINDS, Tile, countTiles, toCounts } from "./tiles";

export interface UkeireTile {
  tile: Tile;
  /** Copies still unseen (4 minus copies visible in the player's own 14 tiles). */
  remaining: number;
}

export interface Ukeire {
  tiles: UkeireTile[];
  /** Total number of unseen tiles that advance the hand. */
  total: number;
}

export interface DiscardOption {
  discard: Tile;
  /** Shanten of the 13-tile hand left after discarding. */
  shanten: number;
  ukeire: Ukeire;
}

export interface HandEvaluation {
  /** Shanten of the 14-tile hand, i.e. after the best possible discard. */
  shanten: number;
  /** One entry per distinct tile in the hand, best discard first. */
  options: DiscardOption[];
  /** All discards tied for best (lowest shanten, then highest ukeire). */
  bestDiscards: Tile[];
}

/**
 * Ukeire of a 13-tile hand: the tiles that would reduce its shanten if drawn.
 * `visible` is the set of tiles the player can see (their full 14-tile hand),
 * used to count how many copies are still unseen.
 */
export function calculateUkeire(hand13: Counts, visible: Counts = hand13): Ukeire {
  const base = calculateShanten(hand13);
  const tiles: UkeireTile[] = [];
  let total = 0;
  for (let tile = 0; tile < TILE_KINDS; tile++) {
    if (hand13[tile] >= COPIES_PER_TILE) continue;
    hand13[tile]++;
    const improved = calculateShanten(hand13) < base;
    hand13[tile]--;
    if (!improved) continue;
    const remaining = COPIES_PER_TILE - visible[tile];
    if (remaining <= 0) continue;
    tiles.push({ tile, remaining });
    total += remaining;
  }
  return { tiles, total };
}

export function compareOptions(a: DiscardOption, b: DiscardOption): number {
  return a.shanten - b.shanten || b.ukeire.total - a.ukeire.total || a.discard - b.discard;
}

export function isSameValue(a: DiscardOption, b: DiscardOption): boolean {
  return a.shanten === b.shanten && a.ukeire.total === b.ukeire.total;
}

/**
 * HandEvaluator: given a 14-tile closed hand, evaluates every possible discard
 * by resulting shanten and ukeire (pure tile efficiency).
 */
export function evaluateHand(hand: Tile[]): HandEvaluation {
  const counts = toCounts(hand);
  if (countTiles(counts) !== 14) {
    throw new Error(`evaluateHand expects 14 tiles, got ${countTiles(counts)}`);
  }

  const options: DiscardOption[] = [];
  for (let tile = 0; tile < TILE_KINDS; tile++) {
    if (counts[tile] === 0) continue;
    counts[tile]--;
    const shanten = calculateShanten(counts);
    const ukeire = calculateUkeire(counts, toCounts(hand));
    counts[tile]++;
    options.push({ discard: tile, shanten, ukeire });
  }
  options.sort(compareOptions);

  const best = options[0];
  return {
    shanten: best.shanten,
    options,
    bestDiscards: options.filter((o) => isSameValue(o, best)).map((o) => o.discard),
  };
}

export function findOption(evaluation: HandEvaluation, discard: Tile): DiscardOption {
  const option = evaluation.options.find((o) => o.discard === discard);
  if (!option) throw new Error(`Tile ${discard} is not in the evaluated hand`);
  return option;
}
