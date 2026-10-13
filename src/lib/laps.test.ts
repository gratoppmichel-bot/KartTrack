import { describe, expect, it } from "vitest";
import { formatLapTime, lapStats, parseLapTime } from "./laps";

describe("parseLapTime", () => {
  it("parses m:ss.mmm, ss.mmm and comma decimals", () => {
    expect(parseLapTime("1:02.345")).toBe(62_345);
    expect(parseLapTime("62.345")).toBe(62_345);
    expect(parseLapTime("62,345")).toBe(62_345);
    expect(parseLapTime(" 45.1 ")).toBe(45_100);
    expect(parseLapTime("45")).toBe(45_000);
  });

  it("rejects garbage and out-of-range values", () => {
    expect(parseLapTime("")).toBeNull();
    expect(parseLapTime("abc")).toBeNull();
    expect(parseLapTime("1:75.000")).toBeNull(); // seconds must be < 60 after a minute part
    expect(parseLapTime("5.000")).toBeNull(); // under 10 s
    expect(parseLapTime("11:00.000")).toBeNull(); // over 10 min
  });
});

describe("formatLapTime", () => {
  it("formats with and without minutes", () => {
    expect(formatLapTime(62_345)).toBe("1:02.345");
    expect(formatLapTime(45_120)).toBe("45.120");
    expect(formatLapTime(60_000)).toBe("1:00.000");
  });

  it("round-trips through parseLapTime", () => {
    for (const ms of [10_000, 45_120, 62_345, 125_007, 599_999]) {
      expect(parseLapTime(formatLapTime(ms))).toBe(ms);
    }
  });
});

describe("lapStats", () => {
  it("returns null for no laps", () => {
    expect(lapStats([])).toBeNull();
  });

  it("computes best, average and consistency", () => {
    expect(lapStats([62_345, 61_870, 61_512])).toEqual({ best: 61_512, avg: 61_909, consistency: 341 });
  });

  it("has zero spread for identical laps", () => {
    expect(lapStats([50_000, 50_000])?.consistency).toBe(0);
  });
});
