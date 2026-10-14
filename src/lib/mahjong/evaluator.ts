import { calculateShanten, chiitoitsuShanten, kokushiShanten } from "./shanten";
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
  /**
   * Tiles that don't advance the hand but let it switch to a shape with more
   * ukeire (e.g. a kanchan 3-5 drawing 6 becomes the ryanmen 5-6). Only
   * computed for the discards tied at the top, where it breaks the tie.
   */
  improvement?: Ukeire;
}

export interface HandEvaluation {
  /** Shanten of the 14-tile hand, i.e. after the best possible discard. */
  shanten: number;
  /** One entry per distinct tile in the hand, best discard first. */
  options: DiscardOption[];
  /** All discards tied for best (lowest shanten, then highest ukeire, then most improvement tiles). */
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
  for (const tile of candidateDraws(hand13, base)) {
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

const ALL_TILES = Array.from({ length: TILE_KINDS }, (_, i) => i);

/**
 * Tiles that could lower the shanten of a 13-tile hand if drawn. A tile with
 * no hand tile within two ranks (or, for honors, no copy) can't help the
 * standard form; it only matters when chiitoitsu or kokushi is as close as
 * the current shanten, since there a new kind of tile counts. Skipping the
 * rest gives the same result much faster.
 */
function candidateDraws(hand13: Counts, shanten: number): number[] {
  if (chiitoitsuShanten(hand13) <= shanten || kokushiShanten(hand13) <= shanten) return ALL_TILES;
  const out: number[] = [];
  for (let tile = 0; tile < TILE_KINDS; tile++) {
    if (hand13[tile] > 0) {
      out.push(tile);
      continue;
    }
    if (tile >= 27) continue;
    const rank = tile % 9;
    for (let d = -2; d <= 2; d++) {
      if (d !== 0 && rank + d >= 0 && rank + d <= 8 && hand13[tile + d] > 0) {
        out.push(tile);
        break;
      }
    }
  }
  return out;
}

/**
 * Improvement tiles of a 13-tile hand: draws that keep the shanten but, after
 * the best discard, leave a hand with more ukeire than now.
 */
export function calculateImprovement(hand13: Counts, visible: Counts, shanten: number, ukeire: Ukeire): Ukeire {
  const accepted = new Set(ukeire.tiles.map((u) => u.tile));
  const tiles: UkeireTile[] = [];
  let total = 0;
  for (let draw = 0; draw < TILE_KINDS; draw++) {
    const remaining = COPIES_PER_TILE - visible[draw];
    if (accepted.has(draw) || remaining <= 0 || hand13[draw] >= COPIES_PER_TILE) continue;
    hand13[draw]++;
    visible[draw]++;
    let improves = false;
    for (let cut = 0; cut < TILE_KINDS && !improves; cut++) {
      if (cut === draw || hand13[cut] === 0) continue;
      hand13[cut]--;
      if (calculateShanten(hand13) === shanten && ukeireExceeds(hand13, visible, shanten, ukeire.total)) improves = true;
      hand13[cut]++;
    }
    visible[draw]--;
    hand13[draw]--;
    if (!improves) continue;
    tiles.push({ tile: draw, remaining });
    total += remaining;
  }
  return { tiles, total };
}

/** Whether a hand at `shanten` accepts more than `threshold` tiles; stops counting once it does. */
function ukeireExceeds(hand13: Counts, visible: Counts, shanten: number, threshold: number): boolean {
  let total = 0;
  for (const tile of candidateDraws(hand13, shanten)) {
    const remaining = COPIES_PER_TILE - visible[tile];
    if (remaining <= 0 || hand13[tile] >= COPIES_PER_TILE) continue;
    hand13[tile]++;
    const improved = calculateShanten(hand13) < shanten;
    hand13[tile]--;
    if (improved && (total += remaining) > threshold) return true;
  }
  return false;
}

const improvementTotal = (o: DiscardOption) => o.improvement?.total ?? -1;

export function compareOptions(a: DiscardOption, b: DiscardOption): number {
  return (
    a.shanten - b.shanten ||
    b.ukeire.total - a.ukeire.total ||
    improvementTotal(b) - improvementTotal(a) ||
    a.discard - b.discard
  );
}

export function isSameValue(a: DiscardOption, b: DiscardOption): boolean {
  return a.shanten === b.shanten && a.ukeire.total === b.ukeire.total && improvementTotal(a) === improvementTotal(b);
}

/**
 * HandEvaluator: given a 14-tile closed hand, evaluates every possible discard
 * by resulting shanten and ukeire (pure tile efficiency).
 */
export function evaluateHand(hand: Tile[], { tiebreak = true }: { tiebreak?: boolean } = {}): HandEvaluation {
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

  // Break ties at the top by improvement tiles (expensive, so only there).
  const top = options.filter((o) => o.shanten === options[0].shanten && o.ukeire.total === options[0].ukeire.total);
  if (tiebreak && top.length > 1 && options[0].shanten >= 0) {
    const visible = toCounts(hand);
    for (const o of top) {
      counts[o.discard]--;
      o.improvement = calculateImprovement(counts, visible, o.shanten, o.ukeire);
      counts[o.discard]++;
    }
    options.sort(compareOptions);
  }

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
