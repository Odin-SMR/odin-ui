import { z } from "zod";

export const PILOT_SOURCE = "s3-parquet-pilot";
const prefix = "/rest_api/pilot/v1";
const value = z.number().nullable();
const values = z.array(value);

export const pilotStatusSchema = z.object({
  schema_version: z.literal("odin.pg-parquet-pilot/v1"),
  release_id: z.string().nullable(),
  status: z.enum([
    "not_configured", "not_started", "planning", "exporting", "validating", "validated", "failed",
    "limit_exceeded", "interrupted", "unavailable",
  ]),
  ready: z.boolean(),
  source: z.literal(PILOT_SOURCE),
  coverage: z.object({
    dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    date_start: z.string().nullable(),
    date_end: z.string().nullable(),
    freqmodes: z.array(z.number().int()),
    scan_ids: z.array(z.number().int()),
    whole_mission: z.literal(false),
  }).passthrough(),
  scope: z.record(z.unknown()).nullable(),
  exclusions: z.array(z.string()),
  tables: z.record(z.object({
    rows: z.number().int().nonnegative(),
    files: z.number().int().nonnegative(),
    validation: z.record(z.unknown()),
  }).passthrough()),
  counters: z.object({
    export_rows: z.number().int().nonnegative().optional(),
    committed_files: z.number().int().nonnegative().optional(),
    source_read_bytes: z.number().int().nonnegative().optional(),
    validation_rows: z.number().int().nonnegative().optional(),
  }).passthrough().optional(),
  current_table: z.string().nullable().optional(),
  error: z.string().optional(),
}).passthrough().refine(
  (status) => !status.ready || (status.status === "validated" && !!status.release_id),
  "A ready pilot must have a validated release identifier",
);

export const pilotCalendarSchema = z.object({
  Type: z.string(), Count: z.number().int(),
  Data: z.array(z.object({
    Date: z.string(), Backend: z.string(), FreqMode: z.number().int(),
    NumScan: z.number().int().nonnegative(), URL: z.string().optional(),
  }).passthrough()),
}).passthrough();

const logSchema = z.object({
  ScanID: z.number().int(), FreqMode: z.number().int(),
  DateTime: z.string().nullable().optional(),
  LatStart: value.optional(), LatEnd: value.optional(),
  LonStart: value.optional(), LonEnd: value.optional(),
  AltStart: value.optional(), AltEnd: value.optional(),
  SunZD: value.optional(), Quality: value.optional(),
  NumSpec: value.optional(), MJDStart: value.optional(), MJDEnd: value.optional(),
  URLS: z.record(z.string()).optional(),
}).passthrough();

export const pilotLogSchema = z.object({
  Type: z.string(), Count: z.number().int(), Data: z.array(logSchema),
}).passthrough();

export const pilotSingleLogSchema = z.object({
  Type: z.string(), Count: z.null(), Data: logSchema,
}).passthrough();

export const pilotL1bSchema = z.object({
  Type: z.string(), Count: z.number().int().nullable(),
  Data: z.object({
    Spectrum: z.array(values).optional(),
    Frequency: z.object({
      IFreqGrid: values.optional(), LOFreq: values.optional(),
      AppliedDopplerCorr: values.optional(),
      SubBandIndex: z.array(values).optional(),
    }).passthrough().optional(),
    Altitude: values.optional(), SunZD: values.optional(), Quality: values.optional(),
    ScanID: values.optional(), FreqMode: values.optional(), Version: values.optional(),
    STW: values.optional(), MJD: values.optional(),
  }).passthrough(),
}).passthrough();

export type PilotStatus = z.infer<typeof pilotStatusSchema>;
export type PilotLog = z.infer<typeof logSchema>;
export type PilotL1b = z.infer<typeof pilotL1bSchema>["Data"];

/** Preserve Flask's signed-zero JSON numbers when saving a plain API response. */
export function stringifyPilotJson(value: unknown): string {
  const ancestors = new Set<object>();
  function encode(entry: unknown): string | undefined {
    if (entry === null) return "null";
    switch (typeof entry) {
      case "number":
        if (Object.is(entry, -0)) return "-0.0";
        return Number.isFinite(entry) ? JSON.stringify(entry) : "null";
      case "string":
      case "boolean":
        return JSON.stringify(entry);
      case "undefined":
      case "function":
      case "symbol":
        return undefined;
      case "bigint":
        throw new TypeError("BigInt values cannot be saved as pilot JSON numbers.");
      case "object": {
        if (ancestors.has(entry)) throw new TypeError("A pilot JSON response cannot contain cycles.");
        ancestors.add(entry);
        try {
          if (Array.isArray(entry)) {
            return `[${Array.from(entry, (item) => encode(item) ?? "null").join(",")}]`;
          }
          const prototype = Object.getPrototypeOf(entry);
          if (prototype !== Object.prototype && prototype !== null) {
            throw new TypeError("Pilot JSON downloads require plain response objects.");
          }
          const members = Object.entries(entry).flatMap(([key, item]) => {
            const encoded = encode(item);
            return encoded === undefined ? [] : [`${JSON.stringify(key)}:${encoded}`];
          });
          return `{${members.join(",")}}`;
        } finally {
          ancestors.delete(entry);
        }
      }
    }
  }
  const result = encode(value);
  if (result === undefined) throw new TypeError("A pilot JSON download requires a JSON value.");
  return result;
}

function pin(path: string, release: string, queries?: Record<string, string>) {
  const search = new URLSearchParams({ ...queries, release_id: release });
  return `${prefix}/${path}?${search}`;
}

export const pilotPaths = {
  status: `${prefix}/status`,
  calendar: (date: string, release: string) =>
    pin(`period_info/${date.split("-").join("/")}/`, release, { length: "1" }),
  scans: (date: string, mode: number, release: string) =>
    pin(`freqmode_info/${encodeURIComponent(date)}/${mode}/`, release),
  log: (mode: number, scan: number, release: string) =>
    pin(`level1/${mode}/${scan}/Log/`, release),
  spectra: (mode: number, scan: number, release: string) =>
    pin(`level1/${mode}/${scan}/L1b/`, release),
};

/** Requests never follow server-supplied legacy URLs or fall back to PostgreSQL. */
export async function fetchPilot<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!path.startsWith(`${prefix}/`)) throw new Error("Invalid pilot data route.");
  const response = await fetch(path, { signal, headers: { Accept: "application/json" } });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`The pilot API returned an unreadable response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const error = z.object({
      Error: z.string().optional(), error: z.string().optional(),
      detail: z.string().optional(), message: z.string().optional(),
    }).safeParse(body);
    const detail = error.success
      ? error.data.detail ?? error.data.Error ?? error.data.error ?? error.data.message
      : undefined;
    throw new Error(detail ?? `The pilot request failed (HTTP ${response.status}).`);
  }
  if (response.headers.get("X-Odin-Source") !== PILOT_SOURCE) {
    throw new Error("The pilot API returned an unexpected data source.");
  }
  const release = new URL(path, "https://odin-smr.org").searchParams.get("release_id");
  if (release && response.headers.get("X-Odin-Release") !== release) {
    throw new Error("The pilot release changed. Refresh the migration status before continuing.");
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new Error("The pilot API returned an unsupported data format.");
  return result.data;
}
