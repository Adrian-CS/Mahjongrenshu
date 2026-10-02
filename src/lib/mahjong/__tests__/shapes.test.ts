import { describe, expect, it } from "vitest";
import { classifyTile } from "../shapes";
import { parseHand, toCounts } from "../tiles";

const shapeIn = (hand: string, tile: string) => classifyTile(parseHand(tile)[0], toCounts(parseHand(hand)));

describe("classifyTile", () => {
  it.each([
    ["1z5m", "1z", "isolated-honor"],
    ["11z5m", "1z", "pair"],
    ["9m5p", "9m", "isolated-terminal"],
    ["5m5p", "5m", "isolated-simple"],
    ["13m", "1m", "kanchan"],
    ["46p", "6p", "kanchan"],
    ["12s", "1s", "penchan"],
    ["12s", "2s", "penchan"],
    ["89m", "8m", "penchan"],
    ["23m", "2m", "ryanmen"],
    ["78p", "7p", "ryanmen"],
    ["55s", "5s", "pair"],
    ["555s", "5s", "triplet"],
    ["345m", "4m", "sequence"],
    ["345m", "3m", "sequence"],
    ["3345m", "3m", "sequence"],
  ])("%s: %s is %s", (hand, tile, expected) => {
    expect(shapeIn(hand, tile)).toBe(expected);
  });

  it("does not connect tiles across suits", () => {
    expect(shapeIn("9m1p", "9m")).toBe("isolated-terminal");
    expect(shapeIn("8m1p", "8m")).toBe("isolated-simple");
  });
});
