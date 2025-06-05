import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useParams } from "react-router-dom";
import StackedBarPlot from "./StackedBarPlot";

export const Level1 = () => {
  const { year } = useParams<{ year: string }>();
  const [focusYear, setFocusYear] = useState<number | null>(
    year ? parseInt(year, 10) : null
  );
  const handleFocusYearUpdate = (year: number) => {
    setFocusYear(year);
  };
  return (
    <>
      <Grid container padding={2} spacing={2}>
        <Grid>
          <Typography variant="h3"> Distribution of measurements</Typography>
        </Grid>
        {/* <DonutChart width={400} height={400} data={series} /> */}
        <Grid size={12} height={"30vh"}>
          <StackedBarPlot updateYear={handleFocusYearUpdate} year={null} />
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
              {`${focusYear} monthly distribution`}
            </Typography>
          </Grid>
        )}
        {focusYear && (
          <Grid size={12} height={"30vh"}>
            <StackedBarPlot year={focusYear} />
          </Grid>
        )}
      </Grid>
    </>
  );
};
