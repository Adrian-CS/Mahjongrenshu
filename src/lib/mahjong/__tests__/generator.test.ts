import { describe, expect, it } from "vitest";
import { buildWall, drawTiles, generateProblem, seededRng } from "../generator";
import { calculateShanten } from "../shanten";
import { toCounts } from "../tiles";

describe("generator", () => {
  it("builds a 136-tile wall with 4 copies of each kind", () => {
    const counts = toCounts(buildWall());
    expect(counts).toHaveLength(34);
    expect(counts.every((c) => c === 4)).toBe(true);
  });

  it("never draws more than 4 copies of a tile", () => {
    const rng = seededRng(1);
    for (let i = 0; i < 500; i++) {
      expect(Math.max(...toCounts(drawTiles(14, rng)))).toBeLessThanOrEqual(4);
    }
  });

  it("generates sorted 13-tile hands within the shanten range", () => {
    const rng = seededRng(2);
    for (let i = 0; i < 100; i++) {
      const p = generateProblem({ rng, minShanten: 1, maxShanten: 2 });
      expect(p.hand).toHaveLength(13);
      expect(p.hand).toEqual([...p.hand].sort((a, b) => a - b));
      const s = calculateShanten(toCounts([...p.hand, p.draw]));
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(2);
    }
  });

  it("is reproducible with a seed", () => {
    expect(generateProblem({ rng: seededRng(42) })).toEqual(generateProblem({ rng: seededRng(42) }));
  });
});
