import { describe, expect, it } from "vitest";
import { frequencyAxis } from "./scientificValues";

describe("frequency axis display precision", () => {
  it("keeps MHz-spaced absolute ticks distinct near 544 GHz", () => {
    const axis = frequencyAxis(544_290_000_000, 544_310_000_000, 558);
    expect(axis.reference).toBeNull();
    expect(axis.ticks.length).toBeGreaterThanOrEqual(3);
    expect(new Set(axis.ticks.map((tick) => tick.label)).size).toBe(axis.ticks.length);
    // These integer MHz fixtures are represented exactly by the displayed labels.
    expect(axis.ticks.map((tick) => Number(tick.label))).toEqual(axis.ticks.map((tick) => tick.value));
  });

  it.each([238, 308])("uses an explicit reference for a narrow 12Hz window in a %ipx plotting area", (width) => {
    const axis = frequencyAxis(544_299_999_994, 544_300_000_006, width);
    expect(axis.reference).toBe(544_299_999_994);
    expect(axis.ticks.map((tick) => tick.label)).toEqual(["0", "3", "6", "9", "12"]);
    expect(axis.ticks.map((tick) => Number(tick.label) + axis.reference!)).toEqual(axis.ticks.map((tick) => tick.value));
  });
});
