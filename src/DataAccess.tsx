import { Box, Button, Container, Link, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, Navigate, useLocation } from "react-router-dom";
import { JourneyCard } from "./components/JourneyCard";
import { PageIntro } from "./components/PageIntro";

export function DataAccess() {
  const { hash } = useLocation();
  if (["#parquet-access", "#parquet-archive"].includes(hash)) return <Navigate replace to={`/data_access/files${hash}`} />;
  if (["#level2-api", "#level1-api", "#archive-api", "#scientific-use"].includes(hash)) return <Navigate replace to={`/data_access/api${hash}`} />;
  return <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
    <PageIntro eyebrow="Use data" title="From observations to your analysis">
      Start with a small Level 2 example, then choose files for your own question.
      Published downloads are available without signing in.
    </PageIntro>
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, mb: 4, bgcolor: "action.hover" }}>
      <Typography variant="overline" color="primary">Start here · Python + DuckDB</Typography>
      <Typography component="h2" variant="h4" sx={{ mt: 1, mb: 1 }}>Your first Level 2 dataset</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: "65ch", mb: 2 }}>Read one ozone Parquet file, count observations and select tropical or polar scans. Learn what a row means before making an average.</Typography>
      <Button variant="contained" component={RouterLink} to="/data_access/quickstart">Start the L2 quickstart</Button>
    </Paper>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 2.5 }}>
      <JourneyCard eyebrow="Download" title="Choose Parquet files" to="/data_access/files" action="Find files">Select a sample or browse the archive by project, product and storage month. Keep the file selection with your analysis.</JourneyCard>
      <JourneyCard eyebrow="Understand" title="Interpret the fields" to="/data_access/parquet-schema" action="Read the schema guide">Check units, coordinates, retrieval diagnostics and missing values. Formats differ between processing generations.</JourneyCard>
      <JourneyCard eyebrow="Automate" title="Request individual scans" to="/data_access/api" action="Open API reference">Use the Level 1 and Level 2 HTTPS APIs for small requests and interactive applications.</JourneyCard>
    </Box>
    <Stack spacing={1.5} sx={{ mt: 5, maxWidth: "78ch" }}>
      <Typography component="h2" variant="h5">Which level do I need?</Typography>
      <Typography><strong>Level 2</strong> contains retrieved atmospheric profiles: gases or temperature at a set of vertical levels. This is the usual starting point for atmospheric analysis.</Typography>
      <Typography><strong>Level 1</strong> contains calibrated spectra: brightness temperature as a function of frequency, with scan geometry and measurement metadata.</Typography>
      <Typography color="text.secondary">For scientific use, retain the processing project and version, check product-specific validation, and keep uncertainty and quality information. Missing values are not zero.</Typography>
      <Link component={RouterLink} to="/data_access/parquet-guide">Full analysis guide and downloadable notebooks →</Link>
      <Link component={RouterLink} to="/explore">Prefer to look around first? Explore the observations →</Link>
    </Stack>
  </Container>;
}
