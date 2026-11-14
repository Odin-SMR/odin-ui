import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import type { z } from "zod";
import { FREQMODE_COLOURS } from "../definitions";
import { createApiClient, schemas } from "../odinApi/cloud_client";
import { L2ProductPlots } from "./L2ProductPlots";
import { OdinCalendar, type ObservationEvent } from "./OdinCalendar";
import { ScanTable } from "./ScanTable";
import { OdinTrack } from "./plots/OdinTrack";

dayjs.extend(utc);
const api = createApiClient("/api");
type FreqModeDays = z.infer<typeof schemas.FreqModeDays>;
type Scans = z.infer<typeof schemas.Scans>;

export function L2Calendar() {
  const params = useParams<{ year: string; month: string; day: string; fm: string }>();
  const navigate = useNavigate();
  const monthKey = params.year && params.month ? `${params.year}-${params.month.padStart(2, "0")}` : "2015-01";
  const currentMonth = dayjs.utc(`${monthKey}-01`);
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) && currentMonth.isValid();
  const requestedDay = params.day ? `${monthKey}-${params.day.padStart(2, "0")}` : undefined;
  const validDay = requestedDay && dayjs.utc(requestedDay).format("YYYY-MM-DD") === requestedDay;
  const fm = params.fm !== undefined && /^\d+$/.test(params.fm) && Number.isSafeInteger(Number(params.fm)) ? Number(params.fm) : undefined;
  const selected = validDay && fm !== undefined ? { day: requestedDay, fm } : undefined;
  const [openPeriod, setOpenPeriod] = useState<string>();
  const [calendar, setCalendar] = useState<FreqModeDays>([]);
  const [scans, setScans] = useState<Scans>([]);
  const [scanId, setScanId] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [loadingScans, setLoadingScans] = useState(false);
  const [error, setError] = useState<string>();
  const [scanError, setScanError] = useState<string>();
  const [retry, setRetry] = useState(0);
  const dayKey = selected?.day;
  const modeKey = selected?.fm;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setCalendar([]); setError(undefined); setLoading(validMonth);
    if (validMonth) api.l2_calendar_calendar_get({ queries: { month: Number(monthKey.slice(5)), year: Number(monthKey.slice(0, 4)) }, signal: controller.signal })
      .then((data) => { if (active) setCalendar(data); })
      .catch(() => { if (active) setError("Level 2 observation records could not be loaded. Try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [monthKey, validMonth, retry]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setScans([]); setScanId(undefined); setScanError(undefined);
    setLoadingScans(dayKey !== undefined && modeKey !== undefined);
    if (dayKey !== undefined && modeKey !== undefined) api.dayscans_scans_get({ queries: { day: dayKey, fm: modeKey }, signal: controller.signal })
      .then((data) => { if (active) setScans(data); })
      .catch(() => { if (active) setScanError("Scans could not be loaded for this day and frequency mode. Try again."); })
      .finally(() => { if (active) setLoadingScans(false); });
    return () => { active = false; controller.abort(); };
  }, [dayKey, modeKey, retry]);

  const events: ObservationEvent[] = calendar.map((entry) => ({ id: `${entry.day}-${entry.freqmode}`, start: entry.day,
    title: `FM ${entry.freqmode} · ${entry.count} scans`, color: FREQMODE_COLOURS[entry.freqmode], extendedProps: { fm: entry.freqmode } }));
  const choose = (event: ObservationEvent) => {
    const date = dayjs.utc(event.start);
    setOpenPeriod(undefined);
    navigate(`/level2/calendar/${date.year()}/${date.month() + 1}/${date.date()}/${String(event.extendedProps?.fm)}`);
  };

  return <Box sx={{ p: { xs: 2, sm: 3, xl: 4 }, maxWidth: 1920, mx: "auto" }}><Stack spacing={2}>
    <Box><Button component={RouterLink} to="/explore">← Explore observations</Button></Box>
    <Box><Typography component="h1" variant="h3">Level 2 retrievals</Typography>
      {!selected && <Typography color="text.secondary" sx={{ mt: 1 }}>Choose an observation, then select a map point to explore atmospheric profiles.</Typography>}</Box>
    {(!validMonth || (params.day && !selected)) && <Alert severity="warning">This date or frequency mode is invalid. Choose a valid month and observation from the catalogue.</Alert>}
    <Accordion expanded={!selected || openPeriod === `${selected.day}/${selected.fm}`} onChange={(_, expanded) => setOpenPeriod(expanded && selected ? `${selected.day}/${selected.fm}` : undefined)} disableGutters variant="outlined">
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="l2-period" id="l2-period-heading"><Typography component="h2" variant="subtitle1">{selected ? `Change observation · ${selected.day} UTC · FM ${selected.fm}` : "Choose a day & frequency mode"}</Typography></AccordionSummary>
      <AccordionDetails id="l2-period" sx={{ p: 0 }}>
        {error && <Alert severity="error" action={<Button onClick={() => setRetry(retry + 1)}>Retry</Button>} sx={{ m: 2 }}>{error}</Alert>}
        <OdinCalendar loading={loading} unavailable={!!error || !validMonth} events={events} month={validMonth ? currentMonth : dayjs.utc("2015-01-01")} onSelect={choose}
          setMonth={(date) => navigate(`/level2/calendar/${date.year()}/${date.month() + 1}`)} selectedId={selected ? `${selected.day}-${selected.fm}` : undefined} />
      </AccordionDetails>
    </Accordion>
    <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", alignItems: "center" }} aria-live="polite"><Chip variant="outlined" label={selected ? `${selected.day} UTC · FM ${selected.fm}` : "1. Choose a day and frequency mode"} />
      <Chip color={scanId === undefined ? "default" : "primary"} label={scanId === undefined ? "2. Select a scan" : `Scan ${scanId}`} />
      {scanId !== undefined && <Button onClick={() => document.getElementById("l2-profiles")?.scrollIntoView({ behavior: "smooth", block: "start" })}>View profiles</Button>}
    </Stack>
    {loadingScans && <Box role="status"><LinearProgress /><Typography sx={{ mt: 1 }}>Loading Level 2 scans…</Typography></Box>}
    {scanError && <Alert severity="error" action={<Button onClick={() => setRetry(retry + 1)}>Retry</Button>}>{scanError}</Alert>}
    {selected && !loadingScans && !scanError && !scans.length && <Alert severity="info">No scans are stored for this day and frequency mode.</Alert>}
    <Paper variant="outlined" sx={{ p: 2, minHeight: { xs: 440, md: 500 }, display: "flex", flexDirection: "column" }}>
      <Typography component="h2" variant="h6" sx={{ mb: 1 }}>Scan start locations</Typography>
      <OdinTrack key={`${dayKey}/${modeKey}`} data={selected ? scans : undefined} scanid={scanId} selectedScanid={setScanId} loading={loadingScans} />
    </Paper>
    <Box id="l2-profiles" sx={{ scrollMarginTop: 100 }}><L2ProductPlots scanid={scanId} day={selected?.day} /></Box>
    {!!scans.length && <Accordion disableGutters variant="outlined">
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="l2-scans" id="l2-scans-heading"><Typography component="h2" variant="subtitle1">Scan list & exact values · {scans.length}</Typography></AccordionSummary>
      <AccordionDetails id="l2-scans"><ScanTable rows={scans} selected={scanId} onSelect={setScanId} /></AccordionDetails>
    </Accordion>}
  </Stack></Box>;
}
