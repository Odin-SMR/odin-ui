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
import { usePilotRequest } from "../hooks/Pilot";
import {
  PILOT_SOURCE, pilotCalendarSchema, pilotL1bSchema, pilotLogSchema, pilotSingleLogSchema, pilotPaths, pilotStatusSchema, stringifyPilotJson,
} from "../odinApi/pilot";
import { OdinTrack } from "./plots/OdinTrack";
import PilotSpectrum from "./plots/PilotSpectrum";
import { InspectMenu } from "./InspectMenu";

const statusLabels = {
  not_configured: "Awaiting migration", not_started: "Awaiting migration", planning: "Planning", exporting: "Exporting", validating: "Validating",
  validated: "Validated", failed: "Migration failed", limit_exceeded: "Migration limit reached",
  interrupted: "Migration interrupted", unavailable: "Status unavailable",
};
const showValue = (value: unknown, unit = "") =>
  value === null || value === undefined ? "Missing" : `${String(value)}${unit}`;

function downloadResponse(response: Record<string, unknown>, release: string, url: string, filename: string) {
  const body = {
    ...response,
    Pilot: { source: PILOT_SOURCE, release_id: release, coverage: "pilot", url },
  };
  const blob = new Blob([stringifyPilotJson(body)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${release.replace(/[^a-zA-Z0-9_-]/g, "_")}-${filename}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export default function MigrationPilot() {
  const [refresh, setRefresh] = useState(0);
  const [date, setDate] = useState("2015-01-11");
  const [selectedMode, setSelectedMode] = useState(1);
  const [selectedScan, setSelectedScan] = useState<number>();
  const statusRequest = usePilotRequest(pilotPaths.status, pilotStatusSchema, refresh, true);
  const status = statusRequest.data;
  const ready = status?.ready === true;
  const release = ready ? status.release_id : null;
  const dates = [...(status?.coverage.dates ?? [])].sort();
  const lastDate = dates[dates.length - 1];
  const covered = dates.includes(date);

  // A pending migration updates in place; a validated release stays pinned until refresh.
  useEffect(() => {
    if (ready) return;
    const timer = window.setInterval(() => setRefresh((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, [ready]);

  const calendar = usePilotRequest(
    release && covered ? pilotPaths.calendar(date, release) : null, pilotCalendarSchema,
  );
  const modes = Array.from(new Set((calendar.data?.Data ?? []).map((row) => row.FreqMode))).sort((a, b) => a - b);
  const mode = modes.includes(selectedMode) ? selectedMode : modes[0];
  const scans = usePilotRequest(
    release && covered && mode !== undefined ? pilotPaths.scans(date, mode, release) : null, pilotLogSchema,
  );
  const scanRows = scans.data?.Data ?? [];
  const scan = scanRows.find((row) => row.ScanID === selectedScan)?.ScanID
    ?? scanRows.find((row) => row.ScanID === 7013927028)?.ScanID ?? scanRows[0]?.ScanID;
  const log = usePilotRequest(
    release && mode !== undefined && scan !== undefined ? pilotPaths.log(mode, scan, release) : null, pilotSingleLogSchema,
  );
  const spectra = usePilotRequest(
    release && mode !== undefined && scan !== undefined ? pilotPaths.spectra(mode, scan, release) : null, pilotL1bSchema,
  );
  const changeDate = (next: string) => { setDate(next); setSelectedScan(undefined); };
  const track = scanRows.flatMap((row) => (
    typeof row.LatStart === "number" && Number.isFinite(row.LatStart)
    && row.LatStart >= -90 && row.LatStart <= 90
    && typeof row.LonStart === "number" && Number.isFinite(row.LonStart)
  ) ? [{ lat: row.LatStart, lon: row.LonStart, scanid: row.ScanID }] : []);
  const omitted = scanRows.length - track.length;
  const totals = Object.values(status?.tables ?? {}).reduce(
    (acc, table) => ({ rows: acc.rows + table.rows, files: acc.files + table.files }), { rows: 0, files: 0 },
  );
  const failed = status && ["failed", "limit_exceeded", "interrupted", "unavailable"].includes(status.status);
  const calendarEvents = (calendar.data?.Data ?? []).map((row) => ({
    id: `${row.Date}-${row.Backend}-${row.FreqMode}`, start: row.Date,
    title: `FM${row.FreqMode} · ${row.NumScan}`, allDay: true,
    extendedProps: { mode: row.FreqMode },
  }));

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h3" component="h1">S3 migration pilot</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Explore the preserved 2015 slice from Parquet in Amazon S3. This pilot is a limited part of the Odin record.
          </Typography>
        </Box>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <Chip label="Source: S3 Parquet" color="primary" variant="outlined" />
              {status && <Chip label={statusLabels[status.status]} color={ready ? "success" : failed ? "error" : "default"} />}
              <Button onClick={() => setRefresh((value) => value + 1)} disabled={statusRequest.loading}>Refresh status</Button>
              {statusRequest.loading && <CircularProgress size={20} aria-label="Loading migration status" />}
            </Stack>
            {statusRequest.error && <Alert severity="error">Migration status could not be loaded: {statusRequest.error}</Alert>}
            {status && <>
              <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>Release: {status.release_id ?? "Awaiting release"}</Typography>
              <Typography variant="body2">Pilot dates (UTC): {dates.length ? dates.join(", ") : "Coverage has not yet been published"}</Typography>
              <Box component="details" open={!ready}><Box component="summary" sx={{ cursor: "pointer", py: 1, minHeight: 44 }}>Transfer details</Box><Stack spacing={1}>
              {ready ? <Typography variant="body2">{Object.keys(status.tables).length} tables · {totals.rows.toLocaleString()} committed rows · {totals.files.toLocaleString()} files</Typography>
                : <Typography variant="body2">Validated table totals will appear when verification finishes.</Typography>}
              {!ready && status.counters && <Box>
                <Typography variant="body2">
                  {status.counters.export_rows !== undefined && <>{status.counters.export_rows.toLocaleString()} rows exported. </>}
                  {status.counters.committed_files !== undefined && <>{status.counters.committed_files.toLocaleString()} files written. </>}
                  {status.counters.validation_rows !== undefined && <>{status.counters.validation_rows.toLocaleString()} source rows read for validation. </>}
                  {status.counters.source_read_bytes !== undefined && <>{(status.counters.source_read_bytes / 1024 ** 3).toLocaleString(undefined, { maximumFractionDigits: 2 })} GiB read from the source.</>}
                </Typography>
                {status.current_table && <Typography variant="caption">Current table: {status.current_table}</Typography>}
              </Box>}
              </Stack></Box>
              {!ready && <Alert severity={failed ? "error" : "info"}>
                {failed ? `The migration cannot serve this slice. ${status.error ?? "Check migration results before retrying."}` : "Discovery opens after the migration has finished and validation has passed. Status refreshes every 30 seconds."}
              </Alert>}
              <InspectMenu label="Pilot details" description="Excluded tables and committed counts"><Stack spacing={1}>
              {status.exclusions.length > 0 && <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>Excluded tables: {status.exclusions.join(", ")}</Typography>}
              {Object.keys(status.tables).length > 0 && <Box component="details">
                <Box component="summary" sx={{ cursor: "pointer", py: 1, minHeight: 44 }}>Migration results by table</Box>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" aria-label="Migration results by table">
                    <TableHead><TableRow><TableCell>Table</TableCell><TableCell align="right">Rows</TableCell><TableCell align="right">Files</TableCell></TableRow></TableHead>
                    <TableBody>{Object.entries(status.tables).map(([name, table]) => <TableRow key={name}>
                      <TableCell>{name}</TableCell><TableCell align="right">{table.rows.toLocaleString()}</TableCell><TableCell align="right">{table.files.toLocaleString()}</TableCell>
                    </TableRow>)}</TableBody>
                  </Table>
                </TableContainer>
              </Box>}
              </Stack></InspectMenu>
            </>}
          </Stack>
        </Paper>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
          <TextField label="Observation day (UTC)" type="date" value={date} disabled={!ready} sx={{ minWidth: 240 }}
            onChange={(event) => changeDate(event.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: dates[0], max: lastDate } }} />
          <TextField select label="Frequency mode" value={mode ?? ""} disabled={!ready || calendar.loading || !modes.length}
            sx={{ minWidth: 180 }} onChange={(event) => { setSelectedMode(Number(event.target.value)); setSelectedScan(undefined); }}>
            {modes.map((value) => <MenuItem key={value} value={value}>FM {value}</MenuItem>)}
          </TextField>
        </Stack>
        {ready && !covered && <Alert severity="warning">This date is outside the pilot coverage. Select an exported day; the pilot cannot supply the rest of the mission.</Alert>}
        {calendar.loading && <Typography role="status">Loading pilot discovery…</Typography>}
        {calendar.error && <Alert severity="error">Pilot discovery failed: {calendar.error}</Alert>}
        {calendar.data && calendar.data.Data.length === 0 && <Alert severity="info">This exported day contains no frequency-mode records.</Alert>}

        {ready && covered && <>
          <Box component="details"><Box component="summary" sx={{ cursor: "pointer", py: 1, minHeight: 44 }}>Choose from the monthly catalogue</Box>
            <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
              <Typography component="h2" variant="h6">{dayjs(date).format("MMMM YYYY")} · pilot coverage</Typography>
              <Typography variant="caption">Frequency mode · number of scans</Typography>
              <OdinCalendar loading={calendar.loading} unavailable={!!calendar.error} events={calendarEvents} month={dayjs.utc(date).startOf("month")} minDate={dates[0]} maxDate={lastDate}
                setMonth={(next) => { const candidate = dates.find((value) => value.startsWith(next.format("YYYY-MM"))); if (candidate) changeDate(candidate); }}
                onSelect={(event) => { changeDate(event.start.slice(0, 10)); setSelectedMode(Number(event.extendedProps?.mode)); }} />
            </Paper>
          </Box>
          <Paper variant="outlined" sx={{ p: 2, minHeight: { xs: 420, md: 480 }, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Typography component="h2" variant="h6">Scan start locations · {date} · FM {mode}</Typography>
            <OdinTrack data={track} scanid={scan} selectedScanid={setSelectedScan} loading={scans.loading} />
          </Paper>
          {omitted > 0 && <Typography variant="caption">{omitted} scans have missing or invalid start coordinates and are omitted from the map.</Typography>}
        </>}

        {scans.loading && <Typography role="status">Loading pilot scans…</Typography>}
        {scans.error && <Alert severity="error">Pilot scan lookup failed: {scans.error}</Alert>}
        {scans.data && !scanRows.length && <Alert severity="info">No scans are stored for this day and frequency mode.</Alert>}
        {scan !== undefined && mode !== undefined && release && <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Scan {scan} · FM {mode}</Typography>
            {log.loading && <Typography role="status">Loading scan log…</Typography>}
            {log.error && <Alert severity="error">Scan log failed: {log.error}</Alert>}
            <InspectMenu label="Scan details & downloads" description="Exact scan metadata, raw quality and source JSON"><Stack spacing={2}>
            {log.data && [log.data.Data].map((row, index) => <Typography key={index} variant="body2">
              {showValue(row.DateTime)} · Altitude: {showValue(row.AltStart, " m")} to {showValue(row.AltEnd, " m")} · Solar zenith angle: {showValue(row.SunZD, "°")} · Quality: {showValue(row.Quality)}
            </Typography>)}
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              <Button disabled={!log.data} onClick={() => { if (log.data) downloadResponse(log.data, release, pilotPaths.log(mode, scan, release), `${scan}-log`); }}>Download log JSON</Button>
              <Button disabled={!spectra.data} onClick={() => { if (spectra.data) downloadResponse(spectra.data, release, pilotPaths.spectra(mode, scan, release), `${scan}-l1b`); }}>Download spectra JSON</Button>
              <Button component="a" href={pilotPaths.spectra(mode, scan, release)} target="_blank" rel="noopener">Open source JSON</Button>
            </Stack>
            <Typography variant="caption">Downloads preserve the API values, metadata and quality flags, and add a Pilot field identifying this release and source URL. Quality values are shown as stored; they have not been interpreted as a pass/fail filter.</Typography>
            </Stack></InspectMenu>
            {spectra.loading && <Typography role="status">Loading pilot spectra…</Typography>}
            {spectra.error && <Alert severity="error">Pilot spectra failed: {spectra.error}</Alert>}
            {spectra.data && <PilotSpectrum key={`${release}-${mode}-${scan}`} data={spectra.data.Data} />}
          </Stack>
        </Paper>}
        {!!scanRows.length && <Paper variant="outlined" sx={{ p: 2 }}>
          <Box component="details"><Box component="summary" sx={{ cursor: "pointer", py: 1, minHeight: 44 }}>Scan list · {scanRows.length} records</Box><Typography variant="h6">Scans · {date} · FM {mode}</Typography>
          <TableContainer sx={{ maxHeight: 320 }}>
            <Table stickyHeader sx={{ minWidth: 760, "& th": { whiteSpace: "nowrap" } }} size="small" aria-label="Pilot scans">
              <TableHead><TableRow><TableCell>Scan ID</TableCell><TableCell>Time (UTC)</TableCell><TableCell>Latitude (°)</TableCell><TableCell>Longitude (°)</TableCell><TableCell>Quality</TableCell><TableCell>Spectra</TableCell></TableRow></TableHead>
              <TableBody>{scanRows.map((row) => <TableRow key={row.ScanID} selected={row.ScanID === scan}>
                <TableCell><Button size="small" onClick={() => setSelectedScan(row.ScanID)}>{row.ScanID}</Button></TableCell>
                <TableCell>{showValue(row.DateTime)}</TableCell><TableCell>{showValue(row.LatStart)}</TableCell><TableCell>{showValue(row.LonStart)}</TableCell><TableCell>{showValue(row.Quality)}</TableCell><TableCell>{showValue(row.NumSpec)}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </TableContainer></Box>
        </Paper>}

      </Stack>
    </Container>
  );
}
