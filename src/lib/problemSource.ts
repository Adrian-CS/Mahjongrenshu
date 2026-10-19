import { Problem, Shape, generateBalancedProblem, generateClearProblem, generateProblemOfCategory } from "@/lib/mahjong";

export interface ProblemRequest {
  /** balanced: type follows CATEGORY_MIX; category: that type or null; clear: any clear problem. */
  kind: "balanced" | "category" | "clear";
  category?: Shape;
  minShanten: number;
  maxShanten: number;
}

function generateHere(request: ProblemRequest): Problem | null {
  const range = { minShanten: request.minShanten, maxShanten: request.maxShanten };
  if (request.kind === "category" && request.category) return generateProblemOfCategory(request.category, range);
  return request.kind === "clear" ? generateClearProblem(range) : generateBalancedProblem(range);
}

/**
 * Problem generation in a web worker, with a synchronous fallback where
 * workers aren't available (or fail to load).
 */
export class ProblemSource {
  private worker: Worker | null = null;
  private nextId = 0;
  private pending = new Map<number, { resolve: (p: Problem | null) => void; request: ProblemRequest }>();

  constructor() {
    if (typeof Worker === "undefined") return;
    try {
      this.worker = new Worker(new URL("../workers/problems.worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (e: MessageEvent<{ id: number; problem: Problem | null }>) => {
        this.pending.get(e.data.id)?.resolve(e.data.problem);
        this.pending.delete(e.data.id);
      };
      this.worker.onerror = () => this.fallBack();
    } catch {
      this.worker = null;
    }
  }

  request(request: ProblemRequest): Promise<Problem | null> {
    if (!this.worker) return new Promise((resolve) => setTimeout(() => resolve(generateHere(request)), 0));
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, { resolve, request });
      this.worker!.postMessage({ id, request });
    });
  }

  /** The worker broke: answer what was pending here and stop using it. */
  private fallBack() {
    this.worker?.terminate();
    this.worker = null;
    for (const { resolve, request } of this.pending.values()) resolve(generateHere(request));
    this.pending.clear();
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
  }
}
