import { useEffect, useState } from "react";
import { z } from "zod";

const Urls = z.object({
  "URL-log": z.string(),
  "URL-spectra": z.string(),
  "URL-ptz": z.string(),
});

const Entry = z.object({
  DateTime: z.string(),
  FreqMode: z.number(),
  LatStart: z.number(),
  LatEnd: z.number(),
  LonStart: z.number(),
  LonEnd: z.number(),
  SunZD: z.number(),
  AltStart: z.number(),
  AltEnd: z.number(),
  NumSpec: z.number(),
  MJDStart: z.number(),
  MJDEnd: z.number(),
  ScanID: z.number(),
  Quality: z.number(),
  URLS: Urls,
});
const Schema = z.object({
  Type: z.string(),
  Count: z.number(),
  Data: z.array(Entry),
});

export type L1FreqmodeInfoResponse = z.infer<typeof Schema>;

export function useL1FreqmodeInfo(url: string | undefined) {
  const [series, setSeries] = useState<L1FreqmodeInfoResponse>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (url === undefined) return;
    const getData = async () => {
      setLoading(true);
      setError(null);
      const response = await fetch(url);
      const json = await response.json();
      const result = Schema.safeParse(json);
      if (result.success) {
        setSeries(result.data);
      } else {
        setError(result.error.toString());
      }
      setLoading(false);
    };
    getData();
  }, [url]);

  return { series, loading, error };
}
