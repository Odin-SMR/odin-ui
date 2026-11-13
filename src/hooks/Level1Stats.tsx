import { useEffect, useState } from "react";
import { z } from "zod";
import { FREQMODE_COLOURS, FREQMODE_INFO_TEXT } from "../definitions";

const integerRangeError = "Timeline counts cannot be displayed exactly outside the JavaScript safe integer range.";
const exactInteger = z.number().int().refine(Number.isSafeInteger, integerRangeError);
const calendarYear = exactInteger.refine((year) => year >= 1 && year <= 9999, "The observation year must be within 1–9999.");
const calendarMonth = exactInteger.refine((month) => month >= 1 && month <= 12, "Timeline months must be within 1–12.");
const ValuePair = z.tuple([exactInteger, exactInteger.nullable()]);
const DataSchema = z.record(z.array(ValuePair));
function validatePeriods(axes: number[], data: Record<string, [number, number | null][]>, ctx: z.RefinementCtx, axisName: string) {
  const axisPeriods = new Set<number>();
  axes.forEach((period, index) => {
    if (axisPeriods.has(period)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [axisName, index], message: "Timeline axes contain a duplicate period." });
    axisPeriods.add(period);
  });
  for (const [mode, pairs] of Object.entries(data)) {
    const observed = new Set<number>();
    pairs.forEach(([period], index) => {
      if (observed.has(period)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["Data", mode, index, 0], message: "Timeline data contain a duplicate period." });
      if (!axisPeriods.has(period)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["Data", mode, index, 0], message: "Timeline data contain a period outside the declared axes." });
      observed.add(period);
    });
  }
}
export const totalTimelineSchema = z.object({ Data: DataSchema, Years: z.array(calendarYear) })
  .superRefine((data, ctx) => validatePeriods(data.Years, data.Data, ctx, "Years"));
export const yearTimelineSchema = z.object({ Data: DataSchema, Months: z.array(calendarMonth), Year: calendarYear })
  .superRefine((data, ctx) => validatePeriods(data.Months, data.Data, ctx, "Months"));
export type TotalResponse = z.infer<typeof totalTimelineSchema>;
export type YearResponse = z.infer<typeof yearTimelineSchema>;
export type TimelineResponse = TotalResponse | YearResponse;
export type TimelineCount = number | null;
export type TimelineSegment = { group: number; key: string; value: number; start: number; end: number };
export type TimelineMissing = { group: number; key: string };
export type TimelineStack = {
  segments: TimelineSegment[]; missing: TimelineMissing[];
  domain: [number, number]; error: string | null;
};

export const timelineGroups = (data: TimelineResponse) => "Years" in data ? data.Years : data.Months;
export function timelineCount(data: TimelineResponse, group: number, key: string): TimelineCount {
  const pair = data.Data[key]?.find(([period]) => period === group);
  // An absent period is zero; a present SQL all-NULL SUM is still NULL.
  return pair === undefined ? 0 : pair[1];
}
export function timelineModeInfo(key: string) {
  const info = /^-?\d+$/.test(key) ? FREQMODE_INFO_TEXT[Number(key)] : undefined;
  return {
    label: key === "null" ? "Unspecified frequency mode" : key,
    freq: info?.[0] ?? "Unknown", spec: info?.[1] ?? "Unknown",
    color: Object.prototype.hasOwnProperty.call(FREQMODE_COLOURS, key) ? FREQMODE_COLOURS[key] : "#666666",
  };
}

/** Separate positive/negative stacks; NULL is excluded, never replaced with zero. */
export function timelineStack(groups: number[], keys: string[], count: (group: number, key: string) => TimelineCount): TimelineStack {
  const segments: TimelineSegment[] = [], missing: TimelineMissing[] = [];
  const limit = BigInt(Number.MAX_SAFE_INTEGER);
  let min = 0, max = 0;
  for (const group of groups) {
    let positive = 0n, negative = 0n;
    for (const key of keys) {
      const value = count(group, key);
      if (value === null) { missing.push({ group, key }); continue; }
      if (!Number.isSafeInteger(value)) return { segments: [], missing: [], domain: [0, 1], error: integerRangeError };
      const start = value < 0 ? negative : positive;
      const end = start + BigInt(value);
      if (end > limit || end < -limit) return {
        segments: [], missing: [], domain: [0, 1],
        error: "Timeline stacked totals cannot be displayed exactly outside the JavaScript safe integer range.",
      };
      if (value < 0) negative = end; else positive = end;
      segments.push({ group, key, value, start: Number(start), end: Number(end) });
    }
    min = Math.min(min, Number(negative)); max = Math.max(max, Number(positive));
  }
  return { segments, missing, domain: min === 0 && max === 0 ? [0, 1] : [min, max], error: null };
}

const emptySeries = (year: number | null): TimelineResponse => year === null
  ? { Data: {}, Years: [] } : { Data: {}, Months: [], Year: year };
type RequestState = { year: number | null; series: TimelineResponse; loading: boolean; error: string | null };

export function useFrequencyModeData(year: number | null) {
  const [state, setState] = useState<RequestState>({ year, series: emptySeries(year), loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    setState({ year, series: emptySeries(year), loading: true, error: null });
    const getData = async () => {
      try {
        if (year !== null && !Number.isSafeInteger(year)) throw new Error("The observation year must be an exact integer.");
        const response = await fetch(year === null ? "/rest_api/v5/statistics/freqmode/timeline/"
          : `/rest_api/v5/statistics/freqmode/timeline/?year=${year}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Statistics request failed (HTTP ${response.status}).`);
        let json: unknown;
        try { json = await response.json(); }
        catch { throw new Error("Statistics returned an unreadable response."); }
        const result = (year === null ? totalTimelineSchema : yearTimelineSchema).safeParse(json);
        if (!result.success) throw new Error(result.error.issues.some((issue) => issue.message === integerRangeError)
          ? integerRangeError : "Statistics returned an unsupported timeline format.");
        if (year !== null && "Year" in result.data && result.data.Year !== year) throw new Error("Statistics returned a different observation year.");
        if (!controller.signal.aborted) setState({ year, series: result.data, loading: false, error: null });
      } catch (error) {
        if (!controller.signal.aborted) setState({ year, series: emptySeries(year), loading: false,
          error: error instanceof Error ? error.message : "Statistics could not be loaded." });
      }
    };
    void getData();
    return () => controller.abort();
  }, [year]);
  return Object.is(state.year, year) ? state : { year, series: emptySeries(year), loading: true, error: null };
}
