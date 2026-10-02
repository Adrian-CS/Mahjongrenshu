import { calculateShanten } from "./shanten";
import { COPIES_PER_TILE, TILE_KINDS, Tile, sortTiles, toCounts } from "./tiles";

export type Rng = () => number;

export interface Problem {
  /** The 13 tiles held before drawing, sorted. */
  hand: Tile[];
  /** The tile just drawn. */
  draw: Tile;
}

export interface GeneratorOptions {
  /** Upper bound on the 14-tile hand's shanten (after the best discard). */
  maxShanten?: number;
  /** Lower bound; 0 excludes already-complete hands. */
  minShanten?: number;
  rng?: Rng;
  maxAttempts?: number;
}

/** Deterministic PRNG (mulberry32), useful for tests and reproducible problems. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The full 136-tile set: 4 copies of each of the 34 kinds. */
export function buildWall(): Tile[] {
  const wall: Tile[] = [];
  for (let tile = 0; tile < TILE_KINDS; tile++) {
    for (let k = 0; k < COPIES_PER_TILE; k++) wall.push(tile);
  }
  return wall;
}

/** Draws `n` tiles without replacement (partial Fisher-Yates). */
export function drawTiles(n: number, rng: Rng = Math.random): Tile[] {
  const wall = buildWall();
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (wall.length - i));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  return wall.slice(0, n);
}

/**
 * TileGenerator: produces a random closed 13-tile hand plus a drawn tile,
 * re-rolling until the resulting 14-tile hand is within the shanten range.
 * Very slow hands (4+ shanten) make poor efficiency problems, so the default
 * range is 0..3.
 */
export function generateProblem(options: GeneratorOptions = {}): Problem {
  const { maxShanten = 3, minShanten = 0, rng = Math.random, maxAttempts = 10_000 } = options;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const tiles = drawTiles(14, rng);
    const shanten = calculateShanten(toCounts(tiles));
    if (shanten < minShanten || shanten > maxShanten) continue;
    return { hand: sortTiles(tiles.slice(0, 13)), draw: tiles[13] };
  }
  throw new Error(`Could not generate a hand with shanten in [${minShanten}, ${maxShanten}]`);
}
