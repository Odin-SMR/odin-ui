import DownloadIcon from "@mui/icons-material/Download";
import { Alert, Box, Button, CircularProgress, Link, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { archivePartitionFiles, parseArchiveIndex, parseArchiveShard, type ArchiveIndex, type ArchiveShard } from "../parquet/archive";
import { formatBytes } from "../parquet/snippets";

type State<T> = { phase: "loading" } | { phase: "error"; message: string } | { phase: "ready"; data: T };
const selectStyle = { display: "block", width: "100%", minWidth: 0, minHeight: 44, mt: .75, px: 1.5, py: 1, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper", color: "text.primary", font: "inherit", fontSize: ".9375rem", "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 } };

function filename(url: string) {
  const name = new URL(url).pathname.split("/").slice(-1)[0];
  try { return decodeURIComponent(name); } catch { return name; }
}

function download(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ParquetArchive() {
  const [indexState, setIndexState] = useState<State<ArchiveIndex>>({ phase: "loading" });
  const [indexAttempt, setIndexAttempt] = useState(0);
  const [shardAttempt, setShardAttempt] = useState(0);
  const [shardState, setShardState] = useState<{ key: string; state: State<ArchiveShard> }>({ key: "", state: { phase: "loading" } });
  const [projectId, setProjectId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    void (async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}parquet/archive/index.json`, { credentials: "omit", signal: controller.signal });
        if (!response.ok) throw new Error(`Archive index returned HTTP ${response.status}.`);
        const data = parseArchiveIndex(await response.json());
        if (!disposed) setIndexState({ phase: "ready", data });
      } catch {
        if (!disposed) setIndexState({ phase: "error", message: "The archive index could not be loaded or its metadata is invalid." });
      } finally { window.clearTimeout(timeout); }
    })();
    return () => { disposed = true; controller.abort(); window.clearTimeout(timeout); };
  }, [indexAttempt]);

  const index = indexState.phase === "ready" ? indexState.data : undefined;
  const projects = [...new Set(index?.groups.map((group) => group.project) ?? [])];
  const project = projects.includes(projectId) ? projectId : projects[0];
  const groups = index?.groups.filter((group) => group.project === project) ?? [];
  const group = groups.find((entry) => entry.id === groupId) ?? groups[0];
  const shardKey = group && index ? `${index.snapshot_id}/${group.id}/${shardAttempt}` : "";

  useEffect(() => {
    if (!index || !group) return;
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    void (async () => {
      try {
        const response = await fetch(group.index_url, { credentials: "omit", signal: controller.signal });
        if (!response.ok) throw new Error(`Archive product index returned HTTP ${response.status}.`);
        const data = parseArchiveShard(await response.json(), index, group);
        if (!disposed) setShardState({ key: shardKey, state: { phase: "ready", data } });
      } catch {
        if (!disposed) setShardState({ key: shardKey, state: { phase: "error", message: "The product file list could not be loaded or does not match this archive snapshot." } });
      } finally { window.clearTimeout(timeout); }
    })();
    return () => { disposed = true; controller.abort(); window.clearTimeout(timeout); };
  }, [index, group, shardKey]);

  const shard = shardState.key === shardKey ? shardState.state : { phase: "loading" as const };
  const allFiles = shard.phase === "ready" ? shard.data.files : [];
  const years = [...new Set(allFiles.map((file) => file.year))].sort((a, b) => a - b);
  const year = selectedYear !== null && years.includes(selectedYear) ? selectedYear : years[0];
  const months = [...new Set(allFiles.filter((file) => file.year === year).map((file) => file.month))].sort((a, b) => a - b);
  const month = selectedMonth !== null && months.includes(selectedMonth) ? selectedMonth : months[0];
  const files = year && month ? archivePartitionFiles(allFiles, year, month) : [];
  const totalBytes = files.reduce((sum, file) => sum + file.size_bytes, 0);
  const pageSize = 50;
  const pageCount = Math.ceil(files.length / pageSize);
  const visibleFiles = files.slice(page * pageSize, (page + 1) * pageSize);
  const resetPartition = () => { setSelectedYear(null); setSelectedMonth(null); setPage(0); setDownloadStatus(""); };
  const basename = `${index?.snapshot_id}-${group?.id}-${year}-${String(month).padStart(2, "0")}`;

  return <Box component="section" aria-labelledby="parquet-archive" sx={{ my: 4, minWidth: 0 }}>
    <Typography id="parquet-archive" component="h2" variant="h5" gutterBottom>Archive file index</Typography>
    <Typography color="text.secondary" sx={{ mb: 2, maxWidth: "80ch" }}>
      Browse existing Level 2 Parquet files by processing project, product and storage partition.
      Choosing a month selects whole files; partition labels do not establish exact observation dates or scientific completeness.
      Only index metadata loads automatically. A file downloads when you follow its link.
    </Typography>
    {indexState.phase === "loading" && <Stack direction="row" sx={{ gap: 1, alignItems: "center" }} role="status"><CircularProgress size={20} />Loading archive index…</Stack>}
    {indexState.phase === "error" && <Alert severity="warning" action={<Button color="inherit" onClick={() => { setIndexState({ phase: "loading" }); setIndexAttempt((value) => value + 1); }}>Retry archive</Button>}>{indexState.message}</Alert>}
    {index && group && <Stack spacing={2}>
      <Typography variant="body2">{index.description}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
        Snapshot {index.snapshot_id} · {index.generated_at} · {index.groups.reduce((sum, entry) => sum + entry.file_count, 0).toLocaleString("en-US")} files · {formatBytes(index.groups.reduce((sum, entry) => sum + entry.size_bytes, 0))}<br />
        Scope: {index.source_scope}
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
        <Box><Typography component="label" htmlFor="archive-project">Processing project</Typography>
          <Box component="select" id="archive-project" value={project} sx={selectStyle} onChange={(event) => { setProjectId(event.target.value); setGroupId(""); resetPartition(); }}>
            {projects.map((value) => <option key={value} value={value}>{value}</option>)}
          </Box>
        </Box>
        <Box><Typography component="label" htmlFor="archive-product">Archive product</Typography>
          <Box component="select" id="archive-product" value={group.id} sx={selectStyle} onChange={(event) => { setGroupId(event.target.value); resetPartition(); }}>
            {groups.map((entry) => <option key={entry.id} value={entry.id}>{entry.product}{entry.frequency_mode !== undefined ? ` · FM ${entry.frequency_mode}` : ""}{entry.inversion_mode ? ` · ${entry.inversion_mode}` : ""}</option>)}
          </Box>
        </Box>
      </Box>
      {shard.phase === "loading" && <Typography role="status">Loading product file list…</Typography>}
      {shard.phase === "error" && <Alert severity="warning" action={<Button color="inherit" onClick={() => { resetPartition(); setShardAttempt((value) => value + 1); }}>Retry product</Button>}>{shard.message}</Alert>}
      {shard.phase === "ready" && <>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
          <Box><Typography component="label" htmlFor="archive-year">Partition year</Typography>
            <Box component="select" id="archive-year" value={year} sx={selectStyle} onChange={(event) => { setSelectedYear(Number(event.target.value)); setSelectedMonth(null); setPage(0); setDownloadStatus(""); }}>
              {years.map((value) => <option key={value} value={value}>{value}</option>)}
            </Box>
          </Box>
          <Box><Typography component="label" htmlFor="archive-month">Partition month</Typography>
            <Box component="select" id="archive-month" value={month} sx={selectStyle} onChange={(event) => { setSelectedMonth(Number(event.target.value)); setPage(0); setDownloadStatus(""); }}>
              {months.map((value) => <option key={value} value={value}>{String(value).padStart(2, "0")}</option>)}
            </Box>
          </Box>
        </Box>
        <Typography role="status">{files.length.toLocaleString("en-US")} {files.length === 1 ? "file" : "files"} · {formatBytes(totalBytes)} in partition {year}-{String(month).padStart(2, "0")}</Typography>
        <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => { download(`${files.map((file) => file.url).join("\n")}\n`, `${basename}-urls.txt`, "text/plain"); setDownloadStatus("Downloaded the selected partition’s file URLs. No scientific files were fetched."); }}>Download archive URLs</Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => { download(`${JSON.stringify({ schema_version: 1, snapshot_id: index.snapshot_id, generated_at: index.generated_at, source_scope: index.source_scope, group, partition: { year, month }, files }, null, 2)}\n`, `${basename}-metadata.json`, "application/json"); setDownloadStatus("Downloaded archive listing metadata. ETags are not scientific checksums."); }}>Download archive metadata</Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">Archive metadata records object sizes, last-modified times and opaque S3 ETags. It does not supply verified row counts or SHA256 checksums. Use the verified tutorial selections below with the analysis notebooks.</Typography>
        {downloadStatus && <Typography role="status" variant="caption">{downloadStatus}</Typography>}
        <Box component="ul" aria-label="Parquet archive files" sx={{ m: 0, pl: 3, "& li": { mb: 1, overflowWrap: "anywhere" } }}>
          {visibleFiles.map((file) => <li key={file.url}><Link href={file.url}>{filename(file.url)}</Link><Typography component="span" variant="caption" color="text.secondary"> · {formatBytes(file.size_bytes)}</Typography></li>)}
        </Box>
        {pageCount > 1 && <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous files</Button>
          <Typography variant="body2">Page {page + 1} of {pageCount}</Typography>
          <Button disabled={page + 1 === pageCount} onClick={() => setPage((value) => value + 1)}>Next files</Button>
        </Stack>}
      </>}
    </Stack>}
  </Box>;
}
