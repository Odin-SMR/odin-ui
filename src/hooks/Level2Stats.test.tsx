import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FREQMODES } from "../definitions";
import { useLevel2Stats } from "./Level2Stats";

const client = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../odinApi/cloud_client", () => ({ createApiClient: (base: string) => { if (base !== "/api") throw new Error("Unexpected L2 source"); return { l2_stats_stats_get: client.request }; } }));
let container: HTMLDivElement, root: Root;
function Harness({ year }: { year: number | null }) { const state = useLevel2Stats(year); return <pre>{JSON.stringify(state)}</pre>; }
const render = async (year: number | null) => { await act(async () => { root.render(<Harness year={year} />); await new Promise((resolve) => setTimeout(resolve, 10)); }); };
const state = () => JSON.parse(container.textContent ?? "{}");
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); client.request.mockReset(); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe("isolated Level 2 COUNT statistics", () => {
  it("does not request a comparison before a year is selected", async () => {
    await render(null); expect(client.request).not.toHaveBeenCalled(); expect(state()).toMatchObject({ loading: false, rows: [], failedModes: [] });
  });
  it("shows loading without fabricating observed zeros", async () => {
    client.request.mockImplementation(() => new Promise(() => {})); await render(2015);
    expect(state()).toMatchObject({ loading: true, rows: [], failedModes: [] });
  });
  it("keeps every count missing when all modes fail", async () => {
    client.request.mockRejectedValue(new Error("HTTP 503")); await render(2015);
    expect(state().loading).toBe(false); expect(state().failedModes).toEqual(FREQMODES);
    expect(state().rows).toHaveLength(12); expect(state().rows.every((row: Record<string, number | null>) => FREQMODES.every((fm) => row[String(fm)] === null))).toBe(true);
  });
  it("only zero-fills successful empty/absent groups and preserves signed counts during partial failure", async () => {
    client.request.mockImplementation(({ queries: { fm } }: { queries: { fm: number } }) => fm === 1 ? Promise.reject(new Error("Unavailable")) : Promise.resolve(fm === 2 ? [{ month: 1, freqmode: 2, count: -7 }, { month: 12, freqmode: 2, count: 0 }] : []));
    await render(2015); expect(state().failedModes).toEqual([1]);
    expect(state().rows[0]).toMatchObject({ group: 1, "1": null, "2": -7, "8": 0 });
    expect(state().rows[1]["2"]).toBe(0); expect(state().rows[11]["2"]).toBe(0);
    expect(client.request.mock.calls.every(([request]) => request.queries.year === 2015)).toBe(true);
  });
  it.each([
    { name: "duplicate month", rows: [{ month: 1, freqmode: 1, count: 10 }, { month: 1, freqmode: 1, count: 20 }] },
    { name: "invalid month", rows: [{ month: 13, freqmode: 1, count: 10 }] },
    { name: "unexpected mode", rows: [{ month: 1, freqmode: 2, count: 10 }] },
    { name: "unsafe count", rows: [{ month: 1, freqmode: 1, count: Number.MAX_SAFE_INTEGER + 1 }] },
    { name: "fractional count", rows: [{ month: 1, freqmode: 1, count: 1.5 }] },
    { name: "NULL COUNT", rows: [{ month: 1, freqmode: 1, count: null }] },
  ])("keeps malformed $name mode entirely missing without losing successful neighbors", async ({ rows }) => {
    client.request.mockImplementation(({ queries: { fm } }: { queries: { fm: number } }) => Promise.resolve(fm === 1 ? rows : []));
    await render(2015); expect(state().failedModes).toEqual([1]);
    expect(state().rows.every((row: Record<string, number | null>) => row["1"] === null && row["2"] === 0)).toBe(true);
  });
  it.each([1999, 2051, NaN])("shows unavailable outside the generated API year range for %s without a request", async (year) => {
    await render(year); expect(client.request).not.toHaveBeenCalled(); expect(state().error).toContain("2000–2050");
    expect(state().rows[0]["1"]).toBeNull(); expect(state().loading).toBe(false);
  });
  it("discards and aborts stale year responses", async () => {
    const old: ((value: unknown) => void)[] = [];
    client.request.mockImplementation(({ queries: { fm, year } }: { queries: { fm: number; year: number } }) => year === 2015 ? new Promise((resolve) => old.push(resolve)) : Promise.resolve([{ month: 1, freqmode: fm, count: 7 }]));
    await render(2015); await render(2016);
    await act(async () => { old.forEach((resolve, index) => resolve([{ month: 1, freqmode: FREQMODES[index], count: 999 }])); await Promise.resolve(); });
    expect(state().year).toBe(2016); expect(state().rows[0]["1"]).toBe(7);
    expect(client.request.mock.calls[0][0].signal.aborted).toBe(true);
  });
});
