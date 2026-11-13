import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { migrationTimelineDownload, useMigrationTimeline, type MigrationTimelineResult } from "../hooks/MigrationTimeline";
import { FrequencyTimelinePlot } from "./StackedBarPlot";
import { InspectMenu } from "./InspectMenu";

function download(result: MigrationTimelineResult, name: string) {
  const objectUrl = URL.createObjectURL(new Blob([migrationTimelineDownload(result)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = objectUrl;
  link.download = `${result.release.replace(/[^a-zA-Z0-9_-]/g, "_")}-${name}.json`;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export default function MigrationTimeline({ release }: { release: string }) {
  const [refresh, setRefresh] = useState(0);
  const [yearText, setYearText] = useState("2015");
  const [year, setYear] = useState<number | null>(null);
  const annual = useMigrationTimeline(release, null, undefined, refresh);
  const monthly = useMigrationTimeline(year === null ? null : release, year, year === null ? undefined : annual.result?.pins);
  useEffect(() => { setYear(null); }, [release]);
  const validYear = /^\d{1,4}$/.test(yearText) && Number(yearText) >= 1 && Number(yearText) <= 9999;
  const chooseYear = (next: number) => { setYearText(String(next)); setYear(next); };
  return <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
    <Typography component="h2" variant="h6">Archived L1 frequency-mode timeline</Typography>
    <Typography variant="caption">Signed stored scan-count sums · all archived backends. Missing counts remain missing.</Typography>
    <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
      <InspectMenu label="Statistics year" description="Choose a calendar year, including years outside the overview">
        {(close) => <Stack component="form" spacing={2} onSubmit={(event) => { event.preventDefault(); if (annual.result && validYear) { chooseYear(Number(yearText)); close(); } }}>
          <TextField label="Statistics year" type="number" value={yearText} disabled={!annual.result} onChange={(event) => setYearText(event.target.value)}
            helperText="Calendar years 1–9999, including years outside the annual overview." slotProps={{ htmlInput: { min: 1, max: 9999, step: 1 } }} />
          <Button type="submit" disabled={!annual.result || !validYear}>Show monthly statistics</Button>
        </Stack>}
      </InspectMenu>
      {year !== null && <Button onClick={() => setYear(null)}>Clear monthly view</Button>}
      <InspectMenu label="Statistics details" description="Download statistics and inspect the pinned release">
        <Stack spacing={2}>
          <Button disabled={!annual.result} onClick={() => annual.result && download(annual.result, "l1-timeline-annual")}>Download annual statistics JSON</Button>
          {annual.result && <Button component="a" href={annual.result.url}>Open annual source JSON</Button>}
          <Button disabled={annual.loading} onClick={() => setRefresh((value) => value + 1)}>Reload archive statistics</Button>
          {annual.result && <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>Statistics release: {release} · Timeline SHA256: {annual.result.pins.timeline_sha256} · Archive manifest SHA256: {annual.result.pins.source_manifest_sha256}</Typography>}
        </Stack>
      </InspectMenu>
    </Stack>
    <Box sx={{ minHeight: { xs: 560, sm: 460 } }}><FrequencyTimelinePlot data={annual.result?.data ?? { Data: {}, Years: [] }} loading={annual.loading} error={annual.error ?? null} updateYear={chooseYear} /></Box>
    {year !== null && annual.result && <>
      <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <Typography component="h3" variant="h6">{year} monthly archived L1 statistics</Typography>
        <InspectMenu label="Monthly details" description="Download the selected month's source statistics">
          <Stack spacing={2}>
            <Button disabled={!monthly.result} onClick={() => monthly.result && download(monthly.result, `l1-timeline-${year}`)}>Download monthly statistics JSON</Button>
            {monthly.result && <Button component="a" href={monthly.result.url}>Open monthly source JSON</Button>}
          </Stack>
        </InspectMenu>
      </Stack>
      <Box sx={{ minHeight: { xs: 560, sm: 460 } }}><FrequencyTimelinePlot data={monthly.result?.data ?? { Data: {}, Months: [], Year: year }} loading={monthly.loading} error={monthly.error ?? null} /></Box>
    </>}
  </Stack></Paper>;
}
