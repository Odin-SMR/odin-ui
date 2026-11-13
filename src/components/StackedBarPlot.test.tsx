import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StackedBarPlot, { FrequencyTimelinePlot } from "./StackedBarPlot";
import StackedBarPlotCompare from "./StackedBarPlottCompare";
import type { TotalResponse, YearResponse } from "../hooks/Level1Stats";

vi.mock("@visx/responsive", () => ({ useParentSize: () => ({ parentRef: () => {}, width: 800, height: 300 }) }));
vi.mock("@visx/event", () => ({ localPoint: () => ({ x: 1, y: 2 }) }));
vi.mock("@visx/tooltip", async () => ({
  ...await vi.importActual<typeof import("@visx/tooltip")>("@visx/tooltip"),
  useTooltipInPortal: () => ({ containerRef: () => {}, TooltipInPortal: ({ children }: { children: ReactNode }) => <div>{children}</div> }),
}));
let container: HTMLDivElement;
let root: Root;
const annual = (Data: TotalResponse["Data"]): TotalResponse => ({ Data, Years: [2015] });
const render = async (element: ReactNode) => {
  await act(async () => { root.render(element); await new Promise((resolve) => setTimeout(resolve, 10)); });
};
const hover = (element: Element | null) => { expect(element).not.toBeNull(); act(() => element?.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }))); };
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); vi.stubGlobal("fetch", vi.fn()); });
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe("honest timeline visualization", () => {
  it("renders NULL separately from a genuine zero and labels unspecified modes", async () => {
    await render(<FrequencyTimelinePlot data={annual({ "null": [[2015, null]], "999": [[2015, 0]] })} loading={false} error={null} />);
    const missing = container.querySelector('[data-count-state="missing"][data-mode="null"]');
    const zero = container.querySelector('[data-count-state="zero"][data-mode="999"]');
    expect(missing?.getAttribute("aria-label")).toContain("Unspecified frequency mode, Count: Missing");
    expect(missing?.hasAttribute("data-count")).toBe(false);
    expect(zero?.getAttribute("data-count")).toBe("0");
    expect(container.textContent).toContain("They have not been replaced with zero");
    hover(missing);
    expect(container.textContent).toContain("FM Unspecified frequency mode");
    expect(container.textContent).toContain("L1: Missing");
    hover(zero);
    expect(container.textContent).toContain("FM 999");
    expect(container.textContent).toContain("L1: 0");
    act(() => zero?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(document.body.textContent).toContain("Range: Unknown");
  });
  it("places negative bars below zero with positive height and preserves known tooltips/year selection", async () => {
    const updateYear = vi.fn();
    await render(<FrequencyTimelinePlot data={annual({ "1": [[2015, 10]], "2": [[2015, -4]] })} loading={false} error={null} updateYear={updateYear} />);
    const baseline = Number(container.querySelector('[data-zero-baseline="true"]')?.getAttribute("y1"));
    const positive = container.querySelector('[data-count="10"]'), negative = container.querySelector('[data-count="-4"]');
    expect(Number(positive?.getAttribute("y"))).toBeLessThan(baseline);
    expect(Number(negative?.getAttribute("y"))).toBeGreaterThanOrEqual(baseline);
    expect(Number(negative?.getAttribute("height"))).toBeGreaterThan(0);
    act(() => negative?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(updateYear).not.toHaveBeenCalled();
    const drill = [...document.querySelectorAll("button")].find((button) => button.textContent === "View 2015 monthly");
    act(() => drill?.click());
    expect(updateYear).toHaveBeenCalledWith(2015);
    act(() => positive?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(document.body.textContent).toContain("ClO, O3, N2O");
    expect(document.body.textContent).toContain("501.180 - 501.580, 501.980 - 502.380");
  });
  it.each(["loading", "failed", "empty"])("shows %s without an observation chart or fake zeros", async (state) => {
    await render(<FrequencyTimelinePlot data={{ Data: {}, Years: [] }} loading={state === "loading"} error={state === "failed" ? "Storage request failed" : null} />);
    expect(container.querySelector('svg[role="img"]')).toBeNull();
    expect(container.textContent).toContain(state === "loading" ? "Loading Level 1 statistics" : state === "failed" ? "Statistics unavailable: Storage request failed" : "No frequency-mode records");
  });
  it("refuses to plot unsafe accumulated values instead of rounded totals", async () => {
    await render(<FrequencyTimelinePlot data={annual({ "1": [[2015, Number.MAX_SAFE_INTEGER]], "2": [[2015, 1]] })} loading={false} error={null} />);
    expect(container.textContent).toContain("stacked totals cannot be displayed exactly");
    expect(container.querySelector('svg[role="img"]')).toBeNull();
  });
  it("preserves NULL and signed L1 values in comparison while keeping valid percentage behavior", async () => {
    const data: YearResponse = { Year: 2015, Months: [1, 2, 3, 4], Data: { "1": [[1, null], [2, 0], [3, -2], [4, 2]] } };
    await render(<FrequencyTimelinePlot data={data} loading={false} error={null} level2={[{ group: 1, "1": 6 }, { group: 2, "1": 7 }, { group: 3, "1": -1 }, { group: 4, "1": 1 }]} />);
    expect(container.querySelector('[data-level="1"][data-group="1"][data-mode="1"][data-count-state="missing"]')).not.toBeNull();
    expect(container.querySelector('[data-level="1"][data-group="2"][data-mode="1"][data-count-state="zero"]')).not.toBeNull();
    expect(Number(container.querySelector('[data-level="2"][data-group="3"][data-mode="1"]')?.getAttribute("height"))).toBeGreaterThan(0);
    hover(container.querySelector('[data-level="2"][data-group="1"][data-mode="1"]'));
    expect(container.textContent).toContain("L1: Missing"); expect(container.textContent).toContain("L2: 6");
    act(() => container.querySelector('[data-level="2"][data-group="1"][data-mode="1"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(document.body.textContent).toContain("L2 / L1: —");
    hover(container.querySelector('[data-level="2"][data-group="4"][data-mode="1"]'));
    act(() => container.querySelector('[data-level="2"][data-group="4"][data-mode="1"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(document.body.textContent).toContain("L2 / L1: 50.0 %");
  });
  it("treats an unavailable L2 value as missing rather than inventing a zero", async () => {
    await render(<FrequencyTimelinePlot data={annual({ "999": [[2015, 2]] })} loading={false} error={null} level2={[]} />);
    expect(container.querySelector('[data-level="2"][data-mode="999"][data-count-state="missing"]')).not.toBeNull();
    hover(container.querySelector('[data-level="1"][data-mode="999"]'));
    expect(container.textContent).toContain("L2: Missing");
    expect(container.textContent).not.toContain("L2: 0");
  });
  it("both public wrappers retain their default PG routes and show HTTP errors", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    await render(<StackedBarPlot />);
    expect(container.textContent).toContain("HTTP 503");
    expect(fetch.mock.calls[0][0]).toBe("/rest_api/v5/statistics/freqmode/timeline/");
    await render(<StackedBarPlotCompare year={2015} level2={[]} />);
    expect(container.textContent).toContain("HTTP 503");
    expect(fetch.mock.calls[1][0]).toBe("/rest_api/v5/statistics/freqmode/timeline/?year=2015");
  });
  it.each([
    { name: "duplicate annual axes", year: null, response: { Years: [2015, 2015], Data: { "1": [[2015, 10]] } } },
    { name: "duplicate annual pairs", year: null, response: { Years: [2015], Data: { "1": [[2015, 10], [2015, 20]] } } },
    { name: "annual pair outside axes", year: null, response: { Years: [2015], Data: { "1": [[2016, 10]] } } },
    { name: "duplicate monthly axes", year: 2015, response: { Year: 2015, Months: [1, 1], Data: { "1": [[1, 10]] } } },
    { name: "duplicate monthly pairs", year: 2015, response: { Year: 2015, Months: [1], Data: { "1": [[1, null], [1, 20]] } } },
    { name: "monthly pair outside axes", year: 2015, response: { Year: 2015, Months: [1], Data: { "1": [[2, -7]] } } },
    { name: "invalid monthly axes", year: 2015, response: { Year: 2015, Months: [13], Data: { "1": [[13, 10]] } } },
  ])("the hook renders unavailable for $name without plotting discarded or ambiguous values", async ({ year, response }) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(response))));
    await render(year === null ? <StackedBarPlot /> : <StackedBarPlotCompare year={year} level2={[]} />);
    expect(container.textContent).toContain("Statistics unavailable: Statistics returned an unsupported timeline format.");
    expect(container.querySelector('svg[role="img"]')).toBeNull();
    expect(container.querySelector('[data-count-state]')).toBeNull();
  });
});
