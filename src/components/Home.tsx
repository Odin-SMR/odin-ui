import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Box, Button, Container, Link, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { InspectMenu } from "./InspectMenu";
import StackedBarPlot from "./StackedBarPlot";

export const Home = () => {
  const navigate = useNavigate();
  return <Container maxWidth={false} sx={{ maxWidth: 1920, py: { xs: 2, sm: 3, xl: 4 } }}>
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" variant="h3">Odin/SMR</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>Explore calibrated spectra and atmospheric profiles.</Typography>
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1, flexWrap: "wrap", alignItems: { sm: "center" } }}>
        <Button variant="contained" component={RouterLink} to="/level1/calendar" endIcon={<ArrowForwardIcon />}>Level 1 calendar</Button>
        <Button variant="outlined" component={RouterLink} to="/level2/calendar" endIcon={<ArrowForwardIcon />}>Level 2 calendar</Button>
        <InspectMenu label="About the mission" description="Mission context and product guidance">
          <Stack spacing={2}>
            <Box component="img" src="/images/odin665.jpg" alt="The Odin satellite observing Earth's atmosphere from orbit" sx={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 1 }} />
            <Typography variant="body2">Odin launched in 2001 and served astronomy and aeronomy. The Sub-Millimetre Radiometer (SMR) provides a long-term scientific record for atmospheric research.</Typography>
            <Typography variant="body2">Satellite operations have ended. The observations remain available for research, and reprocessing of the archive continues.</Typography>
            <Typography variant="body2">Level 1 contains calibrated spectra. Level 2 contains retrieved atmospheric profiles. Read the product documentation and validation guidance before interpreting the data.</Typography>
            <Link component={RouterLink} to="/data_access">Data access & product guide</Link>
          </Stack>
        </InspectMenu>
      </Stack>
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
        <Typography component="h2" variant="h5">The observation record</Typography>
        <Typography variant="body2" color="text.secondary">Stored Level 1 scan-count sums by year and frequency mode. Inspect a year, then open its monthly distribution.</Typography>
        <Box sx={{ minHeight: { xs: 560, sm: 500, xl: 560 }, minWidth: 0 }}><StackedBarPlot updateYear={(year) => navigate(`/level1/statistics/${year}`)} /></Box>
      </Paper>
      <Stack direction="row" useFlexGap spacing={3} sx={{ flexWrap: "wrap" }}>
        <Link component={RouterLink} to="/data_access" sx={{ py: 1 }}>Data access & product guide</Link>
        <Link component={RouterLink} to="/documentation" sx={{ py: 1 }}>Documentation</Link>
        <Link component={RouterLink} to="/news" sx={{ py: 1 }}>Mission updates</Link>
      </Stack>
    </Stack>
  </Container>;
};
