import { Box, Container, Link, Paper, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { JourneyCard } from "./JourneyCard";
import { PageIntro } from "./PageIntro";
import StackedBarPlot from "./StackedBarPlot";

export default function Explore() {
  const navigate = useNavigate();
  return <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
    <PageIntro eyebrow="Explore" title="Get to know the observations">
      Choose atmospheric profiles or measured spectra. In either view, pick a day,
      choose a scan on the map, then inspect its plot and exact values.
    </PageIntro>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 3, mb: 5 }}>
      <JourneyCard eyebrow="Level 2 · retrieved profiles" title="See the atmosphere by height" to="/level2/calendar" action="Explore L2 profiles" primary>Inspect gas abundance or temperature through the atmosphere. Compare available products and examine measurement response and uncertainty where supplied.</JourneyCard>
      <JourneyCard eyebrow="Level 1 · calibrated spectra" title="Look at the measurements" to="/level1/calendar" action="Explore L1 spectra">See brightness temperature against frequency, select spectra along a scan and inspect observation locations.</JourneyCard>
    </Box>
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 3 }, minWidth: 0 }}>
      <Typography component="h2" variant="h5">When did Odin observe?</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>Stored Level 1 scan-count sums by year and frequency mode. Select a year for its monthly distribution. Counts describe the catalog, not validated Level 2 coverage.</Typography>
      <Box sx={{ minHeight: { xs: 560, sm: 500 }, minWidth: 0 }}><StackedBarPlot updateYear={(year) => navigate(`/level1/statistics/${year}`)} /></Box>
    </Paper>
    <Typography color="text.secondary" sx={{ mt: 3 }}>Ready to use the data? <Link component={RouterLink} to="/data_access/quickstart">Try the Level 2 quickstart</Link> or <Link component={RouterLink} to="/data_access/files">find Parquet files</Link>.</Typography>
  </Container>;
}
