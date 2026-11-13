import { describe, expect, it } from "vitest";
import { hasStartCoordinates, normalizeLongitude } from "./mapCoordinates";

describe("scan start coordinates", () => {
  it.each([null, undefined, NaN, Infinity])("omits a missing or nonfinite coordinate (%s) without fabricating zero", (value) => {
    expect(hasStartCoordinates({ scanid: 1, lat: value, lon: 0 })).toBe(false);
    expect(hasStartCoordinates({ scanid: 1, lat: 0, lon: value })).toBe(false);
  });
  it("retains a genuine zero and rejects out-of-range latitude", () => {
    expect(hasStartCoordinates({ scanid: 0, lat: 0, lon: 0 })).toBe(true);
    expect(hasStartCoordinates({ scanid: 1, lat: 91, lon: 1 })).toBe(false);
    expect(hasStartCoordinates({ scanid: 1, lat: -90, lon: 360 })).toBe(true);
  });
  it.each([[0, 0], [360, 0], [540, -180], [-540, -180], [-721, -1], [400, 40]])("normalizes %s° longitude to %s° for the map only", (source, expected) => {
    expect(normalizeLongitude(source)).toBe(expected);
  });
});
