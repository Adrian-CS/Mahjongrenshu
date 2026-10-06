import { describe, expect, it } from "vitest";
import { evaluateHand } from "../evaluator";
import { explain } from "../explain";
import { generateProblem, seededRng } from "../generator";
import { problemTiles } from "../review";
import { parseHand } from "../tiles";

const problemOf = (notation: string) => {
  const tiles = parseHand(notation);
  return { hand: tiles.slice(0, 13), draw: tiles[13] };
};
const t = (s: string) => parseHand(s)[0];

describe("explain", () => {
  it("explains a correct cut of an isolated honor", () => {
    const p = problemOf("234m789p111z45s79s5z");
    const e = explain(p, evaluateHand(problemTiles(p)), t("5z"));
    expect(e.correct).toBe(true);
    expect(e.form).toBe("standard");
    expect(e.points[0]).toContain("Haku");
    expect(e.points.join(" ")).toContain("honor aislado");
  });

  it("explains a discard that breaks a needed block", () => {
    const p = problemOf("234m789p111z45s79s5z");
    const e = explain(p, evaluateHand(problemTiles(p)), t("2m"));
    expect(e.correct).toBe(false);
    expect(e.points[0]).toContain("empeora la mano");
    expect(e.points[0]).toContain("secuencia completa");
  });

  it("lists the tiles lost by a worse discard of equal shanten", () => {
    // Cutting 5s (breaking the 4-5s ryanmen) instead of the floating honor.
    const p = problemOf("234m789p111z45s79s5z");
    const ev = evaluateHand(problemTiles(p));
    const e = explain(p, ev, t("5s"));
    expect(e.chosen.shanten).toBe(e.optimal.shanten);
    expect(e.points[0]).toContain("aceptas 24 tiles");
    expect(e.onlyOptimal.length).toBeGreaterThan(0);
    expect(e.points[1]).toContain("Lo que pierdes");
  });

  it("reads chiitoitsu hands as pairs", () => {
    const p = problemOf("1133m5577p99s1z2z3z4z");
    const e = explain(p, evaluateHand(problemTiles(p)), t("4z"));
    expect(e.form).toBe("chiitoitsu");
    expect(e.reading.filter((b) => b.kind === "toitsu")).toHaveLength(5);
  });

  it("produces an explanation for every discard of random hands", () => {
    const rng = seededRng(4);
    for (let i = 0; i < 40; i++) {
      const p = generateProblem({ rng });
      const ev = evaluateHand(problemTiles(p));
      for (const o of ev.options) {
        const e = explain(p, ev, o.discard);
        expect(e.points.length).toBeGreaterThan(0);
        expect(e.points.every((x) => !x.includes("undefined"))).toBe(true);
      }
    }
  });
});
