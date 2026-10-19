import { HandEvaluation, evaluateHand } from "./evaluator";
import { GeneratorOptions, Problem, Rng, generateProblem } from "./generator";
import { SHAPES, Shape, classifyTile } from "./shapes";
import { Tile, isHonor, toCounts } from "./tiles";

/**
 * A problem's category is the shape its optimal discard is cut from
 * ("cut the isolated terminal", "break the kanchan", ...). Mistakes are
 * tracked per category so review can target the patterns that keep failing.
 * When several discards tie, the most basic shape wins (isolated tiles before
 * partial shapes before complete ones), following the order of SHAPES.
 */
export function problemCategory(problem: Problem, evaluation: HandEvaluation = evaluateHand(problemTiles(problem))): Shape {
  return classifyTile(representativeDiscard(problem, evaluation), toCounts(problemTiles(problem)));
}

/** The optimal discard used to explain/categorise a problem: the most basic shape among the tied best. */
export function representativeDiscard(problem: Problem, evaluation: HandEvaluation = evaluateHand(problemTiles(problem))): Tile {
  const counts = toCounts(problemTiles(problem));
  const rank = (t: Tile) => SHAPES.indexOf(classifyTile(t, counts));
  return evaluation.bestDiscards.reduce((a, b) => (rank(b) < rank(a) ? b : a));
}

/**
 * A problem has a clear answer when one discard is best, or two tied discards
 * come from the same block (1s/2s of a penchan, 7p/9p of a kanchan): either
 * way there is a single decision to make, not a coin flip between unrelated tiles.
 */
export function hasClearAnswer(evaluation: HandEvaluation): boolean {
  const best = evaluation.bestDiscards;
  if (best.length === 1) return true;
  if (best.length !== 2) return false;
  const [a, b] = best;
  const sameSuit = !isHonor(a) && Math.floor(a / 9) === Math.floor(b / 9);
  return sameSuit && Math.abs(a - b) <= 2;
}

/** Generates a problem with a clear answer (see hasClearAnswer). */
export function generateClearProblem(options: GeneratorOptions = {}): Problem {
  const { accept } = options;
  return generateProblem({
    ...options,
    accept: (p) => (!accept || accept(p)) && hasClearAnswer(evaluateHand(problemTiles(p))),
  });
}

export function problemTiles(problem: Problem) {
  return [...problem.hand, problem.draw];
}

export interface CategoryStats {
  category: Shape;
  total: number;
  correct: number;
}

/**
 * Weakness score in [0, 1]: smoothed error rate, so a category with a single
 * miss doesn't dominate one with many misses over many attempts.
 */
export function weakness({ total, correct }: CategoryStats): number {
  return (total - correct + 1) / (total + 2);
}

/**
 * Picks a category to review, weighted by weakness squared, among the
 * categories with at least one mistake. Returns null if there is none.
 */
export function pickReviewCategory(stats: CategoryStats[], rng: Rng = Math.random): Shape | null {
  const candidates = stats.filter((s) => s.total > s.correct);
  if (candidates.length === 0) return null;
  const weights = candidates.map((s) => weakness(s) ** 2);
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i].category;
  }
  return candidates[candidates.length - 1].category;
}

/**
 * Generates a problem of the given category. Some categories are rare in
 * random hands, so this gives up after `maxAttempts` or one second and returns null.
 */
export function generateProblemOfCategory(
  category: Shape,
  options: Omit<GeneratorOptions, "accept" | "maxAttempts"> & { maxAttempts?: number; budgetMs?: number } = {},
): Problem | null {
  // Rare categories can take long to find: give up after a time budget.
  const deadline = Date.now() + (options.budgetMs ?? 1000);
  try {
    return generateProblem({
      maxAttempts: 3000,
      ...options,
      accept: (p) => {
        if (Date.now() > deadline) throw new Error("time budget exhausted");
        // Cheap pre-check without the tie-break: the final optimal discards are
        // a subset of these, so the category must already be among their shapes.
        const tiles = problemTiles(p);
        const counts = toCounts(tiles);
        // Cheapest check first: some tile must have that shape at all.
        if (!tiles.some((t) => classifyTile(t, counts) === category)) return false;
        const quick = evaluateHand(tiles, { tiebreak: false });
        if (!quick.bestDiscards.some((t) => classifyTile(t, counts) === category)) return false;
        const ev = evaluateHand(tiles);
        return hasClearAnswer(ev) && problemCategory(p, ev) === category;
      },
    });
  } catch {
    return null;
  }
}

/**
 * Target mix of problem types for normal play. Random hands are dominated by
 * "cut the isolated honor" (a third of them), so instead the type is picked
 * first and a hand of that type is generated. Rare, slow-to-find types get
 * less weight.
 */
export const CATEGORY_MIX: Record<Shape, number> = {
  "isolated-honor": 12,
  "isolated-terminal": 14,
  "isolated-simple": 16,
  kanchan: 16,
  penchan: 12,
  sequence: 12,
  triplet: 8,
  ryanmen: 5,
  pair: 5,
};

export function pickCategory(rng: Rng = Math.random, mix: Record<Shape, number> = CATEGORY_MIX): Shape {
  const entries = Object.entries(mix) as [Shape, number][];
  let r = rng() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [category, w] of entries) {
    r -= w;
    if (r <= 0) return category;
  }
  return entries[entries.length - 1][0];
}

/**
 * A clear-answer problem whose type follows CATEGORY_MIX. If the chosen type
 * isn't found within the time budget, falls back to any clear problem.
 */
export function generateBalancedProblem(options: GeneratorOptions & { budgetMs?: number } = {}): Problem {
  const { rng = Math.random, budgetMs = 600, ...rest } = options;
  const category = pickCategory(rng);
  const problem = generateProblemOfCategory(category, { ...rest, rng, budgetMs });
  if (problem) return problem;
  // Fallback: any clear problem, but not the over-represented isolated honor.
  return generateClearProblem({
    ...rest,
    rng,
    accept: (p) => category === "isolated-honor" || problemCategory(p) !== "isolated-honor",
  });
}
