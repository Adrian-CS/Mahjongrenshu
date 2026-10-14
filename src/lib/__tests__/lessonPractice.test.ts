import { describe, expect, it } from "vitest";
import { LESSONS } from "../lessons";
import { PRACTICE, generatePracticeProblem } from "../lessonPractice";
import { evaluateHand, formatHand, problemTiles, seededRng, toCounts } from "../mahjong";

describe("lesson practice", () => {
  it("every lesson has a practice builder", () => {
    for (const l of LESSONS) expect(PRACTICE[l.id], l.id).toBeDefined();
  });

  it.each(LESSONS.map((l) => [l.id] as const))("%s: generates valid, varied practice problems", (id) => {
    const rng = seededRng(id.length * 101);
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const p = generatePracticeProblem(id, rng);
      expect(p, `attempt ${i}`).not.toBeNull();
      const tiles = problemTiles(p!);
      expect(p!.hand).toHaveLength(13);
      expect(Math.max(...toCounts(tiles))).toBeLessThanOrEqual(4);
      const ev = evaluateHand(tiles);
      if (PRACTICE[id].shanten !== undefined) expect(ev.shanten).toBe(PRACTICE[id].shanten);
      seen.add(formatHand(tiles));
    }
    expect(seen.size).toBeGreaterThanOrEqual(18);
  });

  it("only accepts hands whose optimal discards are the lesson's target", () => {
    // Re-run the builders and check the acceptance rule directly.
    for (const l of LESSONS) {
      const rng = seededRng(5);
      let accepted = 0;
      for (let i = 0; i < 2000 && accepted < 5; i++) {
        const { groups, target } = PRACTICE[l.id].build(rng);
        const tiles = groups.flat();
        if (Math.max(...toCounts(tiles)) > 4) continue;
        const ev = evaluateHand(tiles);
        if (!ev.bestDiscards.every((b) => target.includes(b))) continue;
        accepted++;
        expect(target.length).toBeGreaterThan(0);
      }
      expect(accepted, l.id).toBeGreaterThan(0);
    }
  });
});
