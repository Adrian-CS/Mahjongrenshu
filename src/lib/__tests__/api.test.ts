import { describe, expect, it } from "vitest";
import { mergeLessonProgress } from "../api";

const r = (correct: number, completed: boolean, updatedAt: string) => ({ correct, answered: 6, completed, updatedAt });

describe("mergeLessonProgress", () => {
  it("keeps the most recent result per lesson", () => {
    const local = { a: r(2, true, "2026-10-01T00:00:00Z"), b: r(5, true, "2026-10-05T00:00:00Z") };
    const server = { a: r(4, true, "2026-10-03T00:00:00Z"), b: r(1, true, "2026-10-02T00:00:00Z"), c: r(3, false, "2026-10-01T00:00:00Z") };
    const merged = mergeLessonProgress(local, server);
    expect(merged.a.correct).toBe(4);
    expect(merged.b.correct).toBe(5);
    expect(merged.c.correct).toBe(3);
  });

  it("never loses a completed lesson", () => {
    const merged = mergeLessonProgress({ a: r(1, true, "2026-10-01T00:00:00Z") }, { a: r(0, false, "2026-10-09T00:00:00Z") });
    expect(merged.a.completed).toBe(true);
    expect(merged.a.correct).toBe(0);
  });
});
