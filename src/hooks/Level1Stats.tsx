import { useEffect, useState } from "react";
import { z } from "zod";

const ValuePair = z.tuple([z.number(), z.number()]);
const SeriesData = z.array(ValuePair);
const DataSchema = z.record(SeriesData);

const TotalSchema = z.object({
  Data: DataSchema,
  Years: z.array(z.number()),
});

const YearSchema = z.object({
  Data: DataSchema,
  Months: z.array(z.number()),
  Year: z.number(),
});

export type TotalResponse = z.infer<typeof TotalSchema>;
export type YearResponse = z.infer<typeof YearSchema>;

export function useFrequencyModeData(year: number | null) {
  const [series, setSeries] = useState<TotalResponse | YearResponse>({
    Data: { "0": [[0, 0]] },
    Years: [0],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (year === null) {
      const getData = async () => {
        setLoading(true);
        setError(null);
        const response = await fetch(
          "https://odin-smr.org/rest_api/v5/statistics/freqmode/timeline/"
        );
        const json = await response.json();
        const result = TotalSchema.safeParse(json);
        if (result.success) {
          setSeries(result.data);
        } else {
          setError(result.error.toString());
        }
        setLoading(false);
      };
      getData();
    } else {
      const getData = async () => {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `https://odin-smr.org/rest_api/v5/statistics/freqmode/timeline/?year=${year}`
        );
        const json = await response.json();
        const result = YearSchema.safeParse(json);
        if (result.success) {
          setSeries(result.data);
        } else {
          setError(result.error.toString());
        }
        setLoading(false);
      };
      getData();
    }
  }, [year]);

  return { series, loading, error };
}
