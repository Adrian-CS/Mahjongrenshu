import { describe, expect, it } from "vitest";
// syanten is an independent MIT-licensed implementation used only as a test oracle.
import syanten from "syanten";
import { calculateShanten, chiitoitsuShanten, kokushiShanten, standardShanten } from "../shanten";
import { drawTiles, seededRng } from "../generator";
import { Counts, parseHand, toCounts } from "../tiles";

const shantenOf = (notation: string) => calculateShanten(toCounts(parseHand(notation)));

function toSyanten(counts: Counts): syanten.HaiArr {
  return [counts.slice(0, 9), counts.slice(9, 18), counts.slice(18, 27), counts.slice(27, 34)] as syanten.HaiArr;
}

describe("calculateShanten", () => {
  it.each([
    ["123m456p789s1122z", 0], // tenpai, shanpon
    ["123m456p789s11z23s", 0], // tenpai, ryanmen 1-4s
    ["123m456p789s1234z", 2], // three melds + four isolated honors
    ["123m456p789s11z22z3z", 0], // 14 tiles: discard 3z for shanpon tenpai
    ["123m456p789s11z222z", -1], // complete 14-tile hand
    ["19m19p19s1234567z", 0], // kokushi 13-sided tenpai
    ["19m19p19s12345677z", -1], // kokushi complete
    ["1122m3344p5566s7z", 0], // chiitoitsu tenpai
    ["1122m3344p5566s77z", -1], // chiitoitsu complete
    ["1111m2222p3333s4z", 2], // quads don't count as two pairs for chiitoitsu
    ["147m258p369s1234z", 6],
  ])("%s -> %i", (hand, expected) => {
    expect(shantenOf(hand)).toBe(expected);
  });

  it("separates the three hand shapes", () => {
    const c = toCounts(parseHand("19m19p19s1234567z"));
    expect(kokushiShanten(c)).toBe(0);
    expect(chiitoitsuShanten(c)).toBe(6);
    expect(standardShanten(c)).toBeGreaterThan(0);
  });

  it("matches the syanten oracle on random 13- and 14-tile hands", () => {
    const rng = seededRng(12345);
    for (let i = 0; i < 2000; i++) {
      const n = i % 2 === 0 ? 13 : 14;
      const counts = toCounts(drawTiles(n, rng));
      const oracle = toSyanten(counts);
      expect(standardShanten(counts)).toBe(syanten.syanten(oracle));
      expect(chiitoitsuShanten(counts)).toBe(syanten.syanten7(oracle));
      expect(kokushiShanten(counts)).toBe(syanten.syanten13(oracle));
    }
  });

  it("matches the oracle on single-suit (chinitsu) hands", { timeout: 60_000 }, () => {
    const rng = seededRng(99);
    // The oracle is slow on single-suit hands (~90ms each), so keep this small.
    for (let i = 0; i < 120; i++) {
      // Pick 14 tiles from the 36 manzu tiles only.
      const pool = Array.from({ length: 36 }, (_, k) => Math.floor(k / 4));
      for (let k = 0; k < 14; k++) {
        const j = k + Math.floor(rng() * (pool.length - k));
        [pool[k], pool[j]] = [pool[j], pool[k]];
      }
      const counts = toCounts(pool.slice(0, i % 2 === 0 ? 13 : 14));
      expect(standardShanten(counts)).toBe(syanten.syanten(toSyanten(counts)));
    }
  });
});
