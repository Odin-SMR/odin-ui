import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPilot, pilotCalendarSchema, pilotPaths, pilotStatusSchema, pilotLogSchema, pilotSingleLogSchema, pilotL1bSchema, stringifyPilotJson } from "./pilot";

import type Contract from "./fixtures/pilot-http-contract.json";
import contractSource from "./fixtures/pilot-http-contract.json?raw";
// Vite's JSON-to-module transform normalizes signed zero; parse original wire text.
const contract = JSON.parse(contractSource) as typeof Contract;

const response = (body: unknown, status = 200, source = "s3-parquet-pilot", release = "pilot-2015") =>
  new Response(JSON.stringify(body), { status, headers: { "X-Odin-Source": source, "X-Odin-Release": release } });

afterEach(() => vi.unstubAllGlobals());

describe("the isolated Parquet pilot client", () => {
  it("accepts actual Flask wire envelopes without changing scientific payloads", () => {
    expect(pilotStatusSchema.parse(contract.status.body).ready).toBe(true);
    expect(pilotCalendarSchema.parse(contract.calendar.body).Data.length).toBe(1);
    expect(pilotLogSchema.parse(contract.scans.body).Data.length).toBe(1);
    expect(pilotSingleLogSchema.parse(contract.log.body)).toEqual(contract.log.body);
    expect(pilotL1bSchema.parse(contract.l1b.body)).toEqual(contract.l1b.body);
  });

  it("retains signed zero and all Flask spectrum metadata in downloadable JSON", () => {
    const body = JSON.parse(stringifyPilotJson(contract.l1b.body));
    expect(body).toEqual(contract.l1b.body);
    expect(Object.is(body.Data.Frequency.AppliedDopplerCorr[0], -0)).toBe(true);
    expect(Object.is(body.Data.Frequency.AppliedDopplerCorr[1], -0)).toBe(true);
    expect(stringifyPilotJson({ value: -0, text: "-0.0", quality: 0 })).toBe('{"value":-0.0,"text":"-0.0","quality":0}');
  });

  it("retains standard JSON omission and missing-array-value behavior", () => {
    const decoded = JSON.parse(stringifyPilotJson({
      missing: undefined, invalid: NaN, infinite: Infinity, flag: false,
      spectrum: [undefined, null, -Infinity, -0, 1.2345678901234567],
    }));
    expect(decoded).toEqual({
      invalid: null, infinite: null, flag: false,
      spectrum: [null, null, null, -0, 1.2345678901234567],
    });
    expect(Object.is(decoded.spectrum[3], -0)).toBe(true);
  });
  it("pins release and uses only additive pilot routes", async () => {
    const fetch = vi.fn().mockResolvedValue(response({ Type: "freqmode_info", Count: 0, Data: [] }));
    vi.stubGlobal("fetch", fetch);
    const path = pilotPaths.calendar("2015-01-11", "pilot-2015");
    expect(path).toBe("/rest_api/pilot/v1/period_info/2015/01/11/?length=1&release_id=pilot-2015");
    expect((await fetchPilot(path, pilotCalendarSchema)).Data).toEqual([]);
    expect(fetch).toHaveBeenCalledOnce();
    expect(pilotPaths.spectra(1, 7013927028, "pilot-2015")).toContain("/pilot/v1/level1/1/7013927028/L1b/?release_id=pilot-2015");
  });

  it.each([
    ["postgres", "pilot-2015", "unexpected data source"],
    ["s3-parquet-pilot", "another-release", "release changed"],
  ])("rejects source or release mismatches without fallback", async (source, release, detail) => {
    const fetch = vi.fn().mockResolvedValue(response({ Type: "freqmode_info", Count: 0, Data: [] }, 200, source, release));
    vi.stubGlobal("fetch", fetch);
    await expect(fetchPilot(pilotPaths.calendar("2015-01-11", "pilot-2015"), pilotCalendarSchema)).rejects.toThrow(detail);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("keeps unavailable coverage distinct from an empty result", async () => {
    const fetch = vi.fn().mockResolvedValue(response({ detail: "Date outside committed pilot coverage" }, 404));
    vi.stubGlobal("fetch", fetch);
    await expect(fetchPilot(pilotPaths.calendar("2015-01-12", "pilot-2015"), pilotCalendarSchema)).rejects.toThrow("outside committed pilot coverage");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("rejects a PostgreSQL route before any request", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(fetchPilot("/rest_api/v5/period_info/2015/01/11/", pilotCalendarSchema)).rejects.toThrow("Invalid pilot data route");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires a validated release before readiness can be shown", () => {
    const status = {
      schema_version: "odin.pg-parquet-pilot/v1", release_id: null, ready: true,
      status: "exporting", source: "s3-parquet-pilot", scope: null, exclusions: [], tables: {},
      coverage: { dates: [], date_start: null, date_end: null, freqmodes: [], scan_ids: [], whole_mission: false },
    };
    expect(pilotStatusSchema.safeParse(status).success).toBe(false);
  });
});
