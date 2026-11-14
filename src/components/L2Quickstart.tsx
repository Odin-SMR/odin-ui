import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import { Alert, Box, Button, Container, Link, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import script from "../../public/parquet/l2-quickstart.py?raw";
import { PageIntro } from "./PageIntro";

const asset = (name: string) => `${import.meta.env.BASE_URL}parquet/${name}`;
const sqlBlock = (name: string) => script.match(new RegExp(`${name} = """\\n([\\s\\S]*?)\\n"""`))?.[1] ?? "";
const commands = `python -m pip install duckdb==1.4.4
python l2-quickstart.py`;
const openFile = `import duckdb

con = duckdb.connect()
con.execute("SET TimeZone = 'UTC'")
# Use the verified local file saved by l2-quickstart.py.
path = "cffb359348a56bedc32e9164f74a9dfc65b9dbfe8858eb5b9477fd55a051d149.parquet"
con.read_parquet(path, hive_partitioning=False).create_view("l2")
# Run any SQL below with con.sql(""" ... """).show()`;

function Code({ label, text }: { label: string; text: string }) {
  const [status, setStatus] = useState("");
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setStatus("Copied."); }
    catch { setStatus("Clipboard unavailable. Select the code and copy it."); }
  };
  return <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, my: 2, minWidth: 0 }}>
    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1 }}>
      <Typography variant="subtitle2">{label}</Typography>
      <Button size="small" startIcon={<ContentCopyIcon />} onClick={copy} aria-label={`Copy ${label}`}>Copy</Button>
    </Stack>
    <Box component="pre" tabIndex={0} aria-label={label} sx={{ m: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", fontSize: ".8125rem", lineHeight: 1.65 }}><code>{text}</code></Box>
    <Typography role="status" variant="caption" sx={{ display: "block", mt: status ? 1 : 0 }}>{status}</Typography>
  </Box>;
}

const detailSx = { my: 2, "& summary": { cursor: "pointer", py: 1.5, fontWeight: 500 }, "& summary:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 } };
const sectionSx = { mt: 5, maxWidth: "84ch", minWidth: 0 };

export default function L2Quickstart() {
  const [example, setExample] = useState<"counts" | "regions">("counts");
  return <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
    <Link component={RouterLink} to="/data_access" sx={{ display: "inline-block", mb: 2 }}>← Use the data</Link>
    <PageIntro eyebrow="Level 2 · Python & DuckDB" title="Your first L2 analysis">
      Start with a small ozone file. Learn what a row means, count observations, then find tropical or polar profiles.
    </PageIntro>
    <Box component="section" aria-labelledby="quickstart-download" sx={{ ...sectionSx, mt: 0 }}>
      <Typography id="quickstart-download" component="h2" variant="h5" gutterBottom>1. Open a small, known dataset</Typography>
      <Typography>Level 2 contains atmospheric profiles retrieved from the calibrated Level 1 spectra. Parquet stores those values in columns, so DuckDB can query them with SQL directly from Python.</Typography>
      <Box sx={{ bgcolor: "action.hover", borderRadius: 2, p: 2, my: 2 }}>
        <Typography sx={{ fontWeight: 600 }}>Ozone · 25–26 August 2001 · 2.05 MiB</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>221 scans / 6,188 vertical rows. Project ALL-Strat-v3.0.0, frequency mode 1, product O3-501GHz-20to50km.</Typography>
      </Box>
      <Typography>Download the script, save it in a new folder, and run these commands with Python. It downloads one public file, verifies its size and SHA256, and runs the examples below. No account is needed.</Typography>
      <Button variant="contained" startIcon={<DownloadIcon />} href={asset("l2-quickstart.py")} download sx={{ mt: 2 }}>Download Python example</Button>
      <Code label="Install and run" text={commands} />
      <Typography variant="body2" color="text.secondary">Tested with Python 3.12 and DuckDB 1.4.4. Results and input provenance are saved beside the script. Repeated runs reuse the verified local file.</Typography>
      <Box component="details" sx={detailSx}>
        <Box component="summary">Choose other products or dates</Box>
        <Typography variant="body2">Use the <Link component={RouterLink} to="/data_access/files#parquet-archive">archive file index</Link> to choose a project, product, mode and month. It selects whole files; latitude filters are applied to their rows in DuckDB. Keep the processing identity and schema with your selection. Do not combine projects or overlapping files without checking for duplicate observations.</Typography>
        <Typography variant="body2" sx={{ mt: 1.5 }}>For the checked tutorial files, the <Link component={RouterLink} to="/data_access/files#parquet-access">sample catalog</Link> provides exact URLs, checksums and a selection JSON. The <Link component={RouterLink} to="/data_access/parquet-guide">full analysis guide</Link> explains selected-file notebooks and larger analyses.</Typography>
      </Box>
    </Box>

    <Box component="section" aria-labelledby="quickstart-interpret" sx={sectionSx}>
      <Typography id="quickstart-interpret" component="h2" variant="h5" gutterBottom>2. Read a row in context</Typography>
      <Typography>A row is one altitude level. Several rows sharing a scan ID form a vertical profile; a row count is not a count of observations.</Typography>
      <Box component="dl" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(10rem, 1fr) 3fr" }, columnGap: 3, rowGap: 1, my: 2, "& dt": { fontWeight: 600 }, "& dd": { m: 0, mb: { xs: 1, sm: 0 } } }}>
        <Box component="dt">Identity & time</Box><Box component="dd"><code>scan_id</code> plus project, mode and product; <code>time</code> is UTC.</Box>
        <Box component="dt">Location</Box><Box component="dd"><code>lat_1d</code> / <code>lon_1d</code> locate the scan in degrees. <code>latitude</code> / <code>longitude</code> vary by vertical level.</Box>
        <Box component="dt">Vertical coordinate</Box><Box component="dd"><code>altitude</code> is in metres; <code>pressure</code> in Pa.</Box>
        <Box component="dt">Ozone & uncertainty</Box><Box component="dd"><code>vmr</code>, <code>error_noise</code> and <code>error_total</code> are in mol/mol. Multiply by 10⁶ to display ppmv.</Box>
      </Box>
      <Alert severity="info">The quality flag is unknown (null) in this example file. The queries describe unscreened data; they do not establish suitability for a scientific analysis.</Alert>
      <Box component="details" sx={detailSx}>
        <Box component="summary">Quality, resolution and missing values</Box>
        <Typography variant="body2">Keep <code>quality</code>, <code>meas_response</code>, errors and averaging kernels (<code>avk</code>) with the profile. Measurement response is not an uncertainty; grid spacing is not vertical resolution. A missing or failed retrieval is not a zero. Use product-specific validation guidance before defining screening criteria.</Typography>
        <Typography variant="body2" sx={{ mt: 1.5 }}>These field names apply to this scalar L2 generation. L2I stores separate retrieval diagnostics and includes failures. Other generations can contain nested arrays. See the <Link component={RouterLink} to="/data_access/parquet-schema">schema guide</Link> and <Link href={asset("releases/odin-parquet-examples-20261113/schema.md")}>exact sample dictionary</Link>.</Typography>
        <Typography variant="body2" sx={{ mt: 1.5 }}>The source stores UTC timestamps at nanosecond precision. DuckDB 1.4.4 reads timezone-aware timestamps at microsecond precision; keep the original file for precise time work. These examples group dates in UTC.</Typography>
      </Box>
    </Box>

    <Box component="section" aria-labelledby="quickstart-query" sx={sectionSx}>
      <Typography id="quickstart-query" component="h2" variant="h5" gutterBottom>3. Ask a first question</Typography>
      <Typography>The downloaded script runs these SQL examples. To experiment in your own Python session, open the verified file first.</Typography>
      <Box component="details" sx={detailSx}><Box component="summary">Open the file in Python</Box><Code label="Open verified Parquet" text={openFile} /></Box>
      <Stack direction={{ xs: "column", sm: "row" }} role="group" aria-label="L2 example" sx={{ gap: 1, mt: 2 }}>
        <Button variant={example === "counts" ? "contained" : "outlined"} aria-pressed={example === "counts"} onClick={() => setExample("counts")}>Count observations</Button>
        <Button variant={example === "regions" ? "contained" : "outlined"} aria-pressed={example === "regions"} onClick={() => setExample("regions")}>Find a region</Button>
      </Stack>
      {example === "counts" ? <>
        <Typography variant="body2" sx={{ mt: 2 }}>Count vertical rows and distinct scans by UTC day and stored quality flag. Unknown quality and missing latitude remain visible.</Typography>
        <Code key="counts" label="SQL · daily counts" text={sqlBlock("SUMMARY_SQL")} />
      </> : <>
        <Typography variant="body2" sx={{ mt: 2 }}>Select scan reference latitudes: tropics −23.5° to +23.5°, northern polar band ≥60°, southern polar band ≤−60°. These are explicit example bands, not a polar-vortex mask. Change the final region filter to try another band.</Typography>
        <Code key="regions" label="SQL · tropical or polar scans" text={sqlBlock("REGION_SQL")} />
        <Typography variant="body2" color="text.secondary">This returns the matching scans in this product and file. Keep project, mode and product identity with the scan IDs when finding their profiles or diagnostics.</Typography>
      </>}
      <Box component="details" sx={detailSx}>
        <Box component="summary">Try a simple altitude-binned mean</Box>
        <Typography variant="body2">This example converts ozone to ppmv, groups tropical values in 5 km altitude bins between 20 and 50 km, then gives each contributing scan equal weight within a bin. It separates UTC days and quality flags, excludes non-finite values, and reports sample counts. It does not apply quality screening, account for sampling bias or averaging kernels, or estimate uncertainty on the mean.</Typography>
        <Code label="SQL · illustrative mean" text={sqlBlock("AVERAGE_SQL")} />
      </Box>
    </Box>

    <Box component="section" sx={{ ...sectionSx, pt: 3, borderTop: 1, borderColor: "divider" }}>
      <Typography component="h2" variant="h6" gutterBottom>Ready to explore further?</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} useFlexGap sx={{ flexWrap: "wrap", gap: 1.5 }}>
        <Button variant="contained" component={RouterLink} to="/explore">Explore the observations</Button>
        <Button variant="outlined" component={RouterLink} to="/data_access/files">Choose Parquet files</Button>
        <Button variant="outlined" href={asset("first-profile.ipynb")} download>Download a profile notebook</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>For research, retain the release, file hashes, processing identity, queries and screening choices. Read the <Link href={asset("releases/odin-parquet-examples-20261113/README.md")}>sample provenance and citation notes</Link>. This small snapshot does not describe mission-wide coverage.</Typography>
      <Typography variant="body2" sx={{ mt: 2 }}>Tool reference: <Link href="https://duckdb.org/docs/stable/data/parquet/overview.html">DuckDB Parquet queries</Link>.</Typography>
    </Box>
  </Container>;
}
