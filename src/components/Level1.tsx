import Alert from "@mui/material/Alert";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLevel2Stats } from "../hooks/Level2Stats";
import { InspectMenu } from "./InspectMenu";
import StackedBarPlot from "./StackedBarPlot";
import StackedBarPlotCompare from "./StackedBarPlottCompare";

export const Level1 = () => {
  const { year } = useParams<{ year: string }>();
  const validYear = year !== undefined && /^\d{1,4}$/.test(year) && Number(year) >= 1 && Number(year) <= 9999;
  return <StatisticsView key={year ?? "annual"} focusYear={validYear ? Number(year) : null} invalidYear={year !== undefined && !validYear} />;
};

function StatisticsView({ focusYear, invalidYear }: { focusYear: number | null; invalidYear: boolean }) {
  const navigate = useNavigate();
  const [draftYear, setDraftYear] = useState(focusYear === null ? "" : String(focusYear));
  const validDraft = /^\d{1,4}$/.test(draftYear) && Number(draftYear) >= 1 && Number(draftYear) <= 9999;
  const level2 = useLevel2Stats(focusYear);
  const chooseYear = (selected: number) => navigate(`/level1/statistics/${selected}`);
  return <Grid container sx={{ p: { xs: 2, sm: 3, xl: 4 }, maxWidth: 1920, mx: "auto" }} spacing={2}>
    <Grid size={12}>
      <Typography component="h1" variant="h3">Measurement statistics</Typography>
      <Stack direction="row" sx={{ mt: 1, gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <Typography color="text.secondary">Inspect a year to compare monthly Level 1 and Level 2 records.</Typography>
        <InspectMenu label="Choose year" title="Comparison year" description="Enter any calendar year from 1 to 9999">
          {(close) => <Stack component="form" spacing={2} onSubmit={(event) => { event.preventDefault(); if (validDraft) { chooseYear(Number(draftYear)); close(); } }}>
            <TextField label="Comparison year" value={draftYear} onChange={(event) => setDraftYear(event.target.value)} size="small" placeholder="2015" slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]{1,4}", maxLength: 4 } }} />
            <Button variant="contained" type="submit" disabled={!validDraft}>View monthly</Button>
          </Stack>}
        </InspectMenu>
        {focusYear !== null && <Button onClick={() => navigate("/level1/statistics")}>Clear comparison</Button>}
      </Stack>
    </Grid>
    {invalidYear && <Grid size={12}><Alert severity="warning">The requested comparison year is invalid. Enter a calendar year from 1 to 9999.</Alert></Grid>}
    <Grid size={{ xs: 12, lg: focusYear === null ? 12 : 6 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography component="h2" variant="h6">Annual distribution</Typography>
        <Typography variant="body2" color="text.secondary">Signed stored scan-count sums · calendar year</Typography>
        <Box sx={{ minHeight: { xs: 560, sm: 460 } }}><StackedBarPlot updateYear={chooseYear} /></Box>
      </Paper>
    </Grid>
    {focusYear !== null && <Grid size={{ xs: 12, lg: 6 }}>
      <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={1}>
        <Typography component="h2" variant="h6">{focusYear} monthly distribution vs. L2</Typography>
        <Typography variant="body2" color="text.secondary">Each month: Level 1 on the left · Level 2 on the right. Colors identify frequency modes. Missing counts stay missing.</Typography>
        {level2.loading && <Typography role="status">Loading Level 2 comparison statistics…</Typography>}
        {level2.error && <Alert severity="warning">{level2.error}</Alert>}
        {!level2.error && !!level2.failedModes.length && <Alert severity="warning">Level 2 statistics are unavailable for frequency modes {level2.failedModes.join(", ")}. Their counts remain missing and have not been replaced with zero.</Alert>}
        {!level2.loading && <Box sx={{ minHeight: { xs: 580, sm: 460 } }}><StackedBarPlotCompare year={focusYear} level2={level2.rows} /></Box>}
      </Stack></Paper>
    </Grid>}
  </Grid>;
}
