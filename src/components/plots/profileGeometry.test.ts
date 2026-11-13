import { describe, expect, it } from "vitest";
import { altitudeBins, errorPpmv, ppmv } from "./profileGeometry";

describe("altitude display bins", () => {
  it("uses irregular altitude midpoints with half-spacing endpoint extrapolation", () => {
    expect(altitudeBins([1000, 3000, 7000])).toEqual([
      { lower: 0, upper: 2000 }, { lower: 2000, upper: 5000 }, { lower: 5000, upper: 9000 },
    ]);
  });
  it("derives geometry from heights without reordering source identity", () => {
    expect(altitudeBins([7000, 1000, 3000])).toEqual([
      { lower: 5000, upper: 9000 }, { lower: 0, upper: 2000 }, { lower: 2000, upper: 5000 },
    ]);
  });
  it("leaves missing and duplicate heights unbinned without merging them", () => {
    expect(altitudeBins([1000, null, 3000, 3000, 7000, NaN])).toEqual([
      { lower: 0, upper: 2000 }, null, null, null, { lower: 5000, upper: 9000 }, null,
    ]);
    expect(altitudeBins([3000])).toEqual([null]);
    expect(altitudeBins([3000, 3000])).toEqual([null, null]);
  });
  it("never produces infinite bounds from finite extremes", () => {
    expect(altitudeBins([-Number.MAX_VALUE, Number.MAX_VALUE])).toEqual([null, null]);
  });
});

describe("profile units and uncertainty", () => {
  it("preserves signed and zero VMR, but rejects negative and nonfinite error estimates", () => {
    expect(ppmv(-2e-6)).toBe(-2);
    expect(ppmv(0)).toBe(0);
    expect(errorPpmv(0)).toBe(0);
    expect(errorPpmv(2e-6)).toBe(2);
    for (const value of [-1e-6, NaN, Infinity, null, undefined]) expect(errorPpmv(value)).toBeNull();
    expect(ppmv(Number.MAX_VALUE)).toBeNull();
  });
});
