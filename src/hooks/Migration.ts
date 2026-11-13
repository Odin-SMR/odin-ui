import { useEffect, useState } from "react";
import type { z } from "zod";
import { fetchMigration } from "../odinApi/migration";

interface RequestState<T> { path: string | null; loading: boolean; data?: T; error?: string }

export function useMigrationRequest<T>(path: string | null, schema: z.ZodType<T>, refresh = 0, keepWhileLoading = false) {
  const [state, setState] = useState<RequestState<T>>({ path, loading: !!path });
  useEffect(() => {
    if (!path) { setState({ path, loading: false }); return; }
    const controller = new AbortController();
    setState((previous) => ({ path, loading: true, data: keepWhileLoading && previous.path === path ? previous.data : undefined }));
    fetchMigration(path, schema, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setState({ path, loading: false, data }); },
      (error: unknown) => { if (!controller.signal.aborted) setState({ path, loading: false, error: error instanceof Error ? error.message : "The archive request failed." }); },
    );
    return () => controller.abort();
  }, [path, schema, refresh, keepWhileLoading]);
  return state.path === path ? state : { path, loading: !!path } as RequestState<T>;
}
