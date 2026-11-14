import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Grid, LinearProgress, Paper, Stack, Tab, Tabs, Typography, useMediaQuery, useTheme } from "@mui/material";
import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import type { z } from "zod";
import { FREQMODE_COLOURS } from "../definitions";
import { createApiClient, schemas } from "../odinApi/client";
import { L1ScanInfoPlot } from "./L1ScanInfoPlot";
import { OdinCalendar, type ObservationEvent } from "./OdinCalendar";
import { ScanTable } from "./ScanTable";
import { L1BPlots } from "./plots/L1b";
import { OdinTrack } from "./plots/OdinTrack";

dayjs.extend(utc);
type ScanInfo = z.infer<typeof schemas.freqmode_info>;
type Log = z.infer<typeof schemas.Log>;
const api = createApiClient("/");

export default function CalendarView() {
  const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(() => dayjs.utc("2015-01-01"));
  const [scaninfo, setScaninfo] = useState<ScanInfo[]>([]);
  const [selected, setSelected] = useState<{ day: string; fm: number; backend?: string; id?: string }>();
  const [log, setLog] = useState<Log[]>();
  const [scanId, setScanId] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [loadingScans, setLoadingScans] = useState(false);
  const [error, setError] = useState<string>();
  const [scanError, setScanError] = useState<string>();
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState("map");
  const [pickerOpen, setPickerOpen] = useState(true);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true); setError(undefined); setScaninfo([]);
    api.getRest_apiv5period_infoYearMonthDay({ params: { day: "01", month: currentMonth.format("MM"), year: currentMonth.format("YYYY") }, queries: { length: currentMonth.daysInMonth() }, signal: controller.signal })
      .then((data) => { if (active) setScaninfo(data.Data); })
      .catch(() => { if (active) setError("Observation records could not be loaded. Try again or choose another month."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [currentMonth, retry]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLog(undefined); setScanError(undefined); setScanId(undefined);
    if (!selected) { setLoadingScans(false); return () => controller.abort(); }
    setLoadingScans(true);
    api.getRest_apiv5freqmode_infoDateFreqmode({ params: { date: selected.day, freqmode: selected.fm }, signal: controller.signal })
      .then((data) => { if (active) setLog(data.Data); })
      .catch(() => { if (active) setScanError("Scans could not be loaded for this day and frequency mode. Try again."); })
      .finally(() => { if (active) setLoadingScans(false); });
    return () => { active = false; controller.abort(); };
  }, [selected, retry]);

  const events: ObservationEvent[] = scaninfo.flatMap((entry, index) => entry.Date ? [{
    id: String(index), start: entry.Date, title: `${entry.Backend ?? "Unspecified backend"} · ${entry.FreqMode === undefined ? "Unspecified mode" : `FM ${entry.FreqMode}`} · ${entry.NumScan ?? "Missing"} scans`,
    color: entry.FreqMode === undefined ? undefined : FREQMODE_COLOURS[entry.FreqMode], extendedProps: { fm: entry.FreqMode, backend: entry.Backend },
  }] : []);
  const choose = (event: ObservationEvent) => {
    if (typeof event.extendedProps?.fm !== "number") return;
    setSelected({ day: event.start.slice(0, 10), fm: event.extendedProps.fm, backend: String(event.extendedProps.backend ?? "Unspecified"), id: event.id });
    setScanId(undefined); setView("map"); setPickerOpen(false);
  };
  const chooseMonth = (month: Dayjs) => { setCurrentMonth(month.startOf("month")); setSelected(undefined); setScanId(undefined); setLog(undefined); setPickerOpen(true); };
  const rows = (log ?? []).flatMap((row) => row.ScanID === undefined ? [] : [{ scanid: row.ScanID, time: row.DateTime, lat: row.LatStart, lon: row.LonStart, quality: row.Quality, sza: row.SunZD }]);
  const track = rows.map((row) => ({ lat: row.lat, lon: row.lon, scanid: row.scanid }));

  return <Box sx={{ p: { xs: 2, sm: 3, xl: 4 }, maxWidth: 1920, mx: "auto" }}><Stack spacing={2}>
    <Box><Button component={RouterLink} to="/explore">← Explore observations</Button></Box>
    <Box><Typography component="h1" variant="h3">Level 1 observations</Typography>
      {!selected && <Typography color="text.secondary" sx={{ mt: 1 }}>Choose a day and frequency mode, then explore a scan on the map.</Typography>}</Box>
    <Accordion expanded={pickerOpen} onChange={(_, expanded) => setPickerOpen(expanded)} disableGutters variant="outlined">
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="l1-period" id="l1-period-heading"><Typography component="h2" variant="subtitle1">{selected ? `Change observation · ${selected.day} UTC · FM ${selected.fm}` : "Choose a day & frequency mode"}</Typography></AccordionSummary>
      <AccordionDetails id="l1-period" sx={{ p: 0 }}>
        {error && <Alert severity="error" action={<Button onClick={() => setRetry(retry + 1)}>Retry</Button>} sx={{ m: 2 }}>{error}</Alert>}
        <OdinCalendar loading={loading} events={events} month={currentMonth} setMonth={chooseMonth} onSelect={choose} selectedId={selected?.id} unavailable={!!error} />
      </AccordionDetails>
    </Accordion>
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }} aria-live="polite">
      <Chip label={selected ? `${selected.backend}` : "1. Choose a day and frequency mode"} variant="outlined" />
      <Chip label={scanId === undefined ? "2. Select a scan" : `Scan ${scanId}`} color={scanId === undefined ? "default" : "primary"} />
      {scanId !== undefined && (!phone || view !== "spectrum") && <Button onClick={() => { if (phone) { setView("spectrum"); requestAnimationFrame(() => document.getElementById("l1-panel-spectrum")?.scrollIntoView({ behavior: "smooth", block: "start" })); } else document.getElementById("l1-panel-spectrum")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>View spectrum</Button>}
    </Stack>
    {loadingScans && <Box role="status"><LinearProgress /><Typography sx={{ mt: 1 }}>Loading scans…</Typography></Box>}
    {scanError && <Alert severity="error" action={<Button onClick={() => setRetry(retry + 1)}>Retry</Button>}>{scanError}</Alert>}
    {log && !log.length && <Alert severity="info">No scans are stored for this day and frequency mode.</Alert>}
    {phone && <Tabs value={view} onChange={(_, next: string) => setView(next)} variant="scrollable" scrollButtons="auto" aria-label="Observation view">
      {["map", "geometry", "spectrum"].map((value) => <Tab key={value} label={value} value={value} id={`l1-tab-${value}`} aria-controls={`l1-panel-${value}`} />)}
    </Tabs>}
    <Grid container spacing={2}>
      {(!phone || view === "map") && <Grid size={{ xs: 12, md: 7 }}><Paper variant="outlined" role={phone ? "tabpanel" : undefined} id="l1-panel-map" aria-labelledby={phone ? "l1-tab-map" : undefined} sx={{ p: 2, minHeight: { xs: 440, md: 480 }, display: "flex", flexDirection: "column" }}>
        <Typography component="h2" variant="h6" sx={{ mb: 1 }}>Scan start locations</Typography>
        <OdinTrack key={`${selected?.day}/${selected?.fm}`} data={log === undefined ? undefined : track} scanid={scanId} selectedScanid={setScanId} loading={loadingScans} />
      </Paper></Grid>}
      {(!phone || view === "geometry") && <Grid size={{ xs: 12, md: 5 }}><Paper variant="outlined" role={phone ? "tabpanel" : undefined} id="l1-panel-geometry" aria-labelledby={phone ? "l1-tab-geometry" : undefined} sx={{ p: 2, minHeight: { xs: 440, md: 480 }, display: "flex", flexDirection: "column" }}>
        <Typography component="h2" variant="h6">Solar geometry</Typography>
        <Box sx={{ flex: 1, minHeight: 0 }}><L1ScanInfoPlot data={log} scanid={scanId} selectedScanid={setScanId} /></Box>
      </Paper></Grid>}
    </Grid>
    {(!phone || view === "spectrum") && <Box role={phone ? "tabpanel" : undefined} id="l1-panel-spectrum" aria-labelledby={phone ? "l1-tab-spectrum" : undefined} sx={{ scrollMarginTop: 100 }}><L1BPlots scanid={scanId} freqmode={selected?.fm} /></Box>}
    {!!rows.length && <Accordion disableGutters variant="outlined">
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="l1-scans" id="l1-scans-heading"><Typography component="h2" variant="subtitle1">Scan list & exact values · {rows.length}</Typography></AccordionSummary>
      <AccordionDetails id="l1-scans"><ScanTable rows={rows} selected={scanId} onSelect={setScanId} /></AccordionDetails>
    </Accordion>}
  </Stack></Box>;
}
