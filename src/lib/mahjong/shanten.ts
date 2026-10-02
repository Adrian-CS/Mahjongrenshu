import { Counts, TILE_KINDS, isTerminalOrHonor } from "./tiles";

/**
 * Shanten calculation for closed hands of 13 or 14 tiles.
 *
 * Shanten is the number of tiles away from tenpai: 0 = tenpai, -1 = complete.
 * The result is the minimum over the three hand shapes: standard (4 melds +
 * pair), chiitoitsu (7 pairs) and kokushi musou (13 orphans).
 */
export function calculateShanten(counts: Counts): number {
  return Math.min(standardShanten(counts), chiitoitsuShanten(counts), kokushiShanten(counts));
}

export function chiitoitsuShanten(counts: Counts): number {
  let pairs = 0;
  let kinds = 0;
  for (let i = 0; i < TILE_KINDS; i++) {
    if (counts[i] > 0) kinds++;
    if (counts[i] >= 2) pairs++;
  }
  // Four of a kind cannot be two pairs, so missing kinds also cost a tile each.
  return 6 - pairs + Math.max(0, 7 - kinds);
}

export function kokushiShanten(counts: Counts): number {
  let kinds = 0;
  let hasPair = false;
  for (let i = 0; i < TILE_KINDS; i++) {
    if (!isTerminalOrHonor(i) || counts[i] === 0) continue;
    kinds++;
    if (counts[i] >= 2) hasPair = true;
  }
  return 13 - kinds - (hasPair ? 1 : 0);
}

/**
 * Standard-form shanten: 8 - 2*melds - min(partials, 4 - melds) - pair.
 *
 * Each suit (and the honors) is decomposed independently into the best
 * achievable (pair, melds) -> max partials table, then the tables are merged.
 * Decompositions are memoised by the group's tile counts.
 */
export function standardShanten(counts: Counts): number {
  let table = groupTable(counts.slice(0, 9), true);
  table = mergeTables(table, groupTable(counts.slice(9, 18), true));
  table = mergeTables(table, groupTable(counts.slice(18, 27), true));
  table = mergeTables(table, groupTable(counts.slice(27, 34), false));

  let best = 8;
  for (let p = 0; p <= 1; p++) {
    for (let m = 0; m <= MAX_MELDS; m++) {
      const t = table[p * TABLE_STRIDE + m];
      if (t < 0) continue;
      const shanten = 8 - 2 * m - Math.min(t, MAX_MELDS - m) - p;
      if (shanten < best) best = shanten;
    }
  }
  return best;
}

const MAX_MELDS = 4;
const TABLE_STRIDE = MAX_MELDS + 1;
const TABLE_SIZE = 2 * TABLE_STRIDE;

/**
 * table[p * TABLE_STRIDE + m] = maximum number of partial sets (taatsu or
 * extra pairs) achievable with `m` complete melds and `p` (0/1) pair used as
 * the head, or -1 if that combination is impossible.
 */
type Table = Int8Array;

function emptyTable(): Table {
  return new Int8Array(TABLE_SIZE).fill(-1);
}

function mergeTables(a: Table, b: Table): Table {
  const out = emptyTable();
  for (let pa = 0; pa <= 1; pa++) {
    for (let ma = 0; ma <= MAX_MELDS; ma++) {
      const ta = a[pa * TABLE_STRIDE + ma];
      if (ta < 0) continue;
      for (let pb = 0; pa + pb <= 1; pb++) {
        for (let mb = 0; ma + mb <= MAX_MELDS; mb++) {
          const tb = b[pb * TABLE_STRIDE + mb];
          if (tb < 0) continue;
          const idx = (pa + pb) * TABLE_STRIDE + ma + mb;
          if (ta + tb > out[idx]) out[idx] = ta + tb;
        }
      }
    }
  }
  return out;
}

const cache = new Map<string, Table>();

function groupTable(group: number[], isSuit: boolean): Table {
  return decompose(group, 0, isSuit);
}

/**
 * Best table for group[i..] where all tiles before i are already used.
 * Always works on the lowest remaining tile, so the state is fully described
 * by the counts and can be memoised by them.
 */
function decompose(group: number[], start: number, isSuit: boolean): Table {
  let i = start;
  while (i < group.length && group[i] === 0) i++;
  if (i === group.length) {
    const t = emptyTable();
    t[0] = 0;
    return t;
  }

  const key = (isSuit ? "s" : "h") + group.join("");
  const cached = cache.get(key);
  if (cached) return cached;

  const out = emptyTable();
  const take = (delta: (number | [number, number])[], dm: number, dt: number, dp: number) => {
    for (const d of delta) {
      const [idx, n] = typeof d === "number" ? [d, 1] : d;
      group[idx] -= n;
    }
    const sub = decompose(group, i, isSuit);
    for (const d of delta) {
      const [idx, n] = typeof d === "number" ? [d, 1] : d;
      group[idx] += n;
    }
    for (let p = 0; p + dp <= 1; p++) {
      for (let m = 0; m + dm <= MAX_MELDS; m++) {
        const t = sub[p * TABLE_STRIDE + m];
        if (t < 0) continue;
        const idx = (p + dp) * TABLE_STRIDE + m + dm;
        if (t + dt > out[idx]) out[idx] = t + dt;
      }
    }
  };

  const c = group[i];
  const canSeq = isSuit && i + 2 < group.length;
  const canPair = isSuit && i + 1 < group.length;

  if (c >= 3) take([[i, 3]], 1, 0, 0); // triplet
  if (canSeq && group[i + 1] > 0 && group[i + 2] > 0) take([i, i + 1, i + 2], 1, 0, 0); // sequence
  if (c >= 2) {
    take([[i, 2]], 0, 0, 1); // pair as head
    take([[i, 2]], 0, 1, 0); // pair as partial
  }
  if (canPair && group[i + 1] > 0) take([i, i + 1], 0, 1, 0); // ryanmen / penchan
  if (canSeq && group[i + 2] > 0) take([i, i + 2], 0, 1, 0); // kanchan

  // Leave the remaining copies of tile i unused (isolated).
  group[i] = 0;
  const sub = decompose(group, i + 1, isSuit);
  group[i] = c;
  for (let k = 0; k < TABLE_SIZE; k++) if (sub[k] > out[k]) out[k] = sub[k];

  cache.set(key, out);
  return out;
}
