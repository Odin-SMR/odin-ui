import { useEffect, useState } from "react";
import { z } from "zod";
import { FREQMODES } from "../definitions";
import { createApiClient } from "../odinApi/cloud_client";
import type { GroupedRow } from "../components/StackedBarPlottCompare";

const api = createApiClient("/api");
const months = Array.from({ length: 12 }, (_, index) => index + 1);
const exactInteger = z.number().int().refine(Number.isSafeInteger);
const modeRows = z.array(z.object({ month: z.number().int().min(1).max(12), freqmode: exactInteger, count: exactInteger }).passthrough());
type State = { year: number | null; rows: GroupedRow[]; loading: boolean; failedModes: number[]; error: string | null };
const missingRows = (): GroupedRow[] => months.map((group) => ({ group, ...Object.fromEntries(FREQMODES.map((mode) => [String(mode), null])) }));

export function useLevel2Stats(year: number | null) {
  const [state, setState] = useState<State>({ year, rows: [], loading: year !== null, failedModes: [], error: null });
  useEffect(() => {
    const controller = new AbortController();
    if (year === null) { setState({ year, rows: [], loading: false, failedModes: [], error: null }); return; }
    if (!Number.isInteger(year) || year < 2000 || year > 2050) {
      setState({ year, rows: missingRows(), loading: false, failedModes: [...FREQMODES], error: "Level 2 statistics support calendar years 2000–2050. Counts for this year are unavailable." }); return;
    }
    setState({ year, rows: [], loading: true, failedModes: [], error: null });
    const load = async () => {
      const results = await Promise.allSettled(FREQMODES.map(async (fm) => {
        const response = await api.l2_stats_stats_get({ queries: { fm, year }, signal: controller.signal });
        const parsed = modeRows.safeParse(response);
        if (!parsed.success) throw new Error("Unsupported Level 2 statistics format.");
        const seen = new Set<number>();
        for (const row of parsed.data) {
          if (row.freqmode !== fm || seen.has(row.month)) throw new Error("Unexpected or duplicate Level 2 statistics group.");
          seen.add(row.month);
        }
        return parsed.data;
      }));
      if (controller.signal.aborted) return;
      const rows = missingRows(), failedModes: number[] = [];
      results.forEach((result, index) => {
        const mode = FREQMODES[index];
        if (result.status === "rejected") { failedModes.push(mode); return; }
        for (const row of rows) row[String(mode)] = 0;
        for (const record of result.value) rows[record.month - 1][String(mode)] = record.count;
      });
      setState({ year, rows, loading: false, failedModes, error: null });
    };
    void load();
    return () => controller.abort();
  }, [year]);
  return Object.is(state.year, year) ? state : { year, rows: [], loading: year !== null, failedModes: [], error: null } as State;
}
