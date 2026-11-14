import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Box, Button, Container, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { JourneyCard } from "./JourneyCard";
import { MissionReferences } from "./MissionReferences";

export const Home = () => (
  <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
    <Box component="section" aria-labelledby="mission-title" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 7fr) minmax(0, 5fr)" }, gap: { xs: 3, md: 5 }, alignItems: "center", mb: { xs: 5, md: 7 } }}>
      <Box>
        <Typography variant="overline" color="primary">Odin-SMR · An atmospheric science archive</Typography>
        <Typography id="mission-title" component="h1" variant="h3" sx={{ fontSize: { xs: "1.875rem", md: "2.5rem" }, lineHeight: 1.2, mt: 1.5, mb: 2 }}>A long view of Earth’s atmosphere</Typography>
        <Typography sx={{ mb: 2 }}>From 2001 to 2026, Odin observed our atmosphere from orbit. Its Sub-Millimetre Radiometer (SMR) measured atmospheric emission to study ozone chemistry, water vapour and circulation in the stratosphere and mesosphere.</Typography>
        <Typography color="text.secondary">Explore the measurements, inspect retrieved atmospheric profiles, or download data for your own research.</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} useFlexGap sx={{ gap: 1.5, flexWrap: "wrap", mt: 3 }}>
          <Button variant="contained" component={RouterLink} to="/explore" endIcon={<ArrowForwardIcon />}>Explore observations</Button>
          <Button variant="outlined" component={RouterLink} to="/data_access/quickstart">Start with Level 2</Button>
        </Stack>
      </Box>
      <Box component="figure" sx={{ m: 0, minWidth: 0 }}>
        <Box component="img" src="/images/odin665.jpg" alt="Artist’s illustration of Odin pointing its telescope toward the atmospheric limb above Earth" sx={{ display: "block", width: "100%", aspectRatio: "1.6", objectFit: "cover", borderRadius: 2, bgcolor: "#071b27" }} />
        <Typography component="figcaption" variant="caption" color="text.secondary" sx={{ mt: 1 }}>Odin observing the atmospheric limb · mission illustration</Typography>
      </Box>
    </Box>
    <Box sx={{ borderLeft: 3, borderColor: "primary.main", pl: 2.5, mb: 5, maxWidth: "85ch" }}>
      <Typography variant="body2" color="text.secondary">Satellite operations have ended. The observations remain available for research, and archive reprocessing continues. <Link href="https://en.rymdstyrelsen.se/upptack-rymden/bloggen/2026/08/svenskledda-satelliten-odin-har-avslutat-sitt-uppdrag-efter-25-ar-i-rymden/">Read the mission conclusion</Link>.</Typography>
    </Box>
    <Box component="section" aria-label="Find your way" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 2.5, mb: { xs: 5, md: 7 } }}>
      <JourneyCard eyebrow="01 · The instrument" title="How Odin measured" to="/instrument" action="Meet the instrument">Meet the satellite and SMR. Follow atmospheric emission from the telescope to a scientific profile.</JourneyCard>
      <JourneyCard eyebrow="02 · Use the data" title="Start a small analysis" to="/data_access" action="Find your starting point">Learn the Level 2 format, select Parquet files and try Python and DuckDB examples.</JourneyCard>
      <JourneyCard eyebrow="03 · Explore" title="Look through the record" to="/explore" action="Browse the observations">Move from a calendar to a map, then inspect a spectrum or atmospheric profile.</JourneyCard>
    </Box>
    <Box component="section" aria-labelledby="science-title" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 2fr)" }, gap: { xs: 3, md: 6 }, pt: 4, borderTop: 1, borderColor: "divider" }}>
      <Box>
        <Typography id="science-title" component="h2" variant="h4" gutterBottom>Science behind the record</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Odin was a Sweden-led collaboration with Canada, Finland and France, serving both astronomy and atmospheric research. These published articles introduce the mission and assess selected retrieved products.</Typography>
        <Link component={RouterLink} to="/instrument#references">Instrument papers and further reading →</Link>
      </Box>
      <MissionReferences />
    </Box>
  </Container>
);
