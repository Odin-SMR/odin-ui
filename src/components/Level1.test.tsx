import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Level1 } from "./Level1";

const client = vi.hoisted(() => ({ request: vi.fn(), navigate: vi.fn(), year: undefined as string | undefined }));
vi.mock("../odinApi/cloud_client", () => ({ createApiClient: () => ({ l2_stats_stats_get: client.request }) }));
vi.mock("react-router-dom", () => ({ useParams: () => ({ year: client.year }), useNavigate: () => client.navigate }));
vi.mock("./StackedBarPlot", () => ({ default: ({ updateYear }: { updateYear: (year: number) => void }) => <button onClick={() => updateYear(2015)}>Select 2015</button> }));
vi.mock("./StackedBarPlottCompare", () => ({ default: ({ level2 }: { level2: unknown }) => <pre data-comparison="true">{JSON.stringify(level2)}</pre> }));
let container: HTMLDivElement, root: Root;
const mount = async () => { await act(async () => { root.render(<Level1 />); await new Promise((resolve) => setTimeout(resolve, 10)); }); };
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); client.request.mockReset(); client.navigate.mockReset(); client.year = "2015"; container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe("existing Level1 caller preserves Level2 failure information", () => {
  it("does not issue L2 requests until a comparison year is selected", async () => {
    client.year = undefined; await mount(); expect(client.request).not.toHaveBeenCalled(); expect(container.querySelector("pre")).toBeNull();
  });
  it("shows loading without rendering comparison zeros", async () => {
    client.request.mockImplementation(() => new Promise(() => {})); await mount();
    expect(container.textContent).toContain("Loading Level 2 comparison statistics"); expect(container.querySelector("pre")).toBeNull();
  });
  it("shows all-failed counts as missing with a visible warning", async () => {
    client.request.mockRejectedValue(new Error("Failed")); await mount();
    expect(container.textContent).toContain("Their counts remain missing and have not been replaced with zero");
    const rows = JSON.parse(container.querySelector("pre")!.textContent!);
    expect(rows[0]["1"]).toBeNull(); expect(rows[0]["2"]).toBeNull();
  });
  it("preserves failed and successful-empty modes distinctly in a partial comparison", async () => {
    client.request.mockImplementation(({ queries: { fm } }: { queries: { fm: number } }) => fm === 1 ? Promise.reject(new Error("Failed")) : Promise.resolve([]));
    await mount(); expect(container.textContent).toContain("unavailable for frequency modes 1.");
    const rows = JSON.parse(container.querySelector("pre")!.textContent!);
    expect(rows[0]["1"]).toBeNull(); expect(rows[0]["2"]).toBe(0);
  });
  it("successful empty COUNT responses supply zeros without an unavailable warning", async () => {
    client.request.mockResolvedValue([]); await mount();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(JSON.parse(container.querySelector("pre")!.textContent!)[0]["1"]).toBe(0);
  });
  it("resets comparison state when the route year changes or returns to annual coverage", async () => {
    client.request.mockResolvedValue([]);
    await mount();
    expect(container.textContent).toContain("2015 monthly distribution");
    client.year = "2018"; await mount();
    expect(container.textContent).toContain("2018 monthly distribution");
    expect(container.textContent).not.toContain("2015 monthly distribution");
    const calls = client.request.mock.calls.length;
    client.year = undefined; await mount();
    expect(container.querySelector("pre")).toBeNull();
    expect(client.request).toHaveBeenCalledTimes(calls);
  });
  it("puts the selected year in the route so history and deep links retain the comparison", async () => {
    client.year = undefined; await mount();
    act(() => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Select 2015")!.click());
    expect(client.navigate).toHaveBeenCalledWith("/level1/statistics/2015");
    expect(client.request).not.toHaveBeenCalled();
    client.year = "2015"; client.request.mockResolvedValue([]); await mount();
    act(() => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Clear comparison")!.click());
    expect(client.navigate).toHaveBeenLastCalledWith("/level1/statistics");
  });
  it("does not silently parse a malformed route year as a valid observation year", async () => {
    client.year = "2015invalid"; await mount();
    expect(client.request).not.toHaveBeenCalled();
    expect(container.textContent).toContain("requested comparison year is invalid");
  });
});
