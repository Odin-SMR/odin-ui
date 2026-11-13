import DownloadIcon from "@mui/icons-material/Download";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useEffect, useState } from "react";
import type z from "zod";
import { createApiClient, schemas } from "../../odinApi/client";
import { InspectMenu } from "../InspectMenu";
import PilotSpectrum from "./PilotSpectrum";
import { finite, saveJson } from "./scientificValues";

dayjs.extend(utc);
type L1BType = z.infer<typeof schemas.L1b>;
const api = createApiClient("/");

export function L1BPlots({ scanid, freqmode }: { scanid: number | undefined; freqmode: number | undefined }) {
  if (scanid === undefined || freqmode === undefined) return <Alert severity="info">Select a day and frequency mode, then a scan to inspect its brightness temperature spectra.</Alert>;
  return <ScanSpectrum key={`${freqmode}/${scanid}`} scanid={scanid} freqmode={freqmode} />;
}

function ScanSpectrum({ scanid, freqmode }: { scanid: number; freqmode: number }) {
  const [result, setResult] = useState<{ data?: L1BType; error?: string; loading: boolean }>({ loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api.getRest_apiv5level1FreqmodeScannoL1b({ params: { freqmode, scanno: scanid }, signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setResult({ data: response.Data, loading: false }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ error: "Spectra could not be loaded. Please try again.", loading: false }); });
    return () => controller.abort();
  }, [freqmode, scanid, retry]);
  const mjd = result.data?.MJD?.[0];
  const timestamp = finite(mjd) ? dayjs.utc("1858-11-17T00:00:00Z").add(mjd * 86400000, "ms") : null;
  return <Card variant="outlined">
    <CardHeader sx={{ flexWrap: "wrap", gap: 1, "& .MuiCardHeader-content": { minWidth: 0, flex: "1 1 12rem" } }} title="Brightness temperature spectra" subheader={`FM ${freqmode} · Scan ${scanid}`} slotProps={{ title: { component: "h2", variant: "h6" }, subheader: { sx: { overflowWrap: "anywhere" } }, action: { sx: { m: 0, alignSelf: "center" } } }} action={
      <InspectMenu label="Download" buttonLabel={<DownloadIcon />} title="Scan data and provenance" description="Download the original response with all spectra and metadata." disabled={!result.data}>
        <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>FM {freqmode} · Scan {scanid}<br />{timestamp?.isValid() ? timestamp.toISOString() : "UTC time unavailable"}</Typography>
        <Typography variant="body2">Source: Level 1 API. Frequency = IFreqGrid + LOFreq[0]. Download retains all spectra and the original metadata.</Typography>
        <Button variant="outlined" onClick={() => saveJson(result.data, `${result.data?.ScanID?.[0] ?? scanid}.json`)}>Download scan JSON</Button>
      </InspectMenu>
    } />
    <CardContent><Stack spacing={2}>
      {result.loading && <Stack direction="row" sx={{ gap: 1, alignItems: "center" }} role="status"><CircularProgress size={20} /><Typography>Loading spectra…</Typography></Stack>}
      {result.error && <Alert severity="error" action={<Button color="inherit" onClick={() => { setResult({ loading: true }); setRetry(retry + 1); }}>Retry</Button>}>{result.error}</Alert>}
      {result.data && <>
        <PilotSpectrum data={result.data} frequencyReference="first" />
      </>}
    </Stack></CardContent>
  </Card>;
}
