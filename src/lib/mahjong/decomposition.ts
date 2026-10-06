import { Counts, TILE_KINDS, Tile, isHonor } from "./tiles";

/**
 * Explicit standard-form reading of a hand: which tiles form melds, the pair,
 * partial shapes and floating tiles. The shanten engine only needs counts;
 * this is for explaining a hand to the player.
 */
export type BlockKind = "shuntsu" | "koutsu" | "toitsu" | "ryanmen" | "penchan" | "kanchan" | "floating";

export interface Block {
  kind: BlockKind;
  tiles: Tile[];
}

export interface Reading {
  blocks: Block[];
  /** Standard-form shanten of this reading. */
  shanten: number;
  melds: number;
  /** The pair used as head, if any (index into blocks). */
  headIndex: number | null;
  /** Partial blocks (incl. extra pairs) beyond what 4 melds + head can use. */
  excessBlocks: number;
}

const MELD_KINDS: BlockKind[] = ["shuntsu", "koutsu"];
const PARTIAL_KINDS: BlockKind[] = ["toitsu", "ryanmen", "penchan", "kanchan"];

/** Weakest partials first: these are the ones a hand drops when it has too many. */
const PARTIAL_STRENGTH: Record<BlockKind, number> = {
  ryanmen: 4,
  toitsu: 3,
  kanchan: 2,
  penchan: 1,
  shuntsu: 0,
  koutsu: 0,
  floating: 0,
};

function score(blocks: Block[]): Omit<Reading, "blocks"> {
  const melds = blocks.filter((b) => MELD_KINDS.includes(b.kind)).length;
  const pairs = blocks.filter((b) => b.kind === "toitsu").length;
  const partials = blocks.filter((b) => PARTIAL_KINDS.includes(b.kind)).length;
  const head = pairs > 0 ? 1 : 0;
  const taatsu = partials - head;
  const usable = Math.min(taatsu, 4 - melds);
  const shanten = 8 - 2 * melds - usable - head;
  // Keep the strongest pair as head: any pair works, pick the first.
  const headIndex = head ? blocks.findIndex((b) => b.kind === "toitsu") : null;
  return { shanten, melds, headIndex, excessBlocks: taatsu - usable };
}

/** Tie-break among equal-shanten readings: more melds, then stronger partials, then fewer floaters. */
function quality(r: Reading): number[] {
  const strength = r.blocks.reduce((s, b) => s + PARTIAL_STRENGTH[b.kind], 0);
  const floaters = r.blocks.filter((b) => b.kind === "floating").length;
  return [-r.shanten, r.melds, r.headIndex !== null ? 1 : 0, strength, -floaters];
}

function better(a: Reading, b: Reading): boolean {
  const qa = quality(a);
  const qb = quality(b);
  for (let i = 0; i < qa.length; i++) if (qa[i] !== qb[i]) return qa[i] > qb[i];
  return false;
}

/**
 * Best standard-form reading of a hand (lowest shanten, then the most natural
 * grouping). Exhaustive search: fine for 13-14 tiles, not for hot loops.
 */
export function readHand(input: Counts): Reading {
  const counts = [...input];
  const blocks: Block[] = [];
  let best: Reading | null = null;

  const dfs = (start: number) => {
    let i = start;
    while (i < TILE_KINDS && counts[i] === 0) i++;
    if (i === TILE_KINDS) {
      const reading = { blocks: [...blocks], ...score(blocks) };
      if (!best || better(reading, best)) best = reading;
      return;
    }
    const suited = !isHonor(i);
    const rank = i % 9;
    const take = (kind: BlockKind, tiles: Tile[]) => {
      for (const t of tiles) counts[t]--;
      blocks.push({ kind, tiles });
      dfs(i);
      blocks.pop();
      for (const t of tiles) counts[t]++;
    };

    if (counts[i] >= 3) take("koutsu", [i, i, i]);
    if (suited && rank <= 6 && counts[i + 1] > 0 && counts[i + 2] > 0) take("shuntsu", [i, i + 1, i + 2]);
    if (counts[i] >= 2) take("toitsu", [i, i]);
    if (suited && rank <= 7 && counts[i + 1] > 0) take(rank === 0 || rank === 7 ? "penchan" : "ryanmen", [i, i + 1]);
    if (suited && rank <= 6 && counts[i + 2] > 0) take("kanchan", [i, i + 2]);
    take("floating", [i]);
  };

  dfs(0);
  return best!;
}

/** Partial blocks of a reading ordered weakest first (used to name the block to cut). */
export function weakestPartials(reading: Reading): Block[] {
  return reading.blocks
    .filter((b, idx) => PARTIAL_KINDS.includes(b.kind) && idx !== reading.headIndex)
    .sort((a, b) => PARTIAL_STRENGTH[a.kind] - PARTIAL_STRENGTH[b.kind]);
}
