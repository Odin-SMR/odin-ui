import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  timelineCount, timelineModeInfo, timelineStack, totalTimelineSchema, useFrequencyModeData, yearTimelineSchema,
} from "./Level1Stats";

describe("retained timeline count contract", () => {
  it("keeps present NULL, true zero, signed counts and absent periods distinct", () => {
    const data = totalTimelineSchema.parse({ Years: [2015, 2016], Data: { "1": [[2015, null], [2016, 0]], "null": [[2015, -4]], "999": [[2015, 3]] } });
    expect(timelineCount(data, 2015, "1")).toBeNull();
    expect(timelineCount(data, 2016, "1")).toBe(0);
    expect(timelineCount(data, 2016, "999")).toBe(0);
    expect(timelineCount(data, 2015, "null")).toBe(-4);
    expect(data.Data).not.toHaveProperty("2");
  });
  it("preserves monthly NULL sums and the response year", () => {
    expect(yearTimelineSchema.parse({ Year: 2015, Months: [1, 2], Data: { "1": [[1, null], [2, -7]] } }).Data["1"]).toEqual([[1, null], [2, -7]]);
  });
  it("accepts sparse pairs and calendar years beyond the mission interval without changing their values", () => {
    const annual = totalTimelineSchema.parse({ Years: [1, 1999, 9999], Data: { "null": [[1, null]], "unknown": [[9999, -7]], "1": [[1999, 0]] } });
    expect(annual.Data["unknown"]).toEqual([[9999, -7]]);
    expect(timelineCount(annual, 1999, "null")).toBe(0);
    expect(yearTimelineSchema.safeParse({ Year: 9999, Months: [1, 6, 12], Data: { "unknown": [[12, null]] } }).success).toBe(true);
  });
  it.each([
    { name: "duplicate annual axes", schema: totalTimelineSchema, response: { Years: [2015, 2015], Data: {} } },
    { name: "duplicate annual pairs", schema: totalTimelineSchema, response: { Years: [2015], Data: { "1": [[2015, 10], [2015, 20]] } } },
    { name: "annual pair outside axes", schema: totalTimelineSchema, response: { Years: [2015], Data: { "1": [[2016, 10]] } } },
    { name: "annual pair with empty axes", schema: totalTimelineSchema, response: { Years: [], Data: { "1": [[2015, null]] } } },
    { name: "zero calendar year", schema: totalTimelineSchema, response: { Years: [0], Data: {} } },
    { name: "year beyond calendar range", schema: totalTimelineSchema, response: { Years: [10000], Data: {} } },
    { name: "duplicate monthly axes", schema: yearTimelineSchema, response: { Year: 2015, Months: [1, 1], Data: {} } },
    { name: "duplicate monthly pairs", schema: yearTimelineSchema, response: { Year: 2015, Months: [1], Data: { "null": [[1, null], [1, -7]] } } },
    { name: "monthly pair outside axes", schema: yearTimelineSchema, response: { Year: 2015, Months: [1], Data: { "999": [[2, 0]] } } },
    { name: "zero calendar month", schema: yearTimelineSchema, response: { Year: 2015, Months: [0], Data: {} } },
    { name: "thirteenth month", schema: yearTimelineSchema, response: { Year: 2015, Months: [13], Data: {} } },
    { name: "invalid response year", schema: yearTimelineSchema, response: { Year: -2015, Months: [1], Data: {} } },
  ])("rejects $name instead of selecting or hiding an arbitrary record", ({ schema, response }) => {
    expect(schema.safeParse(response).success).toBe(false);
  });
  it("separates positive/negative heights without cancellation or NULL zero-filling", () => {
    const data = { Years: [2015], Data: { "1": [[2015, 10]], "2": [[2015, -4]], "8": [[2015, -2]], "null": [[2015, null]], "999": [[2015, 0]] } } as const;
    const counts: Record<string, number | null> = Object.fromEntries(Object.entries(data.Data).map(([key, values]) => [key, values[0][1]]));
    const stack = timelineStack([2015], Object.keys(counts), (_, key) => counts[key]);
    expect(stack.domain).toEqual([-6, 10]);
    expect(stack.segments.find((segment) => segment.key === "8")).toMatchObject({ start: -4, end: -6, value: -2 });
    expect(stack.segments.some((segment) => segment.key === "null")).toBe(false);
    expect(stack.missing).toEqual([{ group: 2015, key: "null" }]);
    expect(stack.segments.find((segment) => segment.key === "999")?.value).toBe(0);
  });
  it("labels unknown and NULL modes safely while retaining known scientific descriptions", () => {
    expect(timelineModeInfo("1")).toEqual({ label: "1", freq: "501.180 - 501.580, 501.980 - 502.380", spec: "ClO, O3, N2O", color: "#E6E6FA" });
    expect(timelineModeInfo("0").freq).toBe("unclassified");
    expect(timelineModeInfo("null").label).toBe("Unspecified frequency mode");
    expect(timelineModeInfo("999")).toMatchObject({ label: "999", freq: "Unknown", spec: "Unknown" });
    expect(timelineModeInfo("unrecognized").freq).toBe("Unknown");
    expect(timelineModeInfo("constructor").color).toBe("#666666");
  });
  it.each(["9007199254740993", "-9007199254740993"])("rejects unsafe integer wire count %s after ordinary JSON parsing", (count) => {
    const wire = `{"Years":[2015],"Data":{"1":[[2015,${count}]]}}`;
    expect(totalTimelineSchema.safeParse(JSON.parse(wire)).success).toBe(false);
    expect(totalTimelineSchema.safeParse({ Years: [2015], Data: { "1": [[2015, Number.MAX_SAFE_INTEGER]] } }).success).toBe(true);
  });
  it("rejects unsafe cumulative stacks even when each count is independently safe", () => {
    const stack = timelineStack([2015], ["1", "2"], (_, key) => key === "1" ? Number.MAX_SAFE_INTEGER : 1);
    expect(stack.error).toContain("stacked totals cannot be displayed exactly");
    expect(stack.segments).toEqual([]);
    expect(timelineStack([2015], ["1"], () => -7).domain).toEqual([-7, 0]);
  });
});

let container: HTMLDivElement;
let root: Root;
function Harness({ year }: { year: number | null }) {
  const state = useFrequencyModeData(year);
  return <pre>{JSON.stringify(state)}</pre>;
}
const render = async (year: number | null) => {
  await act(async () => { root.render(<Harness year={year} />); await new Promise((resolve) => setTimeout(resolve, 10)); });
};
const state = () => JSON.parse(container.textContent ?? "{}");
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
describe("default PostgreSQL timeline loading and failure behavior", () => {
  it("uses the unchanged source route and keeps valid NULL/negative counts", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ Data: { "null": [[2015, null]], "999": [[2015, -3]], "1": [[2015, 0]] }, Years: [2015] })));
    vi.stubGlobal("fetch", fetch); await render(null);
    expect(fetch.mock.calls[0][0]).toBe("/rest_api/v5/statistics/freqmode/timeline/");
    expect(state()).toMatchObject({ loading: false, error: null, series: { Data: { "null": [[2015, null]], "999": [[2015, -3]], "1": [[2015, 0]] } } });
  });
  it("starts with genuine loading and no synthetic zero observation", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))); await render(null);
    expect(state()).toMatchObject({ loading: true, error: null, series: { Data: {}, Years: [] } });
  });
  it.each([503, 404])("completes HTTP %s failure with no fabricated records", async (code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: code }))); await render(null);
    expect(state()).toMatchObject({ loading: false, error: `Statistics request failed (HTTP ${code}).`, series: { Data: {}, Years: [] } });
  });
  it("handles transport and unreadable JSON failures without hanging", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network unavailable"))); await render(null);
    expect(state().error).toBe("Network unavailable"); expect(state().loading).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not JSON"))); await render(2015);
    expect(state().error).toBe("Statistics returned an unreadable response.");
  });
  it("shows explicit unavailability for unsafe wire counts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"Data":{"1":[[2015,9007199254740993]]},"Years":[2015]}')));
    await render(null);
    expect(state().loading).toBe(false); expect(state().error).toContain("safe integer range");
    expect(state().series.Data).toEqual({});
  });
  it("aborts stale year requests and never replaces the newer response", async () => {
    let resolveOld: (response: Response) => void = () => {};
    const fetch = vi.fn((url: string) => url.endsWith("2015") ? new Promise<Response>((resolve) => { resolveOld = resolve; }) : Promise.resolve(new Response(JSON.stringify({ Year: 2016, Months: [1], Data: { "1": [[1, 7]] } }))));
    vi.stubGlobal("fetch", fetch); await render(2015); await render(2016);
    expect(fetch.mock.calls[1][0]).toBe("/rest_api/v5/statistics/freqmode/timeline/?year=2016");
    await act(async () => { resolveOld(new Response(JSON.stringify({ Year: 2015, Months: [1], Data: { "1": [[1, 999]] } }))); await Promise.resolve(); });
    expect(state().series.Year).toBe(2016); expect(state().series.Data["1"]).toEqual([[1, 7]]);
  });
});
