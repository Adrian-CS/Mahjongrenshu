import { HandEvaluation, evaluateHand } from "./evaluator";
import { GeneratorOptions, Problem, Rng, generateProblem } from "./generator";
import { SHAPES, Shape, classifyTile } from "./shapes";
import { toCounts } from "./tiles";

/**
 * A problem's category is the shape its optimal discard is cut from
 * ("cut the isolated terminal", "break the kanchan", ...). Mistakes are
 * tracked per category so review can target the patterns that keep failing.
 * When several discards tie, the most basic shape wins (isolated tiles before
 * partial shapes before complete ones), following the order of SHAPES.
 */
export function problemCategory(problem: Problem, evaluation: HandEvaluation = evaluateHand(problemTiles(problem))): Shape {
  const counts = toCounts(problemTiles(problem));
  const shapes = evaluation.bestDiscards.map((t) => classifyTile(t, counts));
  return shapes.reduce((a, b) => (SHAPES.indexOf(b) < SHAPES.indexOf(a) ? b : a));
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
 * random hands, so this gives up after `maxAttempts` and returns null.
 */
export function generateProblemOfCategory(
  category: Shape,
  options: Omit<GeneratorOptions, "accept" | "maxAttempts"> & { maxAttempts?: number } = {},
): Problem | null {
  try {
    return generateProblem({
      maxAttempts: 1500,
      ...options,
      accept: (p) => problemCategory(p) === category,
    });
  } catch {
    return null;
  }
}
