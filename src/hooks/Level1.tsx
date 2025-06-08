import { useEffect, useState } from "react";
import { z } from "zod";
import { Dayjs } from "dayjs";

const Entry = z.object({
  Date: z.string(),
  Backend: z.string(),
  FreqMode: z.number(),
  NumScan: z.number(),
  URL: z.string(),
});
const Schema = z.object({
  PeriodStart: z.string(),
  PeriodEnd: z.string(),
  Type: z.string(),
  Count: z.number(),
  Data: z.array(Entry),
});

export type L1Response = z.infer<typeof Schema>;

export function useLevel1(date: Dayjs, numDays: number = 30) {
  const [series, setSeries] = useState<L1Response>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/rest_api/v5/period_info/${date.format(
          "YYYY"
        )}/${date.format("MM")}/${date.format("DD")}/?length=${numDays}`
      );
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
  }, [date, numDays]);

  return { series, loading, error };
}
