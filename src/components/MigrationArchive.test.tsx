import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MigrationArchive from "./MigrationArchive";
import contractSource from "../odinApi/fixtures/migration-http-contract.json?raw";
import type Contract from "../odinApi/fixtures/migration-http-contract.json";
import fbSource from "../odinApi/fixtures/migration-fb-http-contract.json?raw";
import type FbContract from "../odinApi/fixtures/migration-fb-http-contract.json";
import { stringifyPilotJson } from "../odinApi/pilot";
const contract = JSON.parse(contractSource) as typeof Contract;
const fb = JSON.parse(fbSource) as typeof FbContract;

vi.mock("@fullcalendar/react", () => ({ default: ({ events }: { events: { title: string }[] }) => <div>Calendar {events.map((event) => event.title).join("; ")}</div> }));
vi.mock("./plots/OdinTrack", () => ({ OdinTrack: () => <div>Map</div> }));
vi.mock("./MigrationTimeline", () => ({ default: ({ release }: { release: string }) => <div>Archive timeline release {release}</div> }));
let container: HTMLDivElement;
let root: Root;
const reply = (body: unknown, code = 200) => new Response(stringifyPilotJson(body), { status: code, headers: contract.status.headers });
const fixture = (path: string) => {
  const url = new URL(path, "https://odin-smr.org");
  const record = Object.values(contract).find((entry) => {
    const candidate = new URL(entry.url, "https://odin-smr.org");
    return candidate.pathname === url.pathname && candidate.searchParams.get("backend") === url.searchParams.get("backend");
  });
  if (!record) throw new Error(`Unexpected fixture request ${path}`);
  return record;
};
const mount = async () => {
  await act(async () => { root.render(<MigrationArchive />); await new Promise((resolve) => setTimeout(resolve, 25)); });
};
const openMenu = async (label: string) => {
  await act(async () => { Array.from(document.querySelectorAll("button")).find((button) => button.textContent === label)!.click(); });
};
const closeMenu = async (label: string) => {
  await act(async () => { document.querySelector<HTMLButtonElement>(`button[aria-label="Close ${label}"]`)!.click(); await new Promise((resolve) => setTimeout(resolve, 200)); });
};
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe("complete archive migration view", () => {
  it.each(["not_configured", "not_started", "planning", "exporting", "validating", "waiting_for_source", "failed", "limit_exceeded", "interrupted"])("gates all scientific controls and requests while %s", async (status) => {
    const fetch = vi.fn().mockResolvedValue(reply({ ...contract.status.body, ready: false, status, tables: {}, error_code: status === "failed" ? "source_mutation_detected" : null }));
    vi.stubGlobal("fetch", fetch); await mount();
    expect(fetch).toHaveBeenCalledOnce();
    expect(container.querySelector<HTMLInputElement>('input[type="date"]')?.disabled).toBe(true);
    expect(container.querySelector<HTMLInputElement>('input[id]')?.disabled).toBe(true);
    expect(container.textContent).not.toContain("No scans are stored");
    expect(container.textContent).not.toContain("0 validated tables");
    expect(container.textContent).not.toContain("Archive timeline release");
    expect(container.textContent).toContain(["failed", "limit_exceeded", "interrupted"].includes(status) ? "archive is unavailable" : "Discovery opens after the entire archive");
    if (status === "failed") expect(container.textContent).toContain("source_mutation_detected");
  });
  it.each([0, 2])("renders waiting for source honestly with %s possible writers", async (count) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ ...contract.status.body, ready: false, status: "waiting_for_source", waiting_phase: "validating", waiting_writer_count: count, writer_wait_seconds: 30, tables: {} })));
    await mount();
    expect(container.textContent).toContain("Validation is waiting for source activity to settle");
    expect(container.textContent).toContain(count ? "Possible writing sessions: 2" : "Confirming the source is quiet");
    expect(container.textContent).toContain("Waiting for 30 seconds");
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("does not show historical waiting fields after transfer resumes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ ...contract.status.body, ready: false, status: "exporting", waiting_phase: "exporting", waiting_writer_count: 0, writer_wait_seconds: 120, tables: {} })));
    await mount();
    expect(container.textContent).not.toContain("activity to settle");
    expect(container.textContent).not.toContain("Waiting for 120 seconds");
  });
  it("shows bounded progress and current section without claiming completion", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({
      ...contract.status.body, ready: false, status: "validating", tables: {},
      current_table: "public.ac_level1a", current_unit: "AC2-stw-2015", updated_at: "2026-10-03T21:00:00Z",
      counters: { export_rows: 4301472278, committed_files: 10000, source_read_bytes: 1024 ** 4, parquet_bytes: 1024 ** 3, validation_rows: 1000000, exported_units: 142351, validated_units: 9 },
    }))); await mount();
    expect(container.textContent).toContain("4,301,472,278 rows exported");
    expect(container.textContent).toContain("1,000,000 source rows read for validation");
    expect(container.textContent).toContain("1,024 GiB read from the source");
    expect(container.textContent).toContain("142,351 exported · 9 validated");
    expect(container.textContent).toContain("Section: AC2-stw-2015");
    expect(container.textContent).toContain("Validated table totals will appear");
  });
  it("uses actual full Flask scientific shapes and explicit backend/release pinning", async () => {
    const fetch = vi.fn((path: string) => Promise.resolve(reply(fixture(path).body)));
    vi.stubGlobal("fetch", fetch); await mount();
    expect(container.textContent).toContain("Scan 1000 · AC2 · FM 1");
    await openMenu("Scan details & downloads");
    expect(document.body.textContent).toContain("Altitude: 20000 m to 60000 m");
    expect(container.textContent).toContain("Archived versions: 1, 8, 9");

    expect(container.textContent).toContain("1484 of 1484 channels plotted");
    expect(container.querySelectorAll('[data-spectrum-line="true"]')).toHaveLength(2);
    const scanTable = container.querySelector<HTMLTableElement>('table[aria-label="Archive scans"]')!;
    expect(scanTable.closest("details")?.open).toBe(false);
    const spectrum = container.querySelector('svg[aria-label="Brightness temperature spectrum"]')!;
    expect(spectrum.compareDocumentPosition(scanTable) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.textContent).toContain("Archive timeline release fixture-full");
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(fetch.mock.calls.every(([path]) => path.startsWith("/rest_api/migration/v1/") && (path.endsWith("status") || path.includes("release_id=fixture-full")))).toBe(true);
    const paths = fetch.mock.calls.map(([path]) => path);
    expect(paths.filter((path) => path.includes("level1/") || path.includes("freqmode_info/")).every((path) => path.includes("backend=AC2"))).toBe(true);
    expect(document.querySelector('a[href*="L1b/"]')?.getAttribute("href")).toBe("/rest_api/migration/v1/level1/1/1000/L1b/?backend=AC2&release_id=fixture-full");
    await closeMenu("Scan details & downloads");
    await openMenu("Archive details");
    expect(document.body.textContent).toContain("Reconstructed spectra: AC1 and AC2, version 8");
  });
  it("shows storage failures separately from honest empty discovery", async () => {
    vi.stubGlobal("fetch", vi.fn((path: string) => Promise.resolve(path.endsWith("status") ? reply(contract.status.body) : reply({ detail: "A required archive object is missing" }, 503))));
    await mount();
    expect(container.textContent).toContain("Archive discovery failed: A required archive object is missing");
    expect(container.textContent).not.toContain("No catalogue records");
  });
  it("shows an empty covered day without making up data or scan requests", async () => {
    const fetch = vi.fn((path: string) => Promise.resolve(path.endsWith("status") ? reply(contract.status.body) : reply({ Type: "freqmode_info", Count: 0, Data: [] })));
    vi.stubGlobal("fetch", fetch); await mount();
    expect(container.textContent).toContain("No catalogue records are stored for this day");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("keeps a mixed month discoverable and shows missing and signed counts as stored", async () => {
    const fetch = vi.fn((path: string) => Promise.resolve(reply(path.includes("period_info") ? contract.mixed_calendar.body : fixture(path).body)));
    vi.stubGlobal("fetch", fetch); await mount();
    expect(container.textContent).toContain("AC1 · FM1 · 491");
    expect(container.textContent).toContain("AC2 · FM1 · Missing");
    expect(container.textContent).toContain("AC2 · FM2 · -7");
    expect(container.textContent).toContain("Scan 1000 · AC2 · FM 1");
    expect(container.textContent).toContain("1484 of 1484 channels plotted");
    expect(container.querySelectorAll('[data-spectrum-line="true"]')).toHaveLength(2);
    expect(container.textContent).not.toContain("unsupported data format");
    expect(container.textContent).not.toContain("FM1 · null");
    expect(fetch).toHaveBeenCalledTimes(5);
  });
  it("retains null catalogue records and their counts without generating invalid routes", async () => {
    const fetch = vi.fn((path: string) => Promise.resolve(path.endsWith("status") ? reply(contract.status.body) : reply({ Type: "freqmode_info", Count: 1, Data: [{ Date: "2015-01-11", Backend: null, FreqMode: null, NumScan: 17, URL: null }] })));
    vi.stubGlobal("fetch", fetch); await mount();
    expect(container.textContent).toContain("Missing backend · Missing mode · 17");
    expect(container.textContent).toContain("1 catalogue records have a missing backend or frequency mode");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(container.textContent).not.toContain("No catalogue records");
  });
  it("keeps AOS log discovery and disables unsupported spectrum reconstruction", async () => {
    const fetch = vi.fn((path: string) => {
      if (path.endsWith("status")) return Promise.resolve(reply(contract.status.body));
      if (path.includes("period_info")) return Promise.resolve(reply({ Type: "freqmode_info", Count: 1, Data: [{ Date: "2015-01-11", Backend: "AOS", FreqMode: 5, NumScan: 1 }] }));
      if (path.includes("/Log/")) return Promise.resolve(reply(contract.late_log.body));
      return Promise.resolve(reply(contract.late_scans.body));
    });
    vi.stubGlobal("fetch", fetch); await mount();
    expect(container.textContent).toContain("Scan 9000 · AOS · FM 5");
    expect(container.textContent).toContain("Reconstructed spectra are unavailable for AOS");
    expect(fetch.mock.calls.some(([path]) => path.includes("/L1b/"))).toBe(false);
    await openMenu("Scan details & downloads");
    const download = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === "Download spectra JSON");
    expect(download?.disabled).toBe(true);
  });
  it("discovers actual padded FB catalogue rows through canonical FB scan and log requests", async () => {
    const fetch = vi.fn((path: string) => {
      const url = new URL(path, "https://odin-smr.org");
      const body = path.endsWith("status") ? fb.status : path.includes("period_info") ? fb.calendar : path.includes("/Log/") ? fb.log : fb.scans;
      if (path.includes("freqmode_info") || path.includes("level1")) expect(url.searchParams.get("backend")).toBe("FB");
      return Promise.resolve(reply(body));
    });
    vi.stubGlobal("fetch", fetch); await mount();
    expect(container.textContent).toContain("FB  · FM20 · 1");
    expect(container.textContent).toContain("Scan 1000 · FB · FM 20");
    expect(container.textContent).toContain("Reconstructed spectra are unavailable for FB");
    expect(container.textContent).not.toContain("No scans are stored");
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(fetch.mock.calls.some(([path]) => path.includes("/L1b/"))).toBe(false);
    const backendInputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[value="FB"]'));
    expect(backendInputs).toHaveLength(2); // Catalogue and direct lookup use the same logical identity.
  });
  it("accepts honest missing logs while preserving explicit spectrum errors", async () => {
    vi.stubGlobal("fetch", vi.fn((path: string) => Promise.resolve(path.includes("/Log/")
      ? reply({ Type: "Log", Count: null, Data: {} })
      : path.includes("/L1b/") ? reply({ detail: "No reconstructed spectrum is available" }, 404) : reply(fixture(path).body))));
    await mount();
    expect(container.textContent).toContain("No scan log is available for this identifier");
    expect(container.textContent).toContain("Archive spectra failed: No reconstructed spectrum is available");
    expect(container.textContent).not.toContain("unsupported data format");
  });
});
