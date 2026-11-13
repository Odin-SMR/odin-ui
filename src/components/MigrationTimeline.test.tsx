import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../hooks/fixtures/migration-timeline-http-contract.json";
import MigrationTimeline from "./MigrationTimeline";

vi.mock("@visx/responsive", () => ({ useParentSize: () => ({ parentRef: () => {}, width: 800, height: 320 }) }));
vi.mock("@visx/tooltip", async () => ({
  ...await vi.importActual<typeof import("@visx/tooltip")>("@visx/tooltip"),
  useTooltipInPortal: () => ({ containerRef: () => {}, TooltipInPortal: ({ children }: { children: ReactNode }) => <div>{children}</div> }),
}));
const annual = fixture.requests.find((record) => record.year === null)!;
const release = annual.headers["X-Odin-Release"];
const reply = (record: (typeof fixture.requests)[number] = annual) => new Response(JSON.stringify(record.body), { headers: record.headers });
let container: HTMLDivElement, root: Root;
const mount = async (selectedRelease = release) => { await act(async () => { root.render(<MigrationTimeline release={selectedRelease} />); await new Promise((resolve) => setTimeout(resolve, 10)); }); };
const button = (label: string) => Array.from(document.querySelectorAll("button")).find((element) => element.textContent === label)!;
const openMenu = async (label: string) => { await act(async () => { button(label).click(); }); };
const closeMenu = async (label: string) => { await act(async () => {
  document.querySelector<HTMLButtonElement>(`button[aria-label="Close ${label}"]`)!.click();
  await new Promise((resolve) => setTimeout(resolve, 200));
}); };
const choose = async (year: number) => {
  await openMenu("Statistics year");
  await act(async () => {
    const input = document.querySelector<HTMLInputElement>('[role="dialog"] input')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, String(year));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => { button("Show monthly statistics").click(); await new Promise((resolve) => setTimeout(resolve, 10)); });
};
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  vi.stubGlobal("fetch", vi.fn((path: string) => {
    const url = new URL(path, "https://odin-smr.org");
    if (url.pathname !== "/rest_api/migration/v1/statistics/freqmode/timeline/") throw new Error(`Unexpected source ${path}`);
    const record = fixture.requests.find((item) => item.year === (url.searchParams.has("year") ? Number(url.searchParams.get("year")) : null));
    if (!record) throw new Error(`Unexpected year ${path}`);
    return Promise.resolve(reply(record));
  }));
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe("alternative archive timeline", () => {
  it("loads only annual pinned archive statistics initially and retains NULL/unknown/signed plotting", async () => {
    await mount(); expect(fetch).toHaveBeenCalledOnce();
    expect(container.querySelector('[data-mode="null"][data-count="-9"]')).not.toBeNull();
    expect(container.querySelector('[data-mode="2"][data-group="2015"][data-count-state="missing"]')).not.toBeNull();
    await openMenu("Statistics details");
    expect(document.body.textContent).toContain(annual.headers["X-Odin-Timeline-SHA256"]);
    expect(document.querySelector('a[href*="timeline/"]')?.getAttribute("href")).toBe(`/rest_api/migration/v1/statistics/freqmode/timeline/?release_id=${release}`);
  });
  it("selects an annual bar and displays the actual monthly signed/missing response", async () => {
    await mount();
    await act(async () => { container.querySelector<SVGElement>('[data-group="2015"][data-mode="1"]')!.dispatchEvent(new MouseEvent("click", { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 10)); });
    await act(async () => { button("View 2015 monthly").click(); await new Promise((resolve) => setTimeout(resolve, 10)); });
    expect(container.textContent).toContain("2015 monthly archived L1 statistics");
    expect(container.querySelector('[data-group="12"][data-mode="1"][data-count="-4"]')).not.toBeNull();
    expect(container.querySelector('[data-group="3"][data-mode="1"][data-count-state="missing"]')).not.toBeNull();
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe(`/rest_api/migration/v1/statistics/freqmode/timeline/?release_id=${release}&year=2015`);
  });
  it.each([1, 1999, 2099, 9999])("supports explicit calendar year %s outside the annual overview", async (year) => {
    await mount(); await choose(year);
    expect(container.textContent).toContain(`${year} monthly archived L1 statistics`);
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain(`year=${year}`);
    if (year === 1999) expect(container.textContent).toContain("No frequency-mode records are stored for this interval");
    else { await openMenu("Monthly details"); expect(button("Download monthly statistics JSON").disabled).toBe(false); }
  });
  it("shows an unavailable annual response and never enables month requests or downloads", async () => {
    const request = vi.fn().mockResolvedValue(new Response("{}", { status: 503 })); vi.stubGlobal("fetch", request);
    await mount(); expect(container.textContent).toContain("Archive statistics are unavailable (HTTP 503)");
    expect(container.querySelector('svg[role="img"]')).toBeNull();
    await openMenu("Statistics year"); expect(button("Show monthly statistics").disabled).toBe(true);
    await closeMenu("Statistics year"); await openMenu("Statistics details");
    expect(button("Download annual statistics JSON").disabled).toBe(true); expect(request).toHaveBeenCalledOnce();
  });
  it("refuses to mix monthly hashes with annual data", async () => {
    vi.stubGlobal("fetch", vi.fn((path: string) => Promise.resolve(path.includes("year=")
      ? new Response(JSON.stringify(fixture.requests.find((record) => record.year === 2015)!.body), { headers: { ...annual.headers, "X-Odin-Source-Manifest-SHA256": "a".repeat(64) } }) : reply())));
    await mount(); await choose(2015);
    expect(container.textContent).toContain("Archive statistics provenance changed");
    expect(container.querySelectorAll('svg[role="img"]')).toHaveLength(1);
    await openMenu("Monthly details");
    expect(button("Download monthly statistics JSON").disabled).toBe(true);
  });
  it("clears old month data and source links immediately on release changes", async () => {
    await mount(); await choose(2015);
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))); await mount("next-release");
    expect(container.textContent).not.toContain("2015 monthly archived");
    expect(container.textContent).not.toContain(annual.headers["X-Odin-Timeline-SHA256"]);
    expect(container.querySelectorAll('a[href*="timeline/"]')).toHaveLength(0);
    expect(container.querySelector('svg[role="img"]')).toBeNull();
  });
  it("creates an anonymous JSON download for the pinned response", async () => {
    const createUrl = vi.fn().mockReturnValue("blob:timeline-download");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("URL", class extends URL { static createObjectURL = createUrl; static revokeObjectURL = vi.fn(); });
    await mount(); await openMenu("Statistics details"); act(() => button("Download annual statistics JSON").click());
    expect(createUrl).toHaveBeenCalledOnce(); expect(createUrl.mock.calls[0][0].type).toBe("application/json");
    expect(click).toHaveBeenCalledOnce(); click.mockRestore();
  });
});
