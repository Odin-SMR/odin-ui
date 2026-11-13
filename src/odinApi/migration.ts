import dayjs from "dayjs";
import { z } from "zod";
import { pilotL1bSchema, pilotLogSchema, pilotSingleLogSchema, stringifyPilotJson } from "./pilot";

export const MIGRATION_SOURCE = "s3-parquet-migration";
const prefix = "/rest_api/migration/v1";
const dateValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const counter = z.number().int().nonnegative().optional();

export const migrationStatusSchema = z.object({
  schema_version: z.literal("odin.pg-parquet-full/v1"),
  release_id: z.string().nullable(),
  status: z.enum(["not_configured", "not_started", "planning", "exporting", "validating", "waiting_for_source", "validated", "failed", "limit_exceeded", "interrupted", "unavailable"]),
  ready: z.boolean(), source: z.literal(MIGRATION_SOURCE),
  coverage: z.object({
    date_start: dateValue.nullable(), date_end: dateValue.nullable(),
    backends: z.array(z.string()), freqmodes: z.array(z.number().int()),
    versions: z.array(z.number().int()), whole_mission: z.boolean(),
  }).passthrough(),
  scope: z.record(z.unknown()).nullable(), exclusions: z.array(z.string()),
  tables: z.record(z.object({
    rows: z.number().int().nonnegative().nullable(), validation: z.record(z.unknown()),
    min: z.record(z.unknown()), max: z.record(z.unknown()),
  }).passthrough()),
  serving: z.object({
    spectra_backends: z.array(z.string()), spectrum_version: z.number().int(),
    date_catalog_source: z.string(), postgres_fallback: z.literal(false),
  }).passthrough(),
  counters: z.object({
    export_rows: counter, validation_rows: counter, source_read_bytes: counter,
    committed_files: counter, parquet_bytes: counter, exported_units: counter, validated_units: counter,
  }).passthrough().optional(),
  current_table: z.string().nullable().optional(), current_unit: z.string().nullable().optional(),
  waiting_phase: z.enum(["exporting", "validating"]).optional(),
  waiting_writer_count: counter, writer_wait_seconds: counter,
  started_at: z.string().optional(), updated_at: z.string().optional(), validated_at: z.string().optional(),
  error_code: z.string().nullable().optional(), error: z.string().optional(),
}).passthrough().refine(
  (status) => !status.ready || (status.status === "validated" && !!status.release_id && status.coverage.whole_mission),
  "A ready archive requires a validated complete-release identifier",
);

export const migrationCalendarSchema = z.object({
  Type: z.string(), Count: z.number().int(),
  Data: z.array(z.object({
    Date: dateValue, Backend: z.string().nullable(), FreqMode: z.number().int().nullable(),
    NumScan: z.number().int().nullable(), URL: z.string().nullable().optional(),
  }).passthrough()),
}).passthrough();
export const migrationScansSchema = pilotLogSchema;
export const migrationSingleLogSchema = z.object({
  Type: z.string(), Count: z.null(),
  Data: z.union([pilotSingleLogSchema.shape.Data, z.object({}).strict()]),
}).passthrough();
export const migrationL1bSchema = pilotL1bSchema;
export type MigrationStatus = z.infer<typeof migrationStatusSchema>;

/** PostgreSQL character(n) padding affects identifiers, never stored response fields. */
export function canonicalMigrationBackend(backend: string) {
  return backend.replace(/ +$/, "");
}

export function migrationBackendOptions(backends: string[]) {
  return Array.from(new Set(backends.map(canonicalMigrationBackend))).sort();
}

function pin(path: string, release: string, queries?: Record<string, string>) {
  return `${prefix}/${path}?${new URLSearchParams({ ...queries, release_id: release })}`;
}
export const migrationPaths = {
  status: `${prefix}/status`,
  calendar: (date: string, length: number, release: string) =>
    pin(`period_info/${date.split("-").join("/")}/`, release, { length: String(length) }),
  scans: (date: string, mode: number, backend: string, release: string) =>
    pin(`freqmode_info/${encodeURIComponent(date)}/${mode}/`, release, { backend: canonicalMigrationBackend(backend) }),
  log: (mode: number, scan: number, backend: string, release: string) =>
    pin(`level1/${mode}/${scan}/Log/`, release, { backend: canonicalMigrationBackend(backend) }),
  spectra: (mode: number, scan: number, backend: string, release: string) =>
    pin(`level1/${mode}/${scan}/L1b/`, release, { backend: canonicalMigrationBackend(backend) }),
};

/** Catalogue bounds describe discovery, not the domain of raw scan identifiers. */
export function migrationMonth(date: string, coverage?: MigrationStatus["coverage"]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || dayjs(date).format("YYYY-MM-DD") !== date
    || !coverage?.date_start || !coverage.date_end || date < coverage.date_start || date > coverage.date_end) return null;
  const first = dayjs(date).startOf("month").format("YYYY-MM-DD");
  const last = dayjs(date).endOf("month").format("YYYY-MM-DD");
  const start = first < coverage.date_start ? coverage.date_start : first;
  const end = last > coverage.date_end ? coverage.date_end : last;
  return { start, length: dayjs(end).diff(dayjs(start), "day") + 1 };
}

export async function fetchMigration<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  if (!path.startsWith(`${prefix}/`)) throw new Error("Invalid archive data route.");
  const response = await fetch(path, { signal, headers: { Accept: "application/json" } });
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new Error(`The archive API returned an unreadable response (HTTP ${response.status}).`); }
  if (!response.ok) {
    const error = z.object({ detail: z.string().optional(), error: z.string().optional() }).safeParse(body);
    throw new Error((error.success && (error.data.detail ?? error.data.error)) || `The archive request failed (HTTP ${response.status}).`);
  }
  if (response.headers.get("X-Odin-Source") !== MIGRATION_SOURCE || response.headers.get("X-Odin-Coverage") !== "mission") {
    throw new Error("The archive API returned an unexpected data source or coverage.");
  }
  const release = new URL(path, "https://odin-smr.org").searchParams.get("release_id");
  if (release && response.headers.get("X-Odin-Release") !== release) {
    throw new Error("The archive release changed. Refresh migration status before continuing.");
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new Error("The archive API returned an unsupported data format.");
  return result.data;
}

/** Keep the scientific response intact, including negative zero, with explicit provenance. */
export function migrationDownload(response: Record<string, unknown>, release: string, url: string) {
  return stringifyPilotJson({ ...response, Migration: { source: MIGRATION_SOURCE, release_id: release, coverage: "mission", url } });
}
