import { generateBalancedProblem, generateClearProblem, generateProblemOfCategory } from "@/lib/mahjong";
import type { ProblemRequest } from "@/lib/problemSource";

/**
 * Generates problems off the main thread: finding a hand of a given type can
 * take hundreds of milliseconds, which would otherwise freeze the UI.
 */
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<{ id: number; request: ProblemRequest }>) => void) | null;
  postMessage: (message: unknown) => void;
};

ctx.onmessage = (e) => {
  const { id, request } = e.data;
  const range = { minShanten: request.minShanten, maxShanten: request.maxShanten };
  const problem =
    request.kind === "category" && request.category
      ? (generateProblemOfCategory(request.category, range) ?? null)
      : request.kind === "clear"
        ? generateClearProblem(range)
        : generateBalancedProblem(range);
  ctx.postMessage({ id, problem });
};
