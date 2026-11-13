import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MigrationPilot from "./MigrationPilot";
import type Contract from "../odinApi/fixtures/pilot-http-contract.json";
import contractSource from "../odinApi/fixtures/pilot-http-contract.json?raw";
import { stringifyPilotJson } from "../odinApi/pilot";
const contract = JSON.parse(contractSource) as typeof Contract;

vi.mock("@fullcalendar/react", () => ({ default: () => <div>Calendar</div> }));
vi.mock("./plots/OdinTrack", () => ({ OdinTrack: () => <div>Map</div> }));

let container: HTMLDivElement;
let root: Root;
const status = {
  schema_version: "odin.pg-parquet-pilot/v1", release_id: "pilot-2015", ready: true,
  status: "validated", source: "s3-parquet-pilot", scope: {},
  exclusions: ["public.pg_stat_statements_bkp_20230922"], tables: {},
  coverage: { dates: ["2015-01-11"], date_start: "2015-01-11", date_end: "2015-01-11", freqmodes: [1], scan_ids: [7013927028], whole_mission: false },
};
const reply = (body: unknown, code = 200) => new Response(JSON.stringify(body), {
  status: code, headers: { "X-Odin-Source": "s3-parquet-pilot", "X-Odin-Release": "pilot-2015" },
});
const mount = async () => {
  await act(async () => { root.render(<MigrationPilot />); await new Promise((resolve) => setTimeout(resolve, 20)); });
};

const openMenu = async (label: string) => {
  await act(async () => { Array.from(document.querySelectorAll("button")).find((button) => button.textContent === label)!.click(); });
};
const closeMenu = async (label: string) => {
  await act(async () => { document.querySelector<HTMLButtonElement>(`button[aria-label="Close ${label}"]`)!.click(); await new Promise((resolve) => setTimeout(resolve, 200)); });
};
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe("migration pilot discovery", () => {
  it.each(["not_started", "planning", "exporting", "failed", "limit_exceeded", "interrupted"])("keeps discovery disabled while %s", async (state) => {
    const fetch = vi.fn().mockResolvedValue(reply({ ...status, status: state, ready: false, error: state === "failed" ? "Validation failed" : undefined }));
    vi.stubGlobal("fetch", fetch);
    await mount();
    expect(container.querySelector<HTMLInputElement>('input[type="date"]')?.disabled).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
    expect(container.textContent).toContain(["not_started", "planning", "exporting"].includes(state) ? "Discovery opens" : "cannot serve this slice");
    expect(container.textContent).not.toContain("No scans are stored");
  });

  it("shows discovery failure rather than a missing-data result", async () => {
    vi.stubGlobal("fetch", vi.fn((path: string) => Promise.resolve(path.endsWith("status") ? reply(status) : reply({ detail: "A committed Parquet object could not be read" }, 503))));
    await mount();
    expect(container.textContent).toContain("Pilot discovery failed");
    expect(container.textContent).toContain("could not be read");
    expect(container.textContent).not.toContain("contains no frequency-mode records");
  });

  it("shows actual migration counters while validated totals are still pending", async () => {
    const fetch = vi.fn().mockResolvedValue(reply({
      ...status, ready: false, status: "validating", tables: {}, current_table: "public.fba_level0",
      counters: { export_rows: 674395, committed_files: 80, validation_rows: 253369, source_read_bytes: 2574098073 },
    }));
    vi.stubGlobal("fetch", fetch);
    await mount();
    expect(container.textContent).toContain("674,395 rows exported");
    expect(container.textContent).toContain("80 files written");
    expect(container.textContent).toContain("253,369 source rows read for validation");
    expect(container.textContent).toContain("Current table: public.fba_level0");
    expect(container.textContent).toContain("Validated table totals will appear");
    expect(container.textContent).not.toContain("0 tables");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("shows a committed empty day distinctly", async () => {
    const fetch = vi.fn((path: string) => Promise.resolve(path.endsWith("status") ? reply(status) : reply({ Type: "freqmode_info", Count: 0, Data: [] })));
    vi.stubGlobal("fetch", fetch);
    await mount();
    expect(container.textContent).toContain("This exported day contains no frequency-mode records");
    expect(fetch.mock.calls.every(([path]) => path.startsWith("/rest_api/pilot/v1/"))).toBe(true);
    const date = container.querySelector<HTMLInputElement>('input[type="date"]');
    expect(date?.min).toBe("2015-01-11"); expect(date?.max).toBe("2015-01-11");
  });

  it("serves scan log, spectrum and anonymous downloads from the same release", async () => {
    const scan = { ScanID: 7013927028, FreqMode: 1, DateTime: "2015-01-11T00:01:00Z", LatStart: null, LonStart: 10, Quality: 0, NumSpec: 1 };
    const fetch = vi.fn((path: string) => {
      if (path.endsWith("status")) return Promise.resolve(reply(status));
      if (path.includes("period_info")) return Promise.resolve(reply({ Type: "freqmode_info", Count: 1, Data: [{ Date: "2015-01-11", Backend: "AC2", FreqMode: 1, NumScan: 1 }] }));
      if (path.includes("/L1b/")) return Promise.resolve(reply({ Type: "L1b", Count: null, Data: { Frequency: { IFreqGrid: [10, 20], LOFreq: [100] }, Spectrum: [[2, 3]], Altitude: [20000], Quality: [0] } }));
      if (path.includes("/Log/")) return Promise.resolve(reply({ Type: "Log", Count: null, Data: scan }));
      return Promise.resolve(reply({ Type: "Log", Count: 1, Data: [scan] }));
    });
    vi.stubGlobal("fetch", fetch);
    await mount();
    expect(container.textContent).toContain("Brightness temperature (K)");
    expect(container.textContent).toContain("Frequency (Hz)");
    expect(container.textContent).toContain("omitted from the map");
    await openMenu("Scan details & downloads");
    const link = Array.from(document.querySelectorAll<HTMLAnchorElement>('a')).find((item) => item.textContent === "Open source JSON");
    expect(link?.getAttribute("href")).toBe("/rest_api/pilot/v1/level1/1/7013927028/L1b/?release_id=pilot-2015");
    expect(fetch.mock.calls.every(([path]) => path.startsWith("/rest_api/pilot/v1/") && (path.endsWith("status") || path.includes("release_id=pilot-2015")))).toBe(true);
  });

  it("renders the exact synthetic Flask contract including single-Log object and nullable counts", async () => {
    const fetch = vi.fn((path: string) => {
      const route = new URL(path, "https://odin-smr.org");
      const fixture = Object.values(contract).find((record) => new URL(record.url, "https://odin-smr.org").pathname === route.pathname);
      if (!fixture) throw new Error(`Unexpected fixture route: ${path}`);
      return Promise.resolve(new Response(stringifyPilotJson(fixture.body), { status: fixture.status, headers: fixture.headers }));
    });
    vi.stubGlobal("fetch", fetch);
    await mount();
    expect(container.textContent).toContain("Scan 1000 · FM 1");
    await openMenu("Scan details & downloads");
    expect(document.body.textContent).toContain("Altitude: 20000 m to 60000 m");
    expect(document.body.textContent).toContain("Quality: 32");
    await closeMenu("Scan details & downloads");
    await openMenu("Spectrum details");
    expect(document.body.textContent).toContain("Quality: 208");
    expect(container.textContent).toContain("1484 of 1484 channels plotted");
    expect(container.querySelectorAll('[data-spectrum-line="true"]')).toHaveLength(2);
    const scanTable = container.querySelector<HTMLTableElement>('table[aria-label="Pilot scans"]')!;
    expect(scanTable.closest("details")?.open).toBe(false);
    const spectrum = container.querySelector('svg[aria-label="Brightness temperature spectrum"]')!;
    expect(spectrum.compareDocumentPosition(scanTable) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.textContent).not.toContain("unsupported data format");
    expect(fetch).toHaveBeenCalledTimes(5);
  });
});
