import { Problem, Rng, Tile, evaluateHand, sortTiles } from "@/lib/mahjong";

/**
 * Practice problems for lessons. Each lesson has a builder that assembles a
 * fresh hand from the blocks its concept needs (melds, a pair, a kanchan...)
 * in random suits and ranks, plus the tiles the concept says to cut. The
 * engine then has the final word: a hand is only used if its optimal
 * discards are exactly within that target (and, when given, the shanten
 * matches), so a practice problem can never contradict the lesson.
 */
export interface Built {
  /** One entry per block (meld, pair, wait, loose tile...). */
  groups: Tile[][];
  /** Tiles the concept says are correct to cut. */
  target: Tile[];
}

export interface Practice {
  /** Short general rule shown with every practice problem. */
  rule: string;
  /** Expected shanten after the best discard, when the concept fixes it. */
  shanten?: number;
  build: (rng: Rng) => Built;
}

// ---- block helpers ------------------------------------------------------

const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
/** Tile from suit (0 m, 1 p, 2 s) and rank 1-9. */
const t = (suit: number, rank: number): Tile => suit * 9 + rank - 1;
const suit = (rng: Rng) => int(rng, 0, 2);
const honor = (rng: Rng): Tile => int(rng, 27, 33);

const sequence = (rng: Rng) => {
  const s = suit(rng);
  const r = int(rng, 1, 7);
  return [t(s, r), t(s, r + 1), t(s, r + 2)];
};
const meld = (rng: Rng) => (rng() < 0.8 ? sequence(rng) : triplet(rng));
const triplet = (rng: Rng) => {
  const x = rng() < 0.3 ? honor(rng) : t(suit(rng), int(rng, 1, 9));
  return [x, x, x];
};
const pair = (rng: Rng) => {
  const x = rng() < 0.4 ? honor(rng) : t(suit(rng), int(rng, 1, 9));
  return [x, x];
};
/** Two-sided wait: ranks 2-3 .. 7-8. */
const ryanmen = (rng: Rng) => {
  const s = suit(rng);
  const r = int(rng, 2, 7);
  return [t(s, r), t(s, r + 1)];
};
const kanchan = (rng: Rng) => {
  const s = suit(rng);
  const r = int(rng, 1, 7);
  return [t(s, r), t(s, r + 2)];
};
const shuffle = <T,>(rng: Rng, xs: T[]): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const terminal = (rng: Rng) => t(suit(rng), pick(rng, [1, 9]));
const central = (rng: Rng) => t(suit(rng), int(rng, 3, 7));

// ---- builders, one per lesson -------------------------------------------

export const PRACTICE: Record<string, Practice> = {
  "isolated-honor": {
    rule: "Entre tiles sueltos, el honor aislado es el menos útil: solo mejora si robas otra copia igual. Córtalo antes que un terminal o un tile central.",
    build: (rng) => {
      const h = honor(rng);
      return { groups: [sequence(rng), sequence(rng), pair(rng), ryanmen(rng), [h], [terminal(rng)], [central(rng)], [central(rng)]], target: [h] };
    },
  },
  "keep-penchan": {
    rule: "Si te faltan bloques, no rompas un penchan: es un bloque que necesitas. Corta el tile suelto que menos conecta, normalmente el terminal.",
    shanten: 2,
    build: (rng) => {
      // Fixed layout so eight blocks fit without touching; suits and direction vary.
      const [a, b, c] = shuffle(rng, [0, 1, 2]);
      const flip = (r: number) => (rng() < 0.5 ? r : 10 - r);
      const seqWithLoose = (s: number) => {
        const low = rng() < 0.5;
        const seq = low ? [t(s, 1), t(s, 2), t(s, 3)] : [t(s, 7), t(s, 8), t(s, 9)];
        const loose = low ? t(s, int(rng, 6, 7)) : t(s, int(rng, 3, 4));
        return [seq, [loose]];
      };
      const fc = flip(1);
      const dir = fc === 1 ? 1 : -1;
      const pen = [t(c, fc), t(c, fc + dir)];
      const mid = t(c, fc + dir * 4);
      const term = t(c, fc + dir * 8);
      const h = honor(rng);
      return { groups: [...seqWithLoose(a), ...seqWithLoose(b), [h, h], pen, [mid], [term]], target: [term] };
    },
  },
  "kanchan-vs-penchan": {
    rule: "Cuando sobra una espera, mira qué tiles pide cada una. Si el penchan pide un tile que otra espera ya pide (1-2 y 4-5 esperan los dos el 3), es el que sobra: cortarlo no te cuesta ningún tile.",
    shanten: 1,
    build: (rng) => {
      // Penchan whose wait overlaps a ryanmen in the same suit: 12+45 or 89+56.
      const s = suit(rng);
      const low = rng() < 0.5;
      const pen = low ? [t(s, 1), t(s, 2)] : [t(s, 8), t(s, 9)];
      const ryan = low ? [t(s, 4), t(s, 5)] : [t(s, 5), t(s, 6)];
      return { groups: [sequence(rng), sequence(rng), pair(rng), [...pen, ...ryan], kanchan(rng)], target: pen };
    },
  },
  "ryanmen-vs-kanchan": {
    rule: "Cuando sobra un bloque y tienes ryanmen y kanchan, rompe el kanchan: espera un solo tipo de tile frente a los dos del ryanmen.",
    shanten: 1,
    build: (rng) => {
      const k = kanchan(rng);
      return { groups: [sequence(rng), sequence(rng), pair(rng), ryanmen(rng), ryanmen(rng), k], target: k };
    },
  },
  ryankan: {
    rule: "En una cadena de cuatro tiles separados de dos en dos (1-3-5-7), corta un extremo: los tres que quedan esperan dos tipos de tile.",
    shanten: 1,
    build: (rng) => {
      const s = suit(rng);
      const a = int(rng, 1, 3);
      const chain = [t(s, a), t(s, a + 2), t(s, a + 4), t(s, a + 6)];
      return { groups: [sequence(rng), sequence(rng), pair(rng), ryanmen(rng), chain], target: [chain[0], chain[3]] };
    },
  },
  "ryankan-246": {
    rule: "Un ryankan (tres tiles de dos en dos, como 2-4-6) espera dos tipos de tile, igual que un ryanmen. No lo rompas por un tile suelto.",
    shanten: 1,
    build: (rng) => {
      const s = suit(rng);
      const a = int(rng, 1, 5);
      const loose = rng() < 0.5 ? terminal(rng) : honor(rng);
      return {
        groups: [sequence(rng), sequence(rng), pair(rng), ryanmen(rng), [t(s, a), t(s, a + 2), t(s, a + 4)], [loose]],
        target: [loose],
      };
    },
  },
  kuttsuki: {
    rule: "Con tres grupos y la pareja, el último grupo saldrá de un tile suelto. Quédate con los más centrales y corta el que menos conecta.",
    shanten: 1,
    build: (rng) => {
      const term = terminal(rng);
      return { groups: [meld(rng), meld(rng), meld(rng), pair(rng), [term], [central(rng)], [central(rng)]], target: [term] };
    },
  },
  "attached-tile": {
    rule: "Un tile pegado a un grupo (8 junto a 567) amplía las formas que acepta la mano. Un tile aislado en el borde no: córtalo primero.",
    shanten: 1,
    build: (rng) => {
      const s = suit(rng);
      const a = int(rng, 1, 6);
      const seq = [t(s, a), t(s, a + 1), t(s, a + 2)];
      const attached = a + 3 <= 9 ? t(s, a + 3) : t(s, a - 1);
      const s2 = suit(rng);
      const b = int(rng, 2, 5);
      const four = [t(s2, b), t(s2, b + 1), t(s2, b + 2), t(s2, b + 3)];
      const term = terminal(rng);
      return { groups: [sequence(rng), [...seq, attached], pair(rng), four, [term]], target: [term] };
    },
  },
  "tenpai-wait": {
    rule: "En tenpai, con el mismo shanten, elige la espera con más tiles: un ryanmen (8) antes que un kanchan o un penchan (4).",
    shanten: 0,
    build: (rng) => {
      const s = suit(rng);
      const a = int(rng, 2, 6);
      const extra = t(s, a + 3);
      return { groups: [meld(rng), meld(rng), meld(rng), pair(rng), [t(s, a), t(s, a + 1), extra]], target: [extra] };
    },
  },
  "ryanmen-vs-shanpon": {
    rule: "Dos parejas en tenpai (shanpon) esperan como mucho 4 tiles. Si puedes convertir una en ryanmen, normalmente esperas más.",
    shanten: 0,
    build: (rng) => {
      const s = suit(rng);
      const a = int(rng, 2, 7);
      const other = pair(rng);
      return { groups: [meld(rng), meld(rng), meld(rng), other, [t(s, a), t(s, a), t(s, a + 1)]], target: [t(s, a)] };
    },
  },
  nobetan: {
    rule: "Cuatro tiles seguidos (3-4-5-6) son una espera nobetan: esperan los dos extremos. Quédate con ellos y corta el tile suelto.",
    shanten: 0,
    build: (rng) => {
      const s = suit(rng);
      const a = int(rng, 1, 6);
      const loose = rng() < 0.6 ? honor(rng) : terminal(rng);
      return { groups: [meld(rng), meld(rng), meld(rng), [t(s, a), t(s, a + 1), t(s, a + 2), t(s, a + 3)], [loose]], target: [loose] };
    },
  },
  sanmenchan: {
    rule: "Cinco tiles seguidos con pareja aparte (2-3-4-5-6) esperan tres tipos: el sanmenchan. Es la mejor espera habitual.",
    shanten: 0,
    build: (rng) => {
      const s = suit(rng);
      const a = int(rng, 2, 4);
      const loose = rng() < 0.6 ? honor(rng) : terminal(rng);
      return {
        groups: [meld(rng), meld(rng), pair(rng), [t(s, a), t(s, a + 1), t(s, a + 2), t(s, a + 3), t(s, a + 4)], [loose]],
        target: [loose],
      };
    },
  },
  "shape-3334": {
    rule: "Tres iguales más uno al lado (3-3-3-4) esperan tres tipos: el de al lado para la pareja y los dos que completan la secuencia.",
    shanten: 0,
    build: (rng) => {
      const s = suit(rng);
      const a = int(rng, 2, 7);
      const up = rng() < 0.5;
      const shape = up ? [t(s, a), t(s, a), t(s, a), t(s, a + 1)] : [t(s, a + 1), t(s, a + 1), t(s, a + 1), t(s, a)];
      const loose = rng() < 0.6 ? honor(rng) : terminal(rng);
      return { groups: [meld(rng), meld(rng), meld(rng), shape, [loose]], target: [loose] };
    },
  },
  "shape-1113": {
    rule: "Tres iguales más uno a dos de distancia (1-1-1-3) esperan dos tipos: el de en medio (kanchan) y el suelto para la pareja.",
    shanten: 0,
    build: (rng) => {
      const s = suit(rng);
      const a = int(rng, 1, 7);
      const up = rng() < 0.5;
      const shape = up ? [t(s, a), t(s, a), t(s, a), t(s, a + 2)] : [t(s, a + 2), t(s, a + 2), t(s, a + 2), t(s, a)];
      const loose = honor(rng);
      return { groups: [meld(rng), meld(rng), meld(rng), shape, [loose]], target: [loose] };
    },
  },
  chiitoitsu: {
    rule: "Con cinco o más parejas, piensa en chiitoitsu: conserva las parejas y corta los tiles sueltos que menos copias tienen disponibles.",
    shanten: 1,
    build: (rng) => {
      const kinds = new Set<Tile>();
      while (kinds.size < 9) kinds.add(rng() < 0.4 ? honor(rng) : t(suit(rng), int(rng, 1, 9)));
      const [p1, p2, p3, p4, p5, ...singles] = [...kinds];
      return { groups: [[p1, p1], [p2, p2], [p3, p3], [p4, p4], [p5, p5], ...singles.map((x) => [x])], target: singles };
    },
  },
};

/**
 * Blocks must not touch each other, so the hand reads exactly as it was
 * built: in the same suit, tiles of different blocks are at least 3 ranks
 * apart (123 and 678, not 123 and 567), and honors are not repeated.
 */
function wellSeparated(groups: Tile[][]): boolean {
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      for (const a of groups[i]) {
        for (const b of groups[j]) {
          if (a >= 27 || b >= 27) {
            if (a === b) return false;
          } else if (Math.floor(a / 9) === Math.floor(b / 9) && Math.abs(a - b) < 3) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

/**
 * Generates a practice problem for a lesson, or null if the builder could not
 * produce a valid one (should not happen; covered by tests).
 */
export function generatePracticeProblem(lessonId: string, rng: Rng = Math.random, maxAttempts = 20000): Problem | null {
  const practice = PRACTICE[lessonId];
  if (!practice) return null;
  for (let i = 0; i < maxAttempts; i++) {
    const { groups, target } = practice.build(rng);
    if (!wellSeparated(groups)) continue;
    const tiles = groups.flat();
    if (tiles.length !== 14) throw new Error(`Builder for ${lessonId} produced ${tiles.length} tiles`);
    const counts = new Map<Tile, number>();
    for (const x of tiles) counts.set(x, (counts.get(x) ?? 0) + 1);
    if ([...counts.values()].some((c) => c > 4)) continue;
    const ev = evaluateHand(tiles);
    if (practice.shanten !== undefined && ev.shanten !== practice.shanten) continue;
    if (!ev.bestDiscards.every((b) => target.includes(b))) continue;
    // The drawn tile is random, so it gives no hint about the answer.
    const drawIndex = Math.floor(rng() * tiles.length);
    const draw = tiles[drawIndex];
    const hand = sortTiles(tiles.filter((_, i) => i !== drawIndex));
    return { hand, draw };
  }
  return null;
}
