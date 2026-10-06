import { describe, expect, it } from "vitest";
import { LESSONS, lessonProblem } from "../lessons";
import { evaluateHand, findOption, parseHand, problemTiles, tileToString } from "../mahjong";

const tile = (s: string) => parseHand(s)[0];

describe("lessons", () => {
  it.each(LESSONS.map((l) => [l.id, l] as const))("%s: hand is valid and best discards match the engine", (_, lesson) => {
    const problem = lessonProblem(lesson);
    expect(problem.hand).toHaveLength(13);
    expect(problem.hand).toEqual([...problem.hand].sort((a, b) => a - b));
    const ev = evaluateHand(problemTiles(problem));
    expect(ev.bestDiscards.map(tileToString).sort()).toEqual([...lesson.best].sort());
  });

  it("has unique ids", () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });

  // Tile counts quoted in the explanations.
  const ukeire = (id: string, discard: string) => {
    const lesson = LESSONS.find((l) => l.id === id)!;
    const ev = evaluateHand(problemTiles(lessonProblem(lesson)));
    return findOption(ev, tile(discard));
  };

  it.each([
    ["isolated-honor", "5z", 24, 1],
    ["kanchan-vs-penchan", "1s", 12, 1],
    ["kanchan-vs-penchan", "7p", 8, 1],
    ["ryanmen-vs-kanchan", "9p", 16, 1],
    ["ryanmen-vs-kanchan", "6m", 12, 1],
    ["ryankan", "1m", 16, 1],
    ["ryankan", "3m", 12, 1],
    ["tenpai-wait", "7s", 8, 0],
    ["tenpai-wait", "4s", 4, 0],
    ["ryanmen-vs-shanpon", "5s", 7, 0],
    ["ryanmen-vs-shanpon", "6s", 4, 0],
    ["nobetan", "7z", 9, 0],
    ["chiitoitsu", "4z", 9, 1],
  ] as const)("%s: cutting %s gives %i tiles at %i-shanten", (id, discard, total, shanten) => {
    const o = ukeire(id, discard);
    expect(o.ukeire.total).toBe(total);
    expect(o.shanten).toBe(shanten);
  });

  it("quotes the right waits", () => {
    expect(ukeire("tenpai-wait", "4s").ukeire.tiles.map((u) => tileToString(u.tile))).toEqual(["6s"]);
    expect(ukeire("nobetan", "7z").ukeire.tiles.map((u) => tileToString(u.tile))).toEqual(["3s", "6s", "9s"]);
    expect(ukeire("ryanmen-vs-shanpon", "5s").ukeire.tiles.map((u) => tileToString(u.tile))).toEqual(["4s", "7s"]);
    expect(ukeire("isolated-honor", "5z").ukeire.tiles.map((u) => tileToString(u.tile))).toEqual(["3s", "4s", "5s", "6s", "7s", "8s", "9s"]);
    const names = (id: string, d: string) => ukeire(id, d).ukeire.tiles.map((u) => tileToString(u.tile));
    expect(names("kuttsuki", "9p")).toEqual(expect.arrayContaining(["4p", "5p", "6p", "7p", "8p"]));
    expect(names("kuttsuki", "6p")).toEqual(expect.arrayContaining(["7p", "8p", "9p"]));
    expect(ukeire("kuttsuki", "6p").ukeire.total).toBeLessThan(ukeire("kuttsuki", "9p").ukeire.total);
    expect(ukeire("kuttsuki", "4m").ukeire.total).toBeLessThan(ukeire("kuttsuki", "6p").ukeire.total);
    expect(ukeire("kanchan-vs-penchan", "1s").ukeire.tiles.map((u) => tileToString(u.tile))).toEqual(["8p", "3s", "6s"]);
  });
});
