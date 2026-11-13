import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import contractSource from "./fixtures/migration-http-contract.json?raw";
import type Contract from "./fixtures/migration-http-contract.json";
import fbSource from "./fixtures/migration-fb-http-contract.json?raw";
import type FbContract from "./fixtures/migration-fb-http-contract.json";
import {
  canonicalMigrationBackend, fetchMigration, migrationBackendOptions, migrationCalendarSchema, migrationDownload, migrationL1bSchema, migrationMonth,
  migrationPaths, migrationScansSchema, migrationSingleLogSchema, migrationStatusSchema,
} from "./migration";
const contract = JSON.parse(contractSource) as typeof Contract;
const fb = JSON.parse(fbSource) as typeof FbContract;
afterEach(() => vi.unstubAllGlobals());
const response = (body: unknown, headers: Record<string, string> = contract.status.headers, status = 200) => new Response(JSON.stringify(body), { status, headers });

describe("complete archive client", () => {
  it("accepts actual Flask full-contract responses without pilot-only fields", () => {
    expect(migrationStatusSchema.parse(contract.status.body).coverage).not.toHaveProperty("dates");
    expect(migrationStatusSchema.parse(contract.status.body).coverage).not.toHaveProperty("scan_ids");
    expect(migrationCalendarSchema.parse(contract.calendar.body).Data).toHaveLength(2);
    expect(migrationScansSchema.parse(contract.scans.body).Data[0].ScanID).toBe(1000);
    expect(migrationSingleLogSchema.parse(contract.log.body).Count).toBeNull();
    expect(migrationL1bSchema.parse(contract.l1b.body).Count).toBeNull();
  });
  it("preserves nullable catalogue identities and empty legacy single logs", () => {
    expect(migrationCalendarSchema.parse({ Type: "freqmode_info", Count: 1, Data: [{ Date: "2015-01-11", Backend: null, FreqMode: null, NumScan: 3, URL: null }] }).Data[0]).toEqual({ Date: "2015-01-11", Backend: null, FreqMode: null, NumScan: 3, URL: null });
    expect(migrationSingleLogSchema.parse({ Type: "Log", Count: null, Data: {} }).Data).toEqual({});
    expect(migrationSingleLogSchema.safeParse({ Type: "Log", Count: null, Data: { unexpected: 1 } }).success).toBe(false);
  });
  it("preserves an actual Flask month with nullable and signed stored smallint scan counts", () => {
    const month = migrationCalendarSchema.parse(contract.mixed_calendar.body);
    expect(month.Count).toBe(3);
    expect(month.Data.map((row) => row.NumScan)).toEqual([491, null, -7]);
    expect(month).toEqual(contract.mixed_calendar.body);
  });
  it.each(["exporting", "validating", "failed"])("rejects ready status for an unvalidated %s archive", (status) => {
    expect(migrationStatusSchema.safeParse({ ...contract.status.body, status, ready: true }).success).toBe(false);
  });
  it("builds month bounds without expanding the catalogue into mission-sized lists", () => {
    const coverage = migrationStatusSchema.parse(contract.status.body).coverage;
    expect(migrationMonth("2015-01-11", coverage)).toEqual({ start: "2015-01-01", length: 31 });
    expect(migrationMonth("2026-01-01", coverage)).toEqual({ start: "2026-01-01", length: 1 });
    expect(migrationMonth("2000-12-31", coverage)).toBeNull();
    expect(migrationMonth("2026-01-02", coverage)).toBeNull();
    expect(migrationMonth("2015-02-30", coverage)).toBeNull();
    expect(migrationMonth("", coverage)).toBeNull();
  });
  it("pins explicit backends and release without using server-supplied URLs", () => {
    const path = migrationPaths.spectra(1, 1000, "AC1", "release one");
    expect(path).toBe("/rest_api/migration/v1/level1/1/1000/L1b/?backend=AC1&release_id=release+one");
    expect(migrationPaths.calendar("2015-01-01", 31, "full")).toContain("length=31&release_id=full");
  });
  it("canonicalizes only trailing ASCII padding for logical backend options and URLs", () => {
    expect(migrationBackendOptions(["FB ", "AC2", "FB", "FB  "])).toEqual(["AC2", "FB"]);
    expect(canonicalMigrationBackend(" FB ")).toBe(" FB");
    expect(canonicalMigrationBackend("FB\t")).toBe("FB\t");
    expect(canonicalMigrationBackend("FB\u00a0")).toBe("FB\u00a0");
    for (const path of [migrationPaths.scans("2015-01-11", 20, "FB ", "full"), migrationPaths.log(20, 1000, "FB ", "full"), migrationPaths.spectra(20, 1000, "FB ", "full")]) {
      expect(new URL(path, "https://odin-smr.org").searchParams.get("backend")).toBe("FB");
      expect(new URL(path, "https://odin-smr.org").searchParams.get("release_id")).toBe("full");
    }
  });
  it("retains padded actual Flask backend fields while following canonical identifiers", () => {
    const status = migrationStatusSchema.parse(fb.status);
    const calendar = migrationCalendarSchema.parse(fb.calendar);
    expect(status.coverage.backends).toEqual(["FB ", "FB"]);
    expect(migrationBackendOptions(status.coverage.backends)).toEqual(["FB"]);
    expect(calendar.Data[0].Backend).toBe("FB ");
    expect(new URL(calendar.Data[0].URL as string).searchParams.get("backend")).toBe("FB");
    expect(migrationScansSchema.parse(fb.scans).Data[0].ScanID).toBe(1000);
    const saved = JSON.parse(migrationDownload(calendar, "fixture-full", migrationPaths.calendar("2015-01-11", 1, "fixture-full")));
    const { Migration: provenance, ...payload } = saved;
    expect(provenance.source).toBe("s3-parquet-migration");
    expect(payload).toEqual(fb.calendar);
    expect(payload.Data[0].Backend).toBe("FB ");
  });
  it("requires full source/coverage provenance and the pinned release", async () => {
    const path = migrationPaths.log(1, 1000, "AC2", "fixture-full");
    for (const [key, value, error] of [["X-Odin-Source", "s3-parquet-pilot", "unexpected data source"], ["X-Odin-Coverage", "pilot", "unexpected data source"], ["X-Odin-Release", "changed", "release changed"]]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(contract.log.body, { ...contract.log.headers, [key]: value })));
      await expect(fetchMigration(path, migrationSingleLogSchema)).rejects.toThrow(error);
    }
    vi.stubGlobal("fetch", vi.fn());
    await expect(fetchMigration("/rest_api/v5/level1/1/1000/Log/", migrationSingleLogSchema)).rejects.toThrow("Invalid archive data route");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("surfaces 503, 404 and changed-release errors as errors instead of empty records", async () => {
    for (const status of [503, 404, 409]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ detail: `Request failed: ${status}` }, {}, status)));
      await expect(fetchMigration(migrationPaths.status, z.unknown())).rejects.toThrow(`Request failed: ${status}`);
    }
  });
  it("preserves the entire wire payload and signed zeros in scientific downloads", () => {
    const saved = JSON.parse(migrationDownload(contract.l1b.body, "fixture-full", contract.l1b.url));
    const { Migration: provenance, ...payload } = saved;
    expect(payload).toEqual(contract.l1b.body);
    expect(provenance).toEqual({ source: "s3-parquet-migration", release_id: "fixture-full", coverage: "mission", url: contract.l1b.url });
    const signed = JSON.parse(migrationDownload({ Data: { values: [-0, 0, null], sentinel: "-0.0" } }, "full", "/source"));
    expect(Object.is(signed.Data.values[0], -0)).toBe(true);
    expect(Object.is(signed.Data.values[1], 0)).toBe(true);
    expect(signed.Data.sentinel).toBe("-0.0");
  });
});
