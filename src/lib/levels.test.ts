import { describe, expect, it } from "vitest";
import { levelInfo } from "./levels";

describe("levelInfo", () => {
  it("starts at level 1", () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, floor: 0, next: 50, progress: 0 });
  });

  it("moves up exactly at the thresholds 50, 200, 450", () => {
    expect(levelInfo(49).level).toBe(1);
    expect(levelInfo(50).level).toBe(2);
    expect(levelInfo(199).level).toBe(2);
    expect(levelInfo(200).level).toBe(3);
    expect(levelInfo(450).level).toBe(4);
  });

  it("reports progress inside a level", () => {
    // level 2 spans 50..200 -> 125 XP is half way
    expect(levelInfo(125).progress).toBeCloseTo(0.5);
  });
});
