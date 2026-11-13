import { useEffect, useState } from "react";
import { totalTimelineSchema, yearTimelineSchema, type TimelineResponse } from "./Level1Stats";
import { MIGRATION_SOURCE } from "../odinApi/migration";
import { stringifyPilotJson } from "../odinApi/pilot";

export type TimelinePins = { timeline_sha256: string; source_manifest_sha256: string };
export type MigrationTimelineResult = {
  data: TimelineResponse; response: Record<string, unknown>; url: string; release: string; pins: TimelinePins;
};
type State = { key: string; loading: boolean; result?: MigrationTimelineResult; error?: string };
const prefix = "/rest_api/migration/v1/statistics/freqmode/timeline/";
const validYear = (year: number | null) => year === null || (Number.isInteger(year) && year >= 1 && year <= 9999);

export function migrationTimelinePath(release: string, year: number | null) {
  return `${prefix}?${new URLSearchParams({ release_id: release, ...(year === null ? {} : { year: String(year) }) })}`;
}

export async function fetchMigrationTimeline(release: string, year: number | null, pins?: TimelinePins, signal?: AbortSignal): Promise<MigrationTimelineResult> {
  if (!release || !validYear(year)) throw new Error("Select a release and a calendar year within 1–9999.");
  if (year !== null && !pins) throw new Error("Load the annual archive statistics before selecting a month view.");
  const url = migrationTimelinePath(release, year);
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new Error(`Archive statistics returned an unreadable response (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(`Archive statistics are unavailable (HTTP ${response.status}).`);
  if (response.headers.get("X-Odin-Source") !== MIGRATION_SOURCE || response.headers.get("X-Odin-Coverage") !== "mission") {
    throw new Error("Archive statistics returned an unexpected source or coverage.");
  }
  if (response.headers.get("X-Odin-Release") !== release) throw new Error("The archive statistics release changed. Refresh archive status.");
  const actualPins = {
    timeline_sha256: response.headers.get("X-Odin-Timeline-SHA256") ?? "",
    source_manifest_sha256: response.headers.get("X-Odin-Source-Manifest-SHA256") ?? "",
  };
  if (!Object.values(actualPins).every((hash) => /^[a-fA-F0-9]{64}$/.test(hash))) throw new Error("Archive statistics are missing valid archive provenance hashes.");
  if (pins && (pins.timeline_sha256 !== actualPins.timeline_sha256 || pins.source_manifest_sha256 !== actualPins.source_manifest_sha256)) {
    throw new Error("Archive statistics provenance changed. Reload the annual statistics before continuing.");
  }
  const parsed = (year === null ? totalTimelineSchema : yearTimelineSchema).safeParse(body);
  if (!parsed.success) throw new Error(parsed.error.issues.some((issue) => issue.message.includes("safe integer range"))
    ? "Archive statistics cannot be displayed exactly outside the JavaScript safe integer range."
    : "Archive statistics returned an unsupported timeline format.");
  if (year !== null && "Year" in parsed.data && parsed.data.Year !== year) throw new Error("Archive statistics returned a different observation year.");
  return { data: parsed.data, response: body as Record<string, unknown>, url, release, pins: actualPins };
}

export function migrationTimelineDownload(result: MigrationTimelineResult) {
  return stringifyPilotJson({ ...result.response, Migration: {
    source: MIGRATION_SOURCE, coverage: "mission", release_id: result.release, url: result.url, ...result.pins,
  } });
}

export function useMigrationTimeline(release: string | null, year: number | null = null, pins?: TimelinePins, refresh = 0) {
  const timelineHash = pins?.timeline_sha256, manifestHash = pins?.source_manifest_sha256;
  const key = JSON.stringify([release, year, timelineHash, manifestHash, refresh]);
  const enabled = !!release && (year === null || !!pins);
  const [state, setState] = useState<State>({ key, loading: enabled });
  useEffect(() => {
    if (!enabled || !release) { setState({ key, loading: false }); return; }
    const controller = new AbortController();
    setState({ key, loading: true });
    const expectedPins = timelineHash && manifestHash ? { timeline_sha256: timelineHash, source_manifest_sha256: manifestHash } : undefined;
    fetchMigrationTimeline(release, year, expectedPins, controller.signal).then(
      (result) => { if (!controller.signal.aborted) setState({ key, loading: false, result }); },
      (error: unknown) => { if (!controller.signal.aborted) setState({ key, loading: false, error: error instanceof Error ? error.message : "Archive statistics could not be loaded." }); },
    );
    return () => controller.abort();
  }, [key, enabled, release, year, timelineHash, manifestHash]);
  return state.key === key ? state : { key, loading: enabled } as State;
}
