import { describe, expect, it } from "vitest";
import { formatHand, parseHand, tileToString } from "../tiles";

describe("tiles", () => {
  it("parses and formats compact notation", () => {
    const tiles = parseHand("123m 406p 789s 17z");
    expect(tiles.map(tileToString)).toEqual(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "1z", "7z"]);
    expect(formatHand(tiles)).toBe("123m456p789s17z");
  });

  it("rejects invalid notation", () => {
    expect(() => parseHand("8z")).toThrow();
    expect(() => parseHand("123")).toThrow();
    expect(() => parseHand("1x")).toThrow();
  });
});
