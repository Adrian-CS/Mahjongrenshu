import { describe, expect, it } from "vitest";
import { calculateUkeire, evaluateHand, findOption } from "../evaluator";
import { generateProblem, seededRng } from "../generator";
import { calculateShanten } from "../shanten";
import { parseHand, tileToString, toCounts } from "../tiles";

const t = (s: string) => parseHand(s)[0];
const names = (tiles: number[]) => tiles.map(tileToString);

describe("calculateUkeire", () => {
  it("counts a ryanmen wait as 8 tiles", () => {
    const u = calculateUkeire(toCounts(parseHand("123m456p789s11z23s")));
    expect(names(u.tiles.map((x) => x.tile))).toEqual(["1s", "4s"]);
    // 1s: 4 copies unseen; 4s: 4 copies unseen (7-8-9s doesn't use it).
    expect(u.total).toBe(8);
  });

  it("subtracts copies visible in the hand", () => {
    // Kanchan 1-3s waiting on 2s, while holding none: 4 left. 789s holds none.
    const u = calculateUkeire(toCounts(parseHand("123m456p789s11z13s")));
    expect(u.tiles).toEqual([{ tile: t("2s"), remaining: 4 }]);
  });

  it("counts the visible 14th tile as seen", () => {
    const hand13 = toCounts(parseHand("123m456p789s11z23s"));
    const visible = toCounts(parseHand("123m456p789s11z23s4s"));
    expect(calculateUkeire(hand13, visible).total).toBe(7);
  });
});

describe("evaluateHand", () => {
  it("cuts the floating honor and values ryanmen over kanchan", () => {
    // 234m 789p 111z + 45s 79s + 5z: 3 melds, two partials, no pair.
    const ev = evaluateHand(parseHand("234m789p111z45s79s5z"));
    expect(ev.shanten).toBe(1);
    expect(names(ev.bestDiscards)).toEqual(["5z"]);
    // 3s 6s 8s (4 each) + pairing 4s 5s 7s 9s (3 each).
    expect(findOption(ev, t("5z")).ukeire.total).toBe(24);
    // Breaking the ryanmen loses more than breaking the kanchan.
    expect(findOption(ev, t("5s")).ukeire.total).toBeLessThan(findOption(ev, t("7s")).ukeire.total);
  });

  it("discards the isolated honor from a tenpai-ready hand", () => {
    const ev = evaluateHand(parseHand("123m456p789s11z23s5z"));
    expect(ev.shanten).toBe(0);
    expect(names(ev.bestDiscards)).toEqual(["5z"]);
    expect(findOption(ev, t("5z")).ukeire.total).toBe(8);
  });

  it("returns one option per distinct tile, sorted best first", () => {
    const ev = evaluateHand(parseHand("112233m456p789s11z"));
    const kinds = new Set(parseHand("112233m456p789s11z"));
    expect(ev.options).toHaveLength(kinds.size);
    for (let i = 1; i < ev.options.length; i++) {
      const [a, b] = [ev.options[i - 1], ev.options[i]];
      expect(a.shanten < b.shanten || (a.shanten === b.shanten && a.ukeire.total >= b.ukeire.total)).toBe(true);
    }
  });

  it("rejects hands that are not 14 tiles", () => {
    expect(() => evaluateHand(parseHand("123m"))).toThrow();
  });

  it("best discard shanten equals the 14-tile hand shanten", () => {
    const rng = seededRng(7);
    for (let i = 0; i < 50; i++) {
      const p = generateProblem({ rng });
      const tiles = [...p.hand, p.draw];
      expect(evaluateHand(tiles).shanten).toBe(calculateShanten(toCounts(tiles)));
    }
  });
});
