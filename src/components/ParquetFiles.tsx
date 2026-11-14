import { Box, Container, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { PageIntro } from "./PageIntro";
import { ParquetAccess } from "./ParquetAccess";
import { ParquetArchive } from "./ParquetArchive";

export default function ParquetFiles() {
  const { hash } = useLocation();
  const archive = hash === "#parquet-archive";
  return <Container maxWidth="lg" sx={{ py: 4 }}>
    <Link component={RouterLink} to="/data_access" sx={{ display: "inline-block", mb: 2 }}>← Use data</Link>
    <PageIntro eyebrow="Download" title="Find Parquet files">Start with a checked sample or select files from the larger Level 2 archive. Only catalog metadata loads until you choose a download.</PageIntro>
    <Box component="nav" aria-label="Parquet collections" sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
      <Link component={RouterLink} to="/data_access/files#parquet-access" aria-current={!archive ? "page" : undefined} sx={{ px: 2, py: 1.5, border: 1, borderColor: !archive ? "primary.main" : "divider", borderRadius: 1 }}>Checked samples</Link>
      <Link component={RouterLink} to="/data_access/files#parquet-archive" aria-current={archive ? "page" : undefined} sx={{ px: 2, py: 1.5, border: 1, borderColor: archive ? "primary.main" : "divider", borderRadius: 1 }}>Full archive index</Link>
    </Box>
    {archive ? <ParquetArchive /> : <ParquetAccess />}
    <Stack spacing={1.5} sx={{ mt: 3 }}>
      <Typography color="text.secondary">A file’s presence does not establish scientific quality or complete coverage. Keep the processing version and consult the product guidance.</Typography>
      <Link component={RouterLink} to="/data_access/quickstart">Next: analyze a file with Python and DuckDB →</Link>
    </Stack>
  </Container>;
}
