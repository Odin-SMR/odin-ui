export const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Display bounds only; source samples are never changed. */
export function displayDomain(values: number[]): [number, number] {
  if (!values.length) return [0, 1];
  let low = Infinity, high = -Infinity;
  for (const value of values) { low = Math.min(low, value); high = Math.max(high, value); }
  if (low === high) {
    const padding = Math.max(Math.abs(low) * 1e-6, 0.5);
    return [low - padding, high + padding];
  }
  return [low, high];
}

// Stored bounds are 1-based and inclusive. Never infer a subband boundary.
export function bandMembership(bounds: (number | null)[][] | undefined, channels: number) {
  if (!bounds || bounds.length !== 2 || !bounds[0].length
    || bounds[0].length !== bounds[1].length || !channels) return null;
  const bands = Array<number>(channels).fill(-1);
  for (let band = 0; band < bounds[0].length; band++) {
    const start = bounds[0][band], end = bounds[1][band];
    if (start === -1 && end === -1) continue;
    if (!finite(start) || !finite(end) || !Number.isInteger(start) || !Number.isInteger(end)
      || start < 1 || end < start || end > channels) return null;
    for (let channel = start - 1; channel < end; channel++) {
      if (bands[channel] !== -1) return null;
      bands[channel] = band;
    }
  }
  return bands.every((band) => band >= 0) ? bands : null;
}

export const exactValue = (value: unknown, unit = "") =>
  finite(value) ? `${Object.is(value, -0) ? "-0" : String(value)}${unit}` : "Missing";

type FrequencyTick = { value: number; label: string };

/** Axis rounding follows the tick interval, independently of source precision. */
function frequencyTickLabel(value: number, step: number) {
  if (value === 0) return "0";
  const stepExponent = Math.floor(Math.log10(step));
  if (Math.abs(value) >= 1e6 || Math.abs(value) < 1e-3) {
    const decimals = Math.max(0, Math.min(16, Math.floor(Math.log10(Math.abs(value))) - stepExponent + 1));
    const [mantissa, exponent] = value.toExponential(decimals).split("e");
    return `${Number(mantissa)}e${Number(exponent)}`;
  }
  return String(Number(value.toFixed(Math.max(0, Math.min(20, 1 - stepExponent)))));
}

/** Keep 12px frequency labels distinct and spaced; narrow ranges may share an explicit origin. */
export function frequencyAxis(minimum: number, maximum: number, plotWidth: number) {
  const span = maximum - minimum;
  const build = (count: number, reference: number): FrequencyTick[] => {
    const step = span / (count - 1);
    return Array.from({ length: count }, (_, index) => {
      const value = index === count - 1 ? maximum : minimum + index * step;
      return { value, label: frequencyTickLabel(value - reference, step) };
    });
  };
  const fits = (ticks: FrequencyTick[]) => {
    if (new Set(ticks.map((tick) => tick.label)).size !== ticks.length) return false;
    let previousEnd = -Infinity;
    return ticks.every((tick, index) => {
      // Conservative text bounds for numeric Roboto labels at 12px; no sample is rounded here.
      const labelWidth = tick.label.length * 7.5;
      const position = (tick.value - minimum) / span * plotWidth;
      const start = index === 0 ? position : index === ticks.length - 1 ? position - labelWidth : position - labelWidth / 2;
      const end = start + labelWidth;
      const clear = start >= 0 && end <= plotWidth && start >= previousEnd + 8;
      previousEnd = end;
      return clear;
    });
  };
  const choose = (reference: number) => {
    for (const count of [5, 4, 3, 2]) {
      const ticks = build(count, reference);
      if (fits(ticks)) return ticks;
    }
    return build(2, reference);
  };
  const absolute = choose(0);
  if (absolute.length >= 3 && fits(absolute)) return { reference: null, ticks: absolute };
  const relative = choose(minimum);
  if (minimum !== 0 && (relative.length > absolute.length || !fits(absolute))) return { reference: minimum, ticks: relative };
  return { reference: null, ticks: absolute };
}

export function saveJson(value: unknown, filename: string) {
  const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = objectUrl; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
