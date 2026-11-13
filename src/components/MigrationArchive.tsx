import { OdinCalendar } from "./OdinCalendar";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useMigrationRequest } from "../hooks/Migration";
import {
  canonicalMigrationBackend, migrationBackendOptions, migrationCalendarSchema, migrationDownload, migrationL1bSchema, migrationMonth,
  migrationPaths, migrationScansSchema, migrationSingleLogSchema, migrationStatusSchema,
} from "../odinApi/migration";
import { OdinTrack } from "./plots/OdinTrack";
import PilotSpectrum from "./plots/PilotSpectrum";
import MigrationTimeline from "./MigrationTimeline";
import { InspectMenu } from "./InspectMenu";

const statusLabels = {
  not_configured: "Awaiting migration", not_started: "Awaiting migration", planning: "Planning", exporting: "Exporting",
  validating: "Validating", validated: "Validated", failed: "Migration failed", limit_exceeded: "Migration limit reached",
  waiting_for_source: "Waiting for source",
  interrupted: "Migration interrupted", unavailable: "Status unavailable",
};
const showValue = (value: unknown, unit = "") => value === null || value === undefined ? "Missing" : `${String(value)}${unit}`;
const gib = (bytes: number) => (bytes / 1024 ** 3).toLocaleString(undefined, { maximumFractionDigits: 2 });

function download(response: Record<string, unknown>, release: string, url: string, filename: string) {
  const objectUrl = URL.createObjectURL(new Blob([migrationDownload(response, release, url)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${release.replace(/[^a-zA-Z0-9_-]/g, "_")}-${filename}.json`;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export default function MigrationArchive() {
  const [refresh, setRefresh] = useState(0);
  const [date, setDate] = useState("2015-01-11");
  const [selectedBackend, setSelectedBackend] = useState("AC2");
  const [selectedMode, setSelectedMode] = useState(1);
  const [selectedScan, setSelectedScan] = useState<number>();
  const [directId, setDirectId] = useState("");
  const [directBackend, setDirectBackend] = useState("AC2");
  const [directMode, setDirectMode] = useState(1);
  const [direct, setDirect] = useState<{ scan: number; backend: string; mode: number }>();
  const statusRequest = useMigrationRequest(migrationPaths.status, migrationStatusSchema, refresh, true);
  const status = statusRequest.data;
  const ready = status?.ready === true;
  const release = ready ? status.release_id : null;
  const period = migrationMonth(date, status?.coverage);
  const start = status?.coverage.date_start, end = status?.coverage.date_end;
  useEffect(() => {
    if (ready) return;
    const timer = window.setInterval(() => setRefresh((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, [ready]);

  const calendar = useMigrationRequest(release && period ? migrationPaths.calendar(period.start, period.length, release) : null, migrationCalendarSchema);
  const dayRows = (calendar.data?.Data ?? []).filter((row) => row.Date === date);
  const identifiable = dayRows.filter((row) => row.Backend !== null && row.FreqMode !== null);
  const backends = migrationBackendOptions(identifiable.map((row) => row.Backend as string));
  const backend = backends.includes(selectedBackend) ? selectedBackend : backends[0];
  const modes = Array.from(new Set(identifiable.filter((row) => canonicalMigrationBackend(row.Backend as string) === backend).map((row) => row.FreqMode as number))).sort((a, b) => a - b);
  const mode = modes.includes(selectedMode) ? selectedMode : modes[0];
  const scans = useMigrationRequest(release && period && backend && mode !== undefined
    ? migrationPaths.scans(date, mode, backend, release) : null, migrationScansSchema);
  const scanRows = scans.data?.Data ?? [];
  const listedScan = scanRows.find((row) => row.ScanID === selectedScan)?.ScanID
    ?? scanRows.find((row) => row.ScanID === 7013927028)?.ScanID ?? scanRows[0]?.ScanID;
  const selection = direct ?? (listedScan !== undefined && backend && mode !== undefined ? { scan: listedScan, backend, mode } : undefined);
  const logPath = release && selection ? migrationPaths.log(selection.mode, selection.scan, selection.backend, release) : null;
  const supportsSpectra = selection && status?.serving.spectra_backends.some((value) => canonicalMigrationBackend(value) === selection.backend);
  const spectrumPath = release && selection && supportsSpectra ? migrationPaths.spectra(selection.mode, selection.scan, selection.backend, release) : null;
  const log = useMigrationRequest(logPath, migrationSingleLogSchema);
  const spectra = useMigrationRequest(spectrumPath, migrationL1bSchema);
  const changeDate = (next: string) => { setDate(next); setSelectedScan(undefined); setDirect(undefined); };
  const selectScan = (next: number | undefined) => { setSelectedScan(next); setDirect(undefined); };
  const track = scanRows.flatMap((row) => typeof row.LatStart === "number" && Number.isFinite(row.LatStart)
    && row.LatStart >= -90 && row.LatStart <= 90 && typeof row.LonStart === "number" && Number.isFinite(row.LonStart)
    ? [{ lat: row.LatStart, lon: row.LonStart, scanid: row.ScanID }] : []);
  const failed = status && ["failed", "limit_exceeded", "interrupted", "unavailable"].includes(status.status);
  const tableRows = Object.values(status?.tables ?? {}).reduce((total, table) => total + (table.rows ?? 0), 0);
  const calendarEvents = (calendar.data?.Data ?? []).map((row, index) => ({
    id: String(index), start: row.Date, allDay: true,
    title: `${row.Backend ?? "Missing backend"} · ${row.FreqMode === null ? "Missing mode" : `FM${row.FreqMode}`} · ${showValue(row.NumScan)}`,
    extendedProps: { backend: row.Backend, mode: row.FreqMode },
  }));
  const directBackends = migrationBackendOptions(status?.coverage.backends ?? []);
  const directBackendValue = directBackends.includes(directBackend) ? directBackend : directBackends[0] ?? "";
  const directModeValue = status?.coverage.freqmodes.includes(directMode) ? directMode : status?.coverage.freqmodes[0];
  const validDirect = /^\d+$/.test(directId) && Number.isSafeInteger(Number(directId)) && !!directBackendValue && directModeValue !== undefined;

  return <Container maxWidth="xl" sx={{ py: 3 }}><Stack spacing={3}>
    <Box><Typography variant="h3" component="h1">Odin S3 archive migration</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>Explore validated scan locations and calibrated spectra.</Typography></Box>
    <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
      <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        <Chip label="Source: S3 Parquet archive" color="primary" variant="outlined" />
        {status && <Chip label={statusLabels[status.status]} color={ready ? "success" : failed ? "error" : "default"} />}
        <Button onClick={() => setRefresh((value) => value + 1)} disabled={statusRequest.loading}>Refresh status</Button>
        {statusRequest.loading && <CircularProgress size={20} aria-label="Loading archive migration status" />}
      </Stack>
      {statusRequest.error && <Alert severity="error">Migration status could not be loaded: {statusRequest.error}</Alert>}
      {status && <>
        <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>Release: {status.release_id ?? "Awaiting release"}</Typography>
        <Typography variant="body2">Stored date catalogue (UTC): {start && end ? `${start} to ${end}` : "Coverage will be published after validation"}</Typography>
        <Box component="details" open={!ready}><Box component="summary" sx={{ cursor: "pointer", py: 1, minHeight: 44 }}>Transfer details</Box><Stack spacing={1}>
        {ready ? <><Typography variant="body2">{Object.keys(status.tables).length} validated tables · {tableRows.toLocaleString()} archived rows</Typography>
          <Typography variant="body2">Archived backends: {status.coverage.backends.join(", ")} · Archived versions: {status.coverage.versions.join(", ")}</Typography></>
          : <Typography variant="body2">Validated table totals will appear when verification finishes.</Typography>}
        {status.counters && <Box><Typography variant="body2">
          {status.counters.export_rows !== undefined && <>{status.counters.export_rows.toLocaleString()} rows exported. </>}
          {status.counters.committed_files !== undefined && <>{status.counters.committed_files.toLocaleString()} files written. </>}
          {status.counters.validation_rows !== undefined && <>{status.counters.validation_rows.toLocaleString()} source rows read for validation. </>}
          {status.counters.source_read_bytes !== undefined && <>{gib(status.counters.source_read_bytes)} GiB read from the source. </>}
          {status.counters.parquet_bytes !== undefined && <>{gib(status.counters.parquet_bytes)} GiB of Parquet written.</>}
        </Typography>
          {(status.counters.exported_units !== undefined || status.counters.validated_units !== undefined) && <Typography variant="body2">
            Transfer sections: {status.counters.exported_units?.toLocaleString() ?? "Unknown"} exported · {status.counters.validated_units?.toLocaleString() ?? "Unknown"} validated
          </Typography>}
          {(status.current_table || status.current_unit) && <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>Current table: {status.current_table ?? "Awaiting next table"}{status.current_unit && ` · Section: ${status.current_unit}`}</Typography>}
        </Box>}
        {status.updated_at && <Typography variant="caption">Progress updated: {status.updated_at}</Typography>}
        </Stack></Box>
        {status.status === "waiting_for_source" && <Alert severity="info">
          {status.waiting_phase === "validating" ? "Validation" : "Transfer"} is waiting for source activity to settle before continuing.
          {status.waiting_writer_count !== undefined && (status.waiting_writer_count > 0
            ? ` Possible writing sessions: ${status.waiting_writer_count}.` : " Confirming the source is quiet before continuing.")}
          {status.writer_wait_seconds !== undefined && ` Waiting for ${status.writer_wait_seconds.toLocaleString()} seconds.`}
        </Alert>}
        {!ready && <Alert severity={failed ? "error" : "info"}>{failed
          ? `The archive is unavailable for discovery. ${status.error ?? status.error_code ?? "Check migration results before retrying."}`
          : "Discovery opens after the entire archive is transferred and independently validated. Status refreshes every 30 seconds."}</Alert>}
        <InspectMenu label="Archive details" description="Coverage, reconstruction availability and validation by table"><Stack spacing={1}>
        <Typography variant="body2">Reconstructed spectra: {status.serving.spectra_backends.join(" and ")}, version {status.serving.spectrum_version}. Other archived backends support catalogue and log discovery. Date bounds describe stored catalogue entries; raw scan identifiers can extend beyond them.</Typography>
        {status.exclusions.length > 0 && <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>Excluded tables: {status.exclusions.join(", ")}</Typography>}
        {!!Object.keys(status.tables).length && <Box component="details"><Box component="summary" sx={{ cursor: "pointer", py: 1, minHeight: 44 }}>Migration results by table</Box>
          <TableContainer sx={{ maxHeight: 300 }}><Table size="small" aria-label="Archive migration results by table">
            <TableHead><TableRow><TableCell>Table</TableCell><TableCell align="right">Rows</TableCell><TableCell>Validation</TableCell></TableRow></TableHead>
            <TableBody>{Object.entries(status.tables).map(([name, table]) => <TableRow key={name}><TableCell>{name}</TableCell><TableCell align="right">{table.rows?.toLocaleString() ?? "Pending"}</TableCell><TableCell>{showValue(table.validation.status)}</TableCell></TableRow>)}</TableBody>
          </Table></TableContainer></Box>}
        </Stack></InspectMenu>
      </>}
    </Stack></Paper>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
      <TextField label="Observation day (UTC)" type="date" value={date} disabled={!ready} sx={{ minWidth: 240 }} onChange={(event) => changeDate(event.target.value)} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: start ?? undefined, max: end ?? undefined } }} />
      <TextField select label="Backend" value={backend ?? ""} disabled={!ready || calendar.loading || !backends.length} sx={{ minWidth: 140 }} onChange={(event) => { setSelectedBackend(event.target.value); setSelectedScan(undefined); setDirect(undefined); }}>{backends.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
      <TextField select label="Frequency mode" value={mode ?? ""} disabled={!ready || calendar.loading || !modes.length} sx={{ minWidth: 180 }} onChange={(event) => { setSelectedMode(Number(event.target.value)); setSelectedScan(undefined); setDirect(undefined); }}>{modes.map((value) => <MenuItem key={value} value={value}>FM {value}</MenuItem>)}</TextField>
    </Stack>
    {ready && !period && <Alert severity="warning">This date is outside the stored catalogue coverage or is invalid. Select a covered day, or look up a scan identifier directly.</Alert>}
    {calendar.loading && <Typography role="status">Loading archive discovery…</Typography>}
    {calendar.error && <Alert severity="error">Archive discovery failed: {calendar.error}</Alert>}
    {calendar.data && !dayRows.length && <Alert severity="info">No catalogue records are stored for this day.</Alert>}
    {dayRows.length > identifiable.length && <Alert severity="warning">{dayRows.length - identifiable.length} catalogue records have a missing backend or frequency mode. Their stored scan counts appear in the calendar; scan lookup requires both identifiers.</Alert>}
    {ready && period && <>
      <Box component="details"><Box component="summary" sx={{ cursor: "pointer", py: 1, minHeight: 44 }}>Choose from the monthly catalogue</Box>
        <Paper variant="outlined" sx={{ p: 2, mt: 1, "& .fc-daygrid-event, & .fc-event-title": { whiteSpace: "normal", overflowWrap: "anywhere" } }}>
          <Typography component="h2" variant="h6">{dayjs(date).format("MMMM YYYY")} · archive catalogue</Typography>
          <Typography variant="caption">Backend · frequency mode · stored scan count</Typography>
      <OdinCalendar loading={calendar.loading} unavailable={!!calendar.error} events={calendarEvents} month={dayjs.utc(date).startOf("month")} minDate={start ?? undefined} maxDate={end ?? undefined}
        setMonth={(next) => { const candidate = next.format("YYYY-MM-DD"); changeDate(start && candidate < start ? start : end && candidate > end ? end : candidate); }}
        onSelect={(event) => { changeDate(event.start.slice(0, 10)); const props = event.extendedProps; if (props?.backend !== null && props?.backend !== undefined && props?.mode !== null && props?.mode !== undefined) { setSelectedBackend(canonicalMigrationBackend(String(props.backend))); setSelectedMode(Number(props.mode)); } }} />
        </Paper>
      </Box>
      <Paper variant="outlined" sx={{ p: 2, minHeight: { xs: 420, md: 480 }, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Typography component="h2" variant="h6">Scan start locations · {date} · {backend} · FM {mode}</Typography>
        <OdinTrack data={track} scanid={selection?.scan} selectedScanid={selectScan} loading={scans.loading} />
      </Paper>
      {scanRows.length > track.length && <Typography variant="caption">{scanRows.length - track.length} scans have missing or invalid start coordinates and are omitted from the map.</Typography>}
    </>}
    {scans.loading && <Typography role="status">Loading archive scans…</Typography>}
    {scans.error && <Alert severity="error">Archive scan lookup failed: {scans.error}</Alert>}
    {scans.data && !scanRows.length && <Alert severity="info">No scans are stored for this day, backend and frequency mode.</Alert>}
    {selection && release && <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
      <Typography variant="h6">Scan {selection.scan} · {selection.backend} · FM {selection.mode}</Typography>
      {log.loading && <Typography role="status">Loading scan log…</Typography>}
      {log.error && <Alert severity="error">Scan log failed: {log.error}</Alert>}
      {log.data && !("ScanID" in log.data.Data) && <Alert severity="info">No scan log is available for this identifier.</Alert>}
      <InspectMenu label="Scan details & downloads" description="Exact scan metadata, raw quality and source JSON"><Stack spacing={2}>
      {log.data && "ScanID" in log.data.Data && <Typography variant="body2">{showValue(log.data.Data.DateTime)} · Altitude: {showValue(log.data.Data.AltStart, " m")} to {showValue(log.data.Data.AltEnd, " m")} · Solar zenith angle: {showValue(log.data.Data.SunZD, "°")} · Quality: {showValue(log.data.Data.Quality)}</Typography>}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}><Button disabled={!log.data} onClick={() => { if (log.data && logPath) download(log.data, release, logPath, `${selection.backend}-${selection.scan}-log`); }}>Download log JSON</Button>
        <Button disabled={!spectra.data} onClick={() => { if (spectra.data && spectrumPath) download(spectra.data, release, spectrumPath, `${selection.backend}-${selection.scan}-l1b`); }}>Download spectra JSON</Button>
        {spectrumPath && <Button component="a" href={spectrumPath} target="_blank" rel="noopener">Open source JSON</Button>}</Stack>
      <Typography variant="caption">Downloads preserve API values, units, metadata and quality flags, and add a Migration field identifying the complete release and source URL. Quality is shown as stored without a pass/fail filter.</Typography>
      </Stack></InspectMenu>
      {!supportsSpectra && <Alert severity="info">Reconstructed spectra are unavailable for {selection.backend}. The stored catalogue and scan log remain accessible.</Alert>}
      {spectra.loading && <Typography role="status">Loading archive spectra…</Typography>}
      {spectra.error && <Alert severity="error">Archive spectra failed: {spectra.error}</Alert>}
      {spectra.data && <PilotSpectrum key={`${release}-${selection.backend}-${selection.mode}-${selection.scan}`} data={spectra.data.Data} />}
    </Stack></Paper>}
    {!!scanRows.length && <Paper variant="outlined" sx={{ p: 2 }}><Box component="details"><Box component="summary" sx={{ cursor: "pointer", py: 1, minHeight: 44 }}>Scan list · {scanRows.length} records</Box><Typography variant="h6">Scans · {date} · {backend} · FM {mode}</Typography>
      <TableContainer sx={{ maxHeight: 320 }}><Table stickyHeader sx={{ minWidth: 760, "& th": { whiteSpace: "nowrap" } }} size="small" aria-label="Archive scans"><TableHead><TableRow><TableCell>Scan ID</TableCell><TableCell>Time (UTC)</TableCell><TableCell>Latitude (°)</TableCell><TableCell>Longitude (°)</TableCell><TableCell>Quality</TableCell><TableCell>Spectra</TableCell></TableRow></TableHead>
        <TableBody>{scanRows.map((row, index) => <TableRow key={`${row.ScanID}-${index}`} selected={selection?.scan === row.ScanID}><TableCell><Button size="small" onClick={() => selectScan(row.ScanID)}>{row.ScanID}</Button></TableCell><TableCell>{showValue(row.DateTime)}</TableCell><TableCell>{showValue(row.LatStart)}</TableCell><TableCell>{showValue(row.LonStart)}</TableCell><TableCell>{showValue(row.Quality)}</TableCell><TableCell>{showValue(row.NumSpec)}</TableCell></TableRow>)}</TableBody>
      </Table></TableContainer></Box></Paper>}
    <Paper variant="outlined" sx={{ p: 2 }}><Box component="details"><Box component="summary" sx={{ cursor: "pointer", py: 1, minHeight: 44 }}>Look up a scan identifier directly</Box>
      <Typography variant="body2" sx={{ my: 1 }}>Use a known scan ID even when it has no stored date-catalogue entry.</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
        <TextField label="Scan identifier" value={directId} disabled={!ready} onChange={(event) => setDirectId(event.target.value)} slotProps={{ htmlInput: { inputMode: "numeric" } }} />
        <TextField select label="Scan backend" value={directBackendValue} disabled={!ready} sx={{ minWidth: 140 }} onChange={(event) => setDirectBackend(event.target.value)}>{directBackends.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
        <TextField select label="Scan frequency mode" value={directModeValue ?? ""} disabled={!ready} sx={{ minWidth: 200 }} onChange={(event) => setDirectMode(Number(event.target.value))}>{(status?.coverage.freqmodes ?? []).map((value) => <MenuItem key={value} value={value}>FM {value}</MenuItem>)}</TextField>
        <Button disabled={!ready || !validDirect} onClick={() => { if (validDirect && directModeValue !== undefined) setDirect({ scan: Number(directId), backend: directBackendValue, mode: directModeValue }); }}>Find scan</Button>
      </Stack>
    </Box></Paper>

    {ready && release && <MigrationTimeline key={release} release={release} />}
  </Stack></Container>;
}
