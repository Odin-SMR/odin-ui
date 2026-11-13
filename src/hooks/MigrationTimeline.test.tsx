import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/migration-timeline-http-contract.json";
import { fetchMigrationTimeline, migrationTimelineDownload, migrationTimelinePath, useMigrationTimeline, type TimelinePins } from "./MigrationTimeline";

const annual = fixture.requests.find((row) => row.year === null)!;
const release = annual.headers["X-Odin-Release"];
const pins: TimelinePins = { timeline_sha256: annual.headers["X-Odin-Timeline-SHA256"], source_manifest_sha256: annual.headers["X-Odin-Source-Manifest-SHA256"] };
const reply = (body: unknown = annual.body, headers: Record<string, string> = annual.headers, status = 200) => new Response(JSON.stringify(body), { status, headers });
afterEach(() => vi.unstubAllGlobals());

describe("archive timeline HTTP and download contract", () => {
  it.each(fixture.requests)("accepts actual Flask-emitted year $year with both archive pins", async (record) => {
    const fetch = vi.fn().mockResolvedValue(reply(record.body, record.headers)); vi.stubGlobal("fetch", fetch);
    const result = await fetchMigrationTimeline(release, record.year, record.year === null ? undefined : pins);
    expect(result.data).toEqual(record.body); expect(result.response).toEqual(record.body); expect(result.pins).toEqual(pins);
    expect(fetch.mock.calls[0][0]).toBe(migrationTimelinePath(release, record.year));
    expect(JSON.parse(migrationTimelineDownload(result))).toEqual({ ...record.body, Migration: { source: "s3-parquet-migration", coverage: "mission", release_id: release, url: result.url, ...pins } });
  });
  it.each([
    ["X-Odin-Source", "postgres", "unexpected source"], ["X-Odin-Coverage", "pilot", "unexpected source"],
    ["X-Odin-Release", "different-release", "release changed"], ["X-Odin-Timeline-SHA256", "", "provenance hashes"],
    ["X-Odin-Source-Manifest-SHA256", "f".repeat(63), "provenance hashes"],
  ])("rejects invalid successful header %s", async (header, value, message) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(annual.body, { ...annual.headers, [header]: value })));
    await expect(fetchMigrationTimeline(release, null)).rejects.toThrow(message);
  });
  it.each(["X-Odin-Timeline-SHA256", "X-Odin-Source-Manifest-SHA256"])("refuses a monthly %s that differs from annual", async (header) => {
    const month = fixture.requests.find((row) => row.year === 2015)!;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(month.body, { ...annual.headers, [header]: "a".repeat(64) })));
    await expect(fetchMigrationTimeline(release, 2015, pins)).rejects.toThrow("provenance changed");
  });
  it("makes no request for invalid years or a monthly request without annual pins", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    for (const year of [0, 10000, NaN, 2015.5]) await expect(fetchMigrationTimeline(release, year, pins)).rejects.toThrow("1–9999");
    await expect(fetchMigrationTimeline(release, 2015)).rejects.toThrow("annual archive statistics");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects malformed periods, unsafe wire integers and the wrong response year", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ Years: [2015], Data: { "1": [[2015, 10], [2015, 20]] } })));
    await expect(fetchMigrationTimeline(release, null)).rejects.toThrow("unsupported timeline format");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"Years":[2015],"Data":{"1":[[2015,9007199254740993]]}}', { headers: annual.headers })));
    await expect(fetchMigrationTimeline(release, null)).rejects.toThrow("safe integer range");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ Year: 2016, Months: [1], Data: {} })));
    await expect(fetchMigrationTimeline(release, 2015, pins)).rejects.toThrow("different observation year");
  });
  it("preserves original scientific fields and signed zero in download JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"Years":[2015],"Data":{"1":[[2015,-0.0]],"null":[[2015,null]]},"retained":"original"}', { headers: annual.headers })));
    const result = await fetchMigrationTimeline(release, null);
    const downloaded = JSON.parse(migrationTimelineDownload(result));
    expect(Object.is(downloaded.Data["1"][0][1], -0)).toBe(true);
    expect(downloaded.Data["null"][0][1]).toBeNull(); expect(downloaded.retained).toBe("original");
    expect(downloaded.Migration).toMatchObject(pins);
  });
  it("reports HTTP, transport and unreadable-response failures without a fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ detail: "Not configured" }, annual.headers, 503)));
    await expect(fetchMigrationTimeline(release, null)).rejects.toThrow("HTTP 503");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network unavailable")));
    await expect(fetchMigrationTimeline(release, null)).rejects.toThrow("Network unavailable");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not JSON", { headers: annual.headers })));
    await expect(fetchMigrationTimeline(release, null)).rejects.toThrow("unreadable response");
  });
});

describe("archive timeline request lifecycle", () => {
  let container: HTMLDivElement, root: Root;
  function Harness({ selectedRelease, year = null, expectedPins }: { selectedRelease: string | null; year?: number | null; expectedPins?: TimelinePins }) {
    const state = useMigrationTimeline(selectedRelease, year, expectedPins);
    return <pre>{JSON.stringify(state)}</pre>;
  }
  const render = async (selectedRelease: string | null, year: number | null = null, expectedPins?: TimelinePins) => {
    await act(async () => { root.render(<Harness selectedRelease={selectedRelease} year={year} expectedPins={expectedPins} />); await new Promise((resolve) => setTimeout(resolve, 10)); });
  };
  const state = () => JSON.parse(container.textContent ?? "{}");
  beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  it("does not fetch without a validated release or before monthly pins exist", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await render(null); expect(state().loading).toBe(false); await render(release, 2015);
    expect(fetch).not.toHaveBeenCalled(); expect(state().result).toBeUndefined();
  });
  it("aborts and discards stale responses across release changes", async () => {
    let resolveOld: (response: Response) => void = () => {};
    const fetch = vi.fn<(url: string, options?: RequestInit) => Promise<Response>>((url) => url.includes("release_id=old") ? new Promise<Response>((resolve) => { resolveOld = resolve; }) : Promise.resolve(reply()));
    vi.stubGlobal("fetch", fetch); await render("old"); await render(release);
    await act(async () => { resolveOld(reply({ Years: [2015], Data: { "1": [[2015, 999]] } }, { ...annual.headers, "X-Odin-Release": "old" })); await Promise.resolve(); });
    expect(state().result.release).toBe(release); expect(state().result.data).toEqual(annual.body);
    expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
  it("discards stale monthly years and clears data while a new annual hash is pinned", async () => {
    let resolveOld: (response: Response) => void = () => {};
    const next = fixture.requests.find((row) => row.year === 2099)!;
    const fetch = vi.fn((url: string) => url.includes("year=2015") ? new Promise<Response>((resolve) => { resolveOld = resolve; }) : Promise.resolve(reply(next.body)));
    vi.stubGlobal("fetch", fetch); await render(release, 2015, pins); await render(release, 2099, pins);
    await act(async () => { resolveOld(reply(fixture.requests.find((row) => row.year === 2015)!.body)); await Promise.resolve(); });
    expect(state().result.data.Year).toBe(2099);
    await render(release, 2099, { ...pins, timeline_sha256: "a".repeat(64) });
    expect(state().error).toContain("provenance changed"); expect(state().result).toBeUndefined();
  });
});
