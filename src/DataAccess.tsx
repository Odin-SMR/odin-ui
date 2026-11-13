import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  Alert, Box, Button, Container, Divider, Link, Stack, Typography,
} from "@mui/material";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { PageIntro } from "./components/PageIntro";
import { ParquetAccess } from "./components/ParquetAccess";
import { ParquetArchive } from "./components/ParquetArchive";

const l1Root = "https://odin-smr.org/rest_api/v5";
const l2Root = "https://odin-smr.org/api";
const archiveRoot = "https://odin-smr.org/rest_api/migration/v1";

const l2Endpoints = [
  { path: "/calendar?year=2015&month=1", description: "Find available UTC days and frequency modes for a month. Returns an array of day, freqmode and count objects." },
  { path: "/scans?day={YYYY-MM-DD}&fm={freqmode}", description: "Use a day and frequency mode from the calendar. Returns an array of scanid, lat and lon objects." },
  { path: "/products?day={YYYY-MM-DD}&scanid={scanid}", description: "Use a scan ID from the scan list and the same day. Returns an array of products, each with name, scanid and data." },
];

const l1Endpoints = [
  { path: "/period_info/2015/1/11/?length=1", description: "Discover one day of observations. Data contains Date, Backend, FreqMode and NumScan; length is the number of days." },
  { path: "/freqmode_info/{YYYY-MM-DD}/{freqmode}/", description: "List scans for a date and frequency mode from discovery. Choose a ScanID from Data." },
  { path: "/level1/{freqmode}/{ScanID}/Log/", description: "Read the selected scan’s metadata, including available location, time and quality information." },
  { path: "/level1/{freqmode}/{ScanID}/L1b/", description: "Download calibrated spectra and their frequency information. Keep the complete Data object and its metadata." },
];

const l2Python = `import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

BASE = "${l2Root}"

def get(path, **params):
    url = f"{BASE}/{path}?{urlencode(params)}"
    with urlopen(url, timeout=60) as response:
        return json.load(response)

# Discover a day and mode, then choose one returned scan.
days = get("calendar", year=2015, month=1)
entry = days[0]
scans = get("scans", day=entry["day"], fm=entry["freqmode"])
scan_id = scans[0]["scanid"]

# Save the response unchanged and retain the request URL.
query = urlencode({"day": entry["day"], "scanid": scan_id})
url = f"{BASE}/products?{query}"
filename = f"odin-l2-{entry['day']}-{scan_id}"
with urlopen(url, timeout=60) as response:
    Path(f"{filename}.json").write_bytes(response.read())
Path(f"{filename}-request.txt").write_text(url + "\\n")
print(f"Saved {filename}.json")`;

function EndpointList({ endpoints }: { endpoints: { path: string; description: string }[] }) {
  return (
    <Box component="ol" sx={{ pl: 3, my: 2, "& li": { pl: 1, mb: 2 } }}>
      {endpoints.map(({ path, description }) => (
        <Box component="li" key={path}>
          <Box component="code" sx={{ fontSize: ".875rem", overflowWrap: "anywhere" }}>{path}</Box>
          <Typography color="text.secondary" variant="body2" sx={{ mt: .5 }}>{description}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function CopyableCode({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied to clipboard.");
    } catch {
      setStatus("Select the text to copy it. Clipboard access is unavailable in this browser.");
    }
  };
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, mt: 2 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
        <Button size="small" variant="outlined" onClick={copy} startIcon={<ContentCopyIcon />} aria-label={`Copy ${label.toLowerCase()}`} sx={{ flexShrink: 0 }}>Copy</Button>
      </Stack>
      <Box component="pre" sx={{ m: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", fontSize: ".875rem", lineHeight: 1.6, userSelect: "all" }}><code>{text}</code></Box>
      <Typography role="status" variant="caption" color="text.secondary" sx={{ display: "block", mt: status ? 1 : 0 }}>{status}</Typography>
    </Box>
  );
}

export function DataAccess() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageIntro eyebrow="Data access" title="Access Odin-SMR data">
        Explore and download published Odin-SMR observations without signing in.
        Keep the product identifiers, project/version, units and format documentation
        with every export.
      </PageIntro>
      <Box component="section" aria-labelledby="download-options" sx={{ mb: 4 }}>
        <Typography id="download-options" component="h2" variant="h5" gutterBottom>Find observations & download data</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: "70ch", mb: 2 }}>
          Start with a calendar to inspect available measurements and profiles.
          Use the HTTPS APIs below to download JSON in scripts or programs.
          Public read requests do not require an account or API key.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} useFlexGap sx={{ flexWrap: "wrap", gap: 2, mb: 2 }}>
          <Button variant="contained" component={RouterLink} to="/level1/calendar">Explore Level 1 spectra</Button>
          <Button variant="outlined" component={RouterLink} to="/level2/calendar">Explore Level 2 profiles</Button>
          <Button variant="outlined" href="#parquet-access">Analyze Parquet datasets</Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: "70ch" }}>
          Product formats: <Link href="/documents/L1_ATBD.pdf" target="_blank" rel="noopener noreferrer">Level 1 processing (PDF, new tab)</Link>{" · "}
          <Link href="/documents/L2_DATA.pdf" target="_blank" rel="noopener noreferrer">Level 2 format & overview (PDF, new tab)</Link>.
          See <Link component={RouterLink} to="/documentation">all documentation</Link> for validation and processing details.
        </Typography>
      </Box>
      <Divider sx={{ mb: 4 }} />
      <Box component="nav" aria-label="Data access guide" sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 4 }}>
        <Link href="#parquet-archive">Archive file index</Link>
        <Link href="#parquet-access">Parquet datasets</Link>
        <Link href="#level2-api">Level 2 profiles</Link>
        <Link href="#level1-api">Level 1 spectra</Link>
        <Link href="#archive-api">S3 archive</Link>
        <Link href="#scientific-use">Scientific use</Link>
      </Box>
      <ParquetArchive />
      <Divider sx={{ mb: 4 }} />
      <ParquetAccess />
      <Divider sx={{ mb: 4 }} />
      <Box component="section" aria-labelledby="level2-api" sx={{ mb: 4, maxWidth: "90ch" }}>
        <Typography id="level2-api" component="h2" variant="h5" gutterBottom>Level 2 · Retrieved profiles</Typography>
        <Typography color="text.secondary">
          Follow the calendar → scans → products sequence. All three endpoints use
          GET and return JSON arrays. Dates use UTC and the YYYY-MM-DD format.
          Replace the values in braces below with identifiers returned by the preceding request.
        </Typography>
        <CopyableCode text={l2Root} label="Level 2 API root" />
        <EndpointList endpoints={l2Endpoints} />
        <Typography color="text.secondary" variant="body2">
          Append each path to the root. The scan-list parameter is <code>fm</code>,
          while the calendar response calls it <code>freqmode</code>.
          The products endpoint returns products available through this API for the selected scan;
          it has no project, product or pressure-range filter and no pagination.
        </Typography>
        <Typography component="h3" variant="h6" sx={{ mt: 3, mb: 1 }}>Download one scan with Python</Typography>
        <Typography color="text.secondary" variant="body2">
          This example uses only the Python standard library. It discovers a scan
          in January 2015, saves its products as JSON and records the request URL
          in a companion text file. Change the year and month to explore another period.
        </Typography>
        <CopyableCode text={l2Python} label="Python Level 2 download" />
        <Typography color="text.secondary" variant="body2" sx={{ mt: 2 }}>
          For these endpoints, HTTP 404 means no matching data, 422 means an invalid
          or missing parameter, and 424 means a query dependency failed.
          The example stops on HTTP errors; treat a failed request separately from a valid empty result.
        </Typography>
        <Alert severity="info" sx={{ mt: 3 }}>
          Each product has <code>name</code>, <code>scanid</code> and <code>data</code>.
          The data arrays are <code>vmr</code>, <code>alt</code>, <code>meas_resp</code>, <code>pressure</code> and <code>temp</code>.
          Optional <code>error_noise</code> and <code>error_total</code> arrays contain source
          standard errors in the same units as <code>vmr</code>; older responses may omit them.
          Source total error excludes internal smoothing error. Project/version, quality flags
          and averaging kernels are not included. This is not a complete retrieval record.
        </Alert>
      </Box>
      <Divider sx={{ mb: 4 }} />
      <Box component="section" aria-labelledby="level1-api" sx={{ mb: 4, maxWidth: "90ch" }}>
        <Typography id="level1-api" component="h2" variant="h5" gutterBottom>Level 1 · Calibrated spectra</Typography>
        <Typography color="text.secondary">
          The Level 1 calendar and spectrum views use the v5 API on this site.
          GET responses use a <code>Type</code>, <code>Count</code> and <code>Data</code> envelope.
          Field names and paths are case-sensitive; keep the trailing slash on these routes.
          {" "}<Link href={`${l1Root}/spec`} target="_blank" rel="noopener noreferrer">Level 1 OpenAPI specification (JSON, new tab)</Link>.
        </Typography>
        <CopyableCode text={l1Root} label="Level 1 API root" />
        <EndpointList endpoints={l1Endpoints} />
        <CopyableCode text={`${l1Root}/period_info/2015/1/11/?length=1`} label="Level 1 discovery example" />
        <Typography color="text.secondary" variant="body2" sx={{ mt: 2 }}>
          Append the paths to the Level 1 root and replace the values in braces.
          Preserve <code>ScanID</code>, <code>FreqMode</code>, <code>Backend</code>, <code>Version</code> and <code>Quality</code> wherever returned.
          Do not assume that <code>Count</code> is a pagination total or that <code>Data</code> is always an array.
          Use short date windows. Calendar counts and scan lists come from separate catalogues and can differ.
        </Typography>
      </Box>
      <Divider sx={{ mb: 4 }} />
      <Box component="section" aria-labelledby="archive-api" sx={{ mb: 4, maxWidth: "90ch" }}>
        <Typography id="archive-api" component="h2" variant="h5" gutterBottom>S3 archive · Check availability first</Typography>
        <Typography color="text.secondary">
          The archive API serves Level 1 JSON from a versioned Parquet release.
          Check its status before requesting data, or open the <Link component={RouterLink} to="/migration">S3 archive page</Link>.
        </Typography>
        <CopyableCode text={`${archiveRoot}/status`} label="Archive status request" />
        <Alert severity="info" sx={{ mt: 2 }}>
          Data access requires <code>ready: true</code> and a validated release.
          An export in progress is not a published archive. A <code>whole_mission</code> scope
          or a release identifier alone does not establish readiness.
        </Alert>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 2 }}>
          When ready, use the Level 1 route shapes above under <code>{archiveRoot}</code>.
          Add <code>release_id</code> from the status response to every data request,
          and pass the <code>Backend</code> returned by discovery as the <code>backend</code> parameter
          on scan, log and spectrum requests. Choose dates and modes within the reported coverage;
          spectra require a backend listed in <code>serving.spectra_backends</code>.
          Calendar requests allow 1–366 days. HTTP 409 means the pinned release changed;
          503 means the archive or a required dependency is unavailable, not an empty result.
          The API returns JSON;
          these routes are not direct Parquet downloads.
        </Typography>
      </Box>
      <Divider sx={{ mb: 4 }} />
      <Box component="section" aria-labelledby="scientific-use" sx={{ maxWidth: "90ch" }}>
        <Typography id="scientific-use" component="h2" variant="h5" gutterBottom>Use the data with its context</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Keep the exact returned identifiers, request URL, observation date and available
          version metadata with each download. Preserve array alignment and missing values:
          a JSON <code>null</code> is not zero. Check units, measurement response, quality
          and uncertainty before analysis; temperature products must not be interpreted as gas mixing ratios.
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Read the <Link href="/documents/L2_DATA.pdf" target="_blank" rel="noopener noreferrer">Level 2 format and overview (PDF, new tab)</Link> and
          the <Link href="/documents/PVER.pdf" target="_blank" rel="noopener noreferrer">Product Validation and Evolution Report (PDF, new tab)</Link> for
          product-specific vertical coverage and validation. These scientific documents
          describe the products; use the routes on this page for API requests.
        </Typography>
        <Alert severity="warning">
          Published product guidance includes caution for chlorine monoxide from early
          2010 to January 2018, possible water-vapour low bias up to 15%, and a possible
          mesospheric-temperature cold bias of 3–5 K. Nitric oxide and carbon monoxide
          have sporadic temporal coverage. Check the validation report for the product and period you use.
        </Alert>
      </Box>
    </Container>
  );
}
