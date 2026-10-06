import { describe, expect, it } from "vitest";
import { readHand } from "../decomposition";
import { drawTiles, seededRng } from "../generator";
import { standardShanten } from "../shanten";
import { parseHand, tileToString, toCounts } from "../tiles";

const read = (hand: string) => readHand(toCounts(parseHand(hand)));
const kinds = (hand: string) => read(hand).blocks.map((b) => `${b.kind}:${b.tiles.map(tileToString).join("")}`);

describe("readHand", () => {
  it("reads melds, head, partials and floaters", () => {
    expect(kinds("123m456p11z45s79s5z")).toEqual([
      "shuntsu:1m2m3m",
      "shuntsu:4p5p6p",
      "ryanmen:4s5s",
      "kanchan:7s9s",
      "toitsu:1z1z",
      "floating:5z",
    ]);
    const r = read("123m456p11z45s79s5z");
    expect(r.shanten).toBe(1);
    expect(r.melds).toBe(2);
    expect(r.excessBlocks).toBe(0);
  });

  it("names edge waits penchan", () => {
    expect(kinds("12m")).toEqual(["penchan:1m2m"]);
    expect(kinds("89p")).toEqual(["penchan:8p9p"]);
    expect(kinds("23s")).toEqual(["ryanmen:2s3s"]);
  });

  it("counts blocks beyond 4 melds + head as excess", () => {
    // 2 melds + head + ryanmen + kanchan + penchan: one partial too many.
    const r = read("123m456p11z45s79s12m");
    expect(r.excessBlocks).toBe(1);
  });

  it("agrees with the shanten engine on random hands", () => {
    const rng = seededRng(77);
    for (let i = 0; i < 300; i++) {
      const counts = toCounts(drawTiles(i % 2 ? 13 : 14, rng));
      expect(readHand(counts).shanten).toBe(standardShanten(counts));
    }
  });
});
