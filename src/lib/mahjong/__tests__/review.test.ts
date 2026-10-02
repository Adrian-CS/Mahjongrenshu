import { describe, expect, it } from "vitest";
import { seededRng } from "../generator";
import { evaluateHand } from "../evaluator";
import { CategoryStats, generateProblemOfCategory, pickReviewCategory, problemCategory, problemTiles, weakness } from "../review";
import { parseHand, tileToString } from "../tiles";

describe("review", () => {
  it("categorises a problem by its optimal discard's shape", () => {
    const tiles = parseHand("234m789p111z45s79s5z");
    const problem = { hand: tiles.slice(0, 13), draw: tiles[13] };
    expect(problemCategory(problem)).toBe("isolated-honor");
  });

  it("prefers the most basic shape when optimal discards tie", () => {
    // Cutting 9s (from 789s) and 7z (isolated honor) tie; the lesson is the honor.
    const problem = { hand: parseHand("1179m45p223789s7z"), draw: parseHand("9s")[0] };
    expect(evaluateHand(problemTiles(problem)).bestDiscards.map(tileToString)).toEqual(["9s", "7z"]);
    expect(problemCategory(problem)).toBe("isolated-honor");
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
});
