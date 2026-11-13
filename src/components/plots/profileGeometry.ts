import { finite } from "./scientificValues";

export type AltitudeBin = { lower: number; upper: number };

/** Midpoint display bins, not averaging-kernel resolution or supplied bounds.
 * Use all finite grid heights (including missing VMR), keep original level indices,
 * and never assign thickness to a duplicate or solitary altitude.
 */
export function altitudeBins(altitudes: readonly unknown[]): (AltitudeBin | null)[] {
  const occurrences = new Map<number, number>();
  for (const altitude of altitudes) if (finite(altitude)) occurrences.set(altitude, (occurrences.get(altitude) ?? 0) + 1);
  const heights = [...occurrences.keys()].sort((a, b) => a - b);
  const bins = new Map<number, AltitudeBin>();
  if (heights.length > 1) heights.forEach((height, index) => {
    if (occurrences.get(height) !== 1) return;
    const before = heights[index - 1], after = heights[index + 1];
    const lower = before === undefined ? height - (after - height) / 2 : before / 2 + height / 2;
    const upper = after === undefined ? height + (height - before) / 2 : height / 2 + after / 2;
    if (finite(lower) && finite(upper) && lower < upper) bins.set(height, { lower, upper });
  });
  return altitudes.map((altitude) => finite(altitude) ? bins.get(altitude) ?? null : null);
}

export function ppmv(value: unknown): number | null {
  const converted = finite(value) ? value * 1e6 : null;
  return finite(converted) ? converted : null;
}

export function errorPpmv(value: unknown): number | null {
  return finite(value) && value >= 0 ? ppmv(value) : null;
}
