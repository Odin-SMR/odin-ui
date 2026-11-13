import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import {
  Alert, Box, Button, Chip, CircularProgress, Link, Stack, TextField, Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { filterFiles, parseCatalog, type Catalog } from "../parquet/catalog";
import {
  buildSelection, formatBytes, generateCli, generatePython, generateSql, selectionFilename,
} from "../parquet/snippets";

const asset = (name: string) => `${import.meta.env.BASE_URL}parquet/${name}`;
type CatalogState = { phase: "loading" } | { phase: "error"; message: string } | { phase: "ready"; catalog: Catalog };
type ExampleLanguage = "Python" | "SQL" | "CLI";

function CopyBlock({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied to clipboard.");
    } catch {
      setStatus("Clipboard access is unavailable. Select the text below and copy it.");
    }
  };
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, minWidth: 0 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
        <Typography component="h4" variant="subtitle2">{label}</Typography>
        <Button variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={copy} aria-label={`Copy ${label}`} sx={{ flexShrink: 0 }}>Copy</Button>
      </Stack>
      <Box component="pre" tabIndex={0} aria-label={label} sx={{ m: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", fontSize: ".8125rem", lineHeight: 1.6, userSelect: "all" }}><code>{text}</code></Box>
      <Typography role="status" variant="caption" sx={{ display: "block", mt: status ? 1 : 0 }}>{status}</Typography>
    </Box>
  );
}

function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser time to begin the download before releasing its object URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const selectStyle = {
  display: "block", width: "100%", minHeight: 44, mt: .75, px: 1.5, py: 1,
  border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper", color: "text.primary",
  font: "inherit", fontSize: ".9375rem", "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
};

export function ParquetAccess() {
  const [state, setState] = useState<CatalogState>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [releaseId, setReleaseId] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [language, setLanguage] = useState<ExampleLanguage>("Python");
  const [downloadStatus, setDownloadStatus] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
    const load = async () => {
      try {
        const response = await fetch(asset("catalog.json"), { signal: controller.signal, credentials: "omit" });
        if (!response.ok) throw new Error(`The catalog request returned HTTP ${response.status}.`);
        const catalog = parseCatalog(await response.json());
        if (!disposed) setState({ phase: "ready", catalog });
      } catch (error) {
        if (!disposed) setState({ phase: "error", message: timedOut ? "The catalog request timed out." : error instanceof Error && error.message.startsWith("The catalog request") ? error.message : "The catalog could not be loaded or its release information is invalid." });
      } finally {
        window.clearTimeout(timeout);
      }
    };
    void load();
    return () => { disposed = true; window.clearTimeout(timeout); controller.abort(); };
  }, [attempt]);

  const catalog = state.phase === "ready" ? state.catalog : undefined;
  const release = catalog?.status === "published" ? catalog.releases.find((entry) => entry.id === releaseId) ?? catalog.releases[0] : undefined;
  const dataset = release?.datasets.find((entry) => entry.id === datasetId) ?? release?.datasets[0];
  const dated = dataset?.files[0]?.observation_start != null;
  const coverageStart = dataset?.files.reduce((earliest, file) => file.observation_start !== null && (!earliest || file.observation_start < earliest) ? file.observation_start : earliest, "") ?? "";
  const coverageEnd = dataset?.files.reduce((latest, file) => file.observation_end !== null && file.observation_end > latest ? file.observation_end : latest, "") ?? "";
  // Start with one day of file coverage, not an implicit whole-mission selection.
  const start = fromDate ?? coverageStart;
  const end = toDate ?? coverageStart;
  const datesValid = !dated || Boolean(start && end && start <= end);
  const files = dataset && datesValid ? filterFiles(dataset, dated ? start : "", dated ? end : "") : [];
  const selection = release && dataset && files.length ? buildSelection(release, dataset, files) : undefined;
  const selectionName = selection ? selectionFilename(selection) : "selection.json";
  const totalBytes = files.reduce((total, file) => total + file.size_bytes, 0);
  const totalRows = files.reduce((total, file) => total + file.row_count, 0);
  const code = selection ? language === "Python" ? generatePython(selection) : language === "SQL" ? generateSql(selection) : generateCli(selection) : "";

  const resetSelection = () => { setFromDate(null); setToDate(null); setDownloadStatus(""); };
  const save = (kind: "selection" | "urls") => {
    if (!selection) return;
    try {
      if (kind === "selection") download(`${JSON.stringify(selection, null, 2)}\n`, selectionName, "application/json");
      else download(`${files.map((file) => file.url).join("\n")}\n`, "odin-parquet-urls.txt", "text/plain");
      setDownloadStatus(kind === "selection" ? `Selection download started. Keep ${selectionName} with your analysis.` : `File-list download started. Keep ${selectionName} for checksums and provenance.`);
    } catch {
      setDownloadStatus("The download could not start. Try again in a browser that supports file downloads.");
    }
  };

  return (
    <Box component="section" aria-labelledby="parquet-access" sx={{ mb: 4 }}>
      <Typography id="parquet-access" component="h2" variant="h5" gutterBottom>Analyze Parquet datasets</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: "78ch", mb: 2 }}>
        Work with versioned files in your own Python, SQL or command-line tools.
        Start with Level 2 for atmospheric profiles; Level 1 contains spectra,
        Level 0 contains decoded measurements, and Level 2I contains retrieval diagnostics.
        Published files can be read without an AWS account.
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} useFlexGap sx={{ flexWrap: "wrap", gap: 1.5, mb: 2 }}>
        <Button variant="outlined" component={RouterLink} to="/data_access/parquet-guide">Read the Parquet guide</Button>
        <Button variant="outlined" href={asset("first-profile.ipynb")} download startIcon={<DownloadIcon />}>Download first-profile notebook</Button>
      </Stack>
      <Typography color="text.secondary" variant="body2" sx={{ maxWidth: "78ch", mb: 3 }}>
        The first-profile notebook requires a saved Level 2 selection from a published release. The guide explains
        installation, file selection, units, missing values and optional AWS analysis.
        Running analysis on cloud services may incur charges in your own account.
      </Typography>

      {state.phase === "loading" && <Stack direction="row" role="status" sx={{ gap: 1.5, alignItems: "center" }}><CircularProgress size={20} aria-hidden="true" /><Typography>Loading the Parquet release catalog…</Typography></Stack>}
      {state.phase === "error" && (
        <Alert severity="error" action={<Button color="inherit" onClick={() => { setState({ phase: "loading" }); setAttempt((value) => value + 1); setReleaseId(""); setDatasetId(""); resetSelection(); }}>Retry</Button>}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Parquet catalog unavailable</Typography>
          {state.message} This does not mean that observations are missing. The guide and existing JSON APIs remain available.
        </Alert>
      )}
      {catalog?.status === "planned" && (
        <Alert severity="info">
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Public Parquet release in preparation</Typography>
          {catalog.message} File selection will appear here when a validated public release is listed.
        </Alert>
      )}
      {catalog?.status === "published" && !release && <Alert severity="info">No published releases are listed in this catalog.</Alert>}

      {release && dataset && (
        <>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>{catalog?.message}</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="label" htmlFor="parquet-release" variant="body2">Release</Typography>
              <Box component="select" id="parquet-release" value={release.id} sx={selectStyle} onChange={(event) => { setReleaseId(event.target.value); setDatasetId(""); resetSelection(); }}>
                {catalog?.releases.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} · {entry.id}</option>)}
              </Box>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="label" htmlFor="parquet-dataset" variant="body2">Product and processing version</Typography>
              <Box component="select" id="parquet-dataset" value={dataset.id} sx={selectStyle} onChange={(event) => { setDatasetId(event.target.value); resetSelection(); }}>
                {release.datasets.map((entry) => <option key={entry.id} value={entry.id}>{entry.level} · {entry.title} · {entry.project}{entry.frequency_mode !== undefined ? ` · FM ${entry.frequency_mode}` : ""}</option>)}
              </Box>
            </Box>
          </Box>
          <Typography color="text.secondary" sx={{ mb: 1 }}>{dataset.description}</Typography>
          <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: "wrap", mb: 1 }}>
            <Chip size="small" label={dataset.level} />
            <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>Project: {dataset.project} · Product: {dataset.product}{dataset.frequency_mode !== undefined ? ` · Frequency mode: ${dataset.frequency_mode}` : ""}{dataset.inversion_mode ? ` · Inversion mode: ${dataset.inversion_mode}` : ""}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Published {release.published_at}. <Link href={release.license.url}>{release.license.name}</Link>{" · "}
            <Link href={release.documentation_url}>Release documentation</Link>{" · "}<Link href={dataset.schema_url}>Product schema and scientific guidance</Link>
          </Typography>
          {dataset.notes.length > 0 && <Box component="ul" sx={{ pl: 2.5, mb: 2 }}>{dataset.notes.map((note, index) => <Typography component="li" variant="body2" color="text.secondary" key={index}>{note}</Typography>)}</Box>}
          {dated ? <><Typography variant="body2" sx={{ mb: 2 }}>Catalog file coverage: {coverageStart} to {coverageEnd}. Check the release documentation for observation gaps.</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 2, mb: 2 }}>
            <TextField id="parquet-start" label="Coverage start date" type="date" value={start} onChange={(event) => { setFromDate(event.target.value); setDownloadStatus(""); }} slotProps={{ inputLabel: { shrink: true } }} error={!start || Boolean(end && start > end)} sx={{ flex: 1 }} />
            <TextField id="parquet-end" label="Coverage end date" type="date" value={end} onChange={(event) => { setToDate(event.target.value); setDownloadStatus(""); }} slotProps={{ inputLabel: { shrink: true } }} error={!end || Boolean(start && start > end)} sx={{ flex: 1 }} />
          </Stack></> : <Typography variant="body2" sx={{ mb: 2 }}>Observation dates unavailable; select diagnostics by scan ID.</Typography>}
          {!datesValid && <Alert severity="warning" sx={{ mb: 2 }}>Choose both dates with the start on or before the end.</Alert>}
          {datesValid && files.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>No catalog files overlap these dates for this product. Try another date range or product.</Alert>}
          {selection && (
            <>
              <Box role="status" sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2, mb: 2 }}>
                <Typography sx={{ fontWeight: 600 }}>{files.length.toLocaleString()} {files.length === 1 ? "file" : "files"} · {formatBytes(totalBytes)} · {totalRows.toLocaleString()} stored rows</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: .5 }}>
                  {dated ? "These files overlap your dates and may include observations outside them. " : "Observation dates are unavailable for these complete diagnostic files. "}
                  Bytes and rows describe whole files, not an exact observation subset or query-cost estimate.
                  Apply observation filters in your analysis; one scan can occupy many rows.
                </Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} useFlexGap sx={{ flexWrap: "wrap", gap: 1.5, mb: 1 }}>
                <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => save("selection")}>Download {selectionName}</Button>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => save("urls")}>Download file URLs</Button>
              </Stack>
              <Typography role="status" variant="body2" color="text.secondary" sx={{ mb: 2 }}>{downloadStatus}</Typography>
              <Box component="details" sx={{ mb: 3, "& summary": { cursor: "pointer", py: 1 }, overflowWrap: "anywhere" }}>
                <Typography component="summary" variant="body2">Inspect selected files and checksums</Typography>
                <Box component="ul" sx={{ pl: 2.5 }}>
                  {files.slice(0, 20).map((file) => <Box component="li" key={file.url} sx={{ mb: 1.5 }}>
                    <Link href={file.url}>{file.url}</Link>
                    <Typography variant="caption" component="div">{file.observation_start === null ? "Dates unavailable" : `${file.observation_start} – ${file.observation_end}`} · {formatBytes(file.size_bytes)} · {file.row_count.toLocaleString()} stored rows</Typography>
                    <Typography variant="caption" component="div">SHA-256: <code>{file.sha256}</code></Typography>
                  </Box>)}
                </Box>
                {files.length > 20 && <Typography variant="body2">Showing 20 of {files.length.toLocaleString()} files. Download {selectionName} for the complete list.</Typography>}
              </Box>
              <Typography component="h3" variant="h6" gutterBottom>Run the selected-file example</Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 1.5 }}>Save {selectionName} with your script or notebook. These examples use the exact files and preserve the release identity; they do not run inside this page.</Typography>
              <Stack direction="row" role="group" aria-label="Example language" sx={{ gap: 1, mb: 1.5 }}>
                {(["Python", "SQL", "CLI"] as const).map((value) => <Button key={value} size="small" variant={language === value ? "contained" : "outlined"} aria-pressed={language === value} onClick={() => setLanguage(value)}>{value}</Button>)}
              </Stack>
              <CopyBlock key={`${release.id}-${dataset.id}-${start}-${end}-${language}`} label={`${language} Parquet example`} text={code} />
              <Box sx={{ mt: 2 }}><CopyBlock key={release.id} label="Release citation" text={release.citation} /></Box>
            </>
          )}
        </>
      )}
    </Box>
  );
}
