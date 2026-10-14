import { describe, expect, it } from "vitest";
import { seededRng } from "../generator";
import { evaluateHand } from "../evaluator";
import { CategoryStats, generateClearProblem, generateProblemOfCategory, hasClearAnswer, pickReviewCategory, problemCategory, problemTiles, weakness } from "../review";
import { parseHand, tileToString } from "../tiles";

describe("review", () => {
  it("categorises a problem by its optimal discard's shape", () => {
    const tiles = parseHand("234m789p111z45s79s5z");
    const problem = { hand: tiles.slice(0, 13), draw: tiles[13] };
    expect(problemCategory(problem)).toBe("isolated-honor");
  });

  it("prefers the most basic shape when optimal discards tie", () => {
    // Cutting 9s (from 789s) and 7z (isolated honor) tie; the lesson is the honor.
    // (Tied on ukeire; the improvement tie-break is off to test the rule itself.)
    const problem = { hand: parseHand("1179m45p223789s7z"), draw: parseHand("9s")[0] };
    const ev = evaluateHand(problemTiles(problem), { tiebreak: false });
    expect(ev.bestDiscards.map(tileToString)).toEqual(["9s", "7z"]);
    expect(problemCategory(problem, ev)).toBe("isolated-honor");
  });

  it("weights categories by smoothed error rate", () => {
    expect(weakness({ category: "kanchan", total: 10, correct: 2 })).toBeGreaterThan(
      weakness({ category: "penchan", total: 1, correct: 0 }),
    );
  });

  it("only picks categories with mistakes", () => {
    const stats: CategoryStats[] = [
      { category: "isolated-honor", total: 20, correct: 20 },
      { category: "kanchan", total: 5, correct: 1 },
    ];
    const rng = seededRng(3);
    for (let i = 0; i < 50; i++) expect(pickReviewCategory(stats, rng)).toBe("kanchan");
    expect(pickReviewCategory([{ category: "pair", total: 3, correct: 3 }])).toBeNull();
  });

  it("generates problems of a requested category", () => {
    const rng = seededRng(11);
    for (const category of ["isolated-honor", "isolated-terminal", "kanchan"] as const) {
      const p = generateProblemOfCategory(category, { rng, minShanten: 1, maxShanten: 3 });
      expect(p).not.toBeNull();
      expect(problemCategory(p!)).toBe(category);
    }
  });

  it("accepts a unique best discard or a tie inside one block", () => {
    const ev = (n: string) => evaluateHand(parseHand(n));
    expect(hasClearAnswer(ev("234m789p111z45s79s5z"))).toBe(true); // 5z only
    expect(hasClearAnswer(ev("234m567p11z45s79p1s2s"))).toBe(true); // 1s/2s penchan
    expect(hasClearAnswer(ev("1133m5577p99s1z2z3z4z"))).toBe(false); // four honors tie
    expect(hasClearAnswer(ev("234m567p11z12s46p77z"))).toBe(false); // 1z and 7z: two separate pairs
  });

  it("only generates problems with a clear answer", () => {
    const rng = seededRng(13);
    for (let i = 0; i < 30; i++) {
      const p = generateClearProblem({ rng, minShanten: 1, maxShanten: 2 });
      expect(hasClearAnswer(evaluateHand(problemTiles(p)))).toBe(true);
    }
  });
});
