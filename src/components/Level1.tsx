import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StackedBarPlot from "./StackedBarPlot";
import { createApiClient } from "../odinApi/cloud_client";
import StackedBarPlotCompare from "./StackedBarPlottCompare";
import { FREQMODES } from "../definitions";
const api = createApiClient("/api");




const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1); // [1..12]
type ApiRow = {
  month: number;
  freqmode: number;
  count: number;
};
type GroupedRow = {
  group: number;            // month
  [freqmode: number]: number; // e.g. 1, 2, 8, 13, 14: counts
};



export const Level1 = () => {
  const { year } = useParams<{ year: string }>();
  const [focusYear, setFocusYear] = useState<number | null>(
    year ? parseInt(year, 10) : null
  );
  const [stats, setStats] = useState<GroupedRow[]>([]);
  const handleFocusYearUpdate = (year: number) => {
    setFocusYear(year);
  };

useEffect(() => {
  const year = focusYear ?? 2025;
  if (!year) return;

  let cancelled = false;

  const getData = async () => {
    try {
      // 1. Call all freqmodes in parallel, but don't abort on failure
      const results = await Promise.allSettled(
        FREQMODES.map(fm =>
          api.l2_stats_stats_get({ queries: { fm, year } }) as Promise<ApiRow[]>
        )
      );

      // 2. Collect all successful rows
      const allRows: ApiRow[] = [];
      results.forEach((res, index) => {
        const fm = FREQMODES[index];
        if (res.status === "fulfilled") {
          allRows.push(...res.value);
        } else {
          console.error(`fm=${fm} failed, keeping zeros`, res.reason);
          // no need to push zeros here, we'll have a zero-initialized grid
        }
      });

      // 3. Create a full month × freqmode grid initialized to 0
      const groupedMap: Record<number, GroupedRow> = MONTHS.reduce(
        (acc, month) => {
          const row: GroupedRow = { group: month };
          FREQMODES.forEach(fm => {
            row[fm] = 0;
          });
          acc[month] = row;
          return acc;
        },
        {} as Record<number, GroupedRow>
      );

      // 4. Fill in actual values from API (overwrite zeros)
      allRows.forEach(({ month, freqmode, count }) => {
        if (!groupedMap[month]) return; // safety, in case month is out of 1–12
        groupedMap[month][freqmode] = count;
      });

      const grouped = Object.values(groupedMap); // already in month order

      if (!cancelled) {
        setStats(grouped);
      }
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };
  setStats([])
  getData();

  return () => {
    cancelled = true;
  };
}, [focusYear]);

useEffect(()=>{console.log(stats)},[stats])

  return (
    <>
      <Grid container padding={2} spacing={2}>
        <Grid>
          <Typography variant="h3"> Distribution of measurements (L1)</Typography>
        </Grid>
        {/* <DonutChart width={400} height={400} data={series} /> */}
        <Grid size={12} height={"30vh"}>
          <StackedBarPlot updateYear={handleFocusYearUpdate} />
        </Grid>
        {focusYear === null && (
          <Grid>
            <Typography variant="body1">
              Click on a bar to view monthly distribution that year
            </Typography>
          </Grid>
        )}
        {focusYear && (
          <Grid>
            <Typography variant="h3">
              {`${focusYear} monthly distribution vs. L2`}
            </Typography>
          </Grid>
        )}
        {focusYear && (
          <Grid size={12} height={"30vh"}>
            <StackedBarPlotCompare year={focusYear} level2={stats}/>
          </Grid>
        )}
      </Grid>
    </>
  );
};
