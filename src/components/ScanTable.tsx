import { Box, Button, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, useMediaQuery, useTheme } from "@mui/material";

export interface ScanRow {
  scanid: number;
  time?: string;
  lat?: number | null;
  lon?: number | null;
  quality?: number | null;
  sza?: number | null;
}

const value = (v: number | null | undefined) => typeof v === "number" && Number.isFinite(v) ? String(v) : "Missing";

export function ScanTable({ rows, selected, onSelect }: { rows: ScanRow[]; selected?: number; onSelect: (id: number) => void }) {
  const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
  const hasTime = rows.some((r) => r.time !== undefined);
  const hasSza = rows.some((r) => r.sza !== undefined);
  const hasQuality = rows.some((r) => r.quality !== undefined);
  return <Box>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Select a scan to link the map and science views. Coordinates are scan start positions; quality values are stored flags.</Typography>
    {phone ? <Stack component="ul" spacing={1} sx={{ p: 0, m: 0, listStyle: "none", maxHeight: 420, overflowY: "auto" }} aria-label="Available scans">
      {rows.map((row, index) => <Box component="li" key={`${row.scanid}-${index}`}>
        <Button fullWidth variant={row.scanid === selected ? "contained" : "outlined"} aria-label={`Select scan ${row.scanid}`} aria-describedby={`scan-description-${index}`} aria-pressed={row.scanid === selected}
          onClick={() => onSelect(row.scanid)} sx={{ textAlign: "left", justifyContent: "flex-start", py: 1.5 }}>
          <Box component="span"><Typography component="span" variant="body1" sx={{ display: "block" }}>Scan {row.scanid}</Typography>
            <Typography component="span" variant="body2" id={`scan-description-${index}`} sx={{ display: "block", overflowWrap: "anywhere" }}>
              {row.time && <>{row.time} UTC<br /></>}Latitude {value(row.lat)}° · Longitude {value(row.lon)}°
              {hasSza && <> · SZA {value(row.sza)}°</>}{hasQuality && <> · Raw quality {value(row.quality)}</>}
            </Typography></Box>
        </Button>
      </Box>)}
    </Stack> : <TableContainer tabIndex={0} role="region" aria-label="Scan list" sx={{ maxHeight: 360, overflow: "auto" }}>
      <Table stickyHeader size="small" aria-label="Available scans" sx={{ minWidth: 760, "& th": { whiteSpace: "nowrap" } }}>
        <TableHead><TableRow><TableCell>Scan ID</TableCell>{hasTime && <TableCell>Start time (UTC)</TableCell>}
          <TableCell>Latitude (°)</TableCell><TableCell>Longitude (°)</TableCell>{hasSza && <TableCell>Solar zenith angle (°)</TableCell>}
          {hasQuality && <TableCell>Raw quality</TableCell>}</TableRow></TableHead>
        <TableBody>{rows.map((row, index) => <TableRow key={`${row.scanid}-${index}`} selected={row.scanid === selected}>
          <TableCell><Button variant={row.scanid === selected ? "contained" : "text"} size="small" aria-label={`Select scan ${row.scanid}`} aria-pressed={row.scanid === selected} onClick={() => onSelect(row.scanid)}>{row.scanid}</Button></TableCell>
          {hasTime && <TableCell sx={{ whiteSpace: "nowrap" }}>{row.time ?? "Missing"}</TableCell>}
          <TableCell>{value(row.lat)}</TableCell><TableCell>{value(row.lon)}</TableCell>{hasSza && <TableCell>{value(row.sza)}</TableCell>}
          {hasQuality && <TableCell>{value(row.quality)}</TableCell>}
        </TableRow>)}</TableBody>
      </Table>
    </TableContainer>}
  </Box>;
}
