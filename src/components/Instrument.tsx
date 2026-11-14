import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Container, Link, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { InstrumentDiagram } from "./InstrumentDiagram";
import { MissionReferences } from "./MissionReferences";
import { PageIntro } from "./PageIntro";

export default function Instrument() {
  return <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
    <PageIntro eyebrow="Platform & instrument" title="How Odin observed the atmosphere">
      Odin looked sideways through the atmospheric limb. As the spacecraft changed its
      pointing, SMR sampled different tangent heights and recorded the emitted spectrum.
    </PageIntro>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 3, mb: 5 }}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="overline" color="primary">The platform</Typography>
        <Typography component="h2" variant="h5" sx={{ mt: 1, mb: 1 }}>One spacecraft, two instruments</Typography>
        <Typography color="text.secondary">The approximately 250 kg, three-axis-stabilized satellite carried SMR and the co-aligned OSIRIS instrument. Star trackers and gyros supported attitude knowledge; reaction wheels and magnetic coils controlled pointing.</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Its nominal early-mission orbit was Sun-synchronous, about 600 km above Earth. Orbit height changed over the mission.</Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="overline" color="primary">The radiometer</Typography>
        <Typography component="h2" variant="h5" sx={{ mt: 1, mb: 1 }}>A spectrum of the atmospheric limb</Typography>
        <Typography color="text.secondary">SMR used a 1.1 m telescope and heterodyne receivers to measure weak atmospheric emission. The spectral features contain information about gases and temperature along the line of sight.</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Four tunable submillimetre receivers cover 486–504 and 541–581 GHz. The hardware also includes a fixed 118.75 GHz receiver.</Typography>
      </Paper>
    </Box>
    <Stack spacing={4}>
      <Accordion disableGutters variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="platform-diagram" id="platform-diagram-heading"><Typography component="h2" variant="subtitle1">See the satellite platform diagram</Typography></AccordionSummary>
        <AccordionDetails id="platform-diagram"><InstrumentDiagram kind="platform" /></AccordionDetails>
      </Accordion>
      <Box component="section" aria-labelledby="smr-diagram-title">
        <Typography id="smr-diagram-title" component="h2" variant="h5" sx={{ mb: 1 }}>From atmospheric emission to a profile</Typography>
        <Typography color="text.secondary" sx={{ mb: 2, maxWidth: "80ch" }}>The radiometer measures spectra. Ground processing calibrates those measurements, then an atmospheric retrieval estimates profiles. Level 1 and Level 2 describe these different stages.</Typography>
        <InstrumentDiagram kind="smr" />
      </Box>
      <Accordion disableGutters variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="instrument-detail" id="instrument-detail-heading"><Typography component="h2" variant="subtitle1">Receiver settings and spectral resolution</Typography></AccordionSummary>
        <AccordionDetails id="instrument-detail">
          <Stack spacing={2} sx={{ maxWidth: "85ch" }}>
            <Typography>Frequency modes choose receiver settings and spectral bands. They are not interchangeable product labels: the available gases, vertical coverage and retrieval settings depend on the mode and processing project.</Typography>
            <Typography>The two autocorrelation spectrometers, AC1 and AC2, support atmospheric observations. In the atmospheric configuration described by the Level 2 ATBD, 1 MHz channel spacing corresponds to a spectral resolution of 1.2 or 2 MHz, depending on the processing window.</Typography>
            <Typography>The 118.75 GHz hardware channel should not be assumed to be the source of every published temperature product. See the <Link href="/documents/L2_ATBD.pdf">Level 2 processing ATBD (2020, PDF)</Link> for the receiver and retrieval configuration.</Typography>
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Accordion disableGutters variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="calibration-detail" id="calibration-detail-heading"><Typography component="h2" variant="subtitle1">Calibration and scientific interpretation</Typography></AccordionSummary>
        <AccordionDetails id="calibration-detail">
          <Stack spacing={2} sx={{ maxWidth: "85ch" }}>
            <Typography>Cold-space views and an internal load provide calibration references. Keep the calibration and retrieval version with any downloaded product; the measured spectra and retrieved profiles are different data products.</Typography>
            <Typography>Check product-specific vertical coverage, measurement response, quality and uncertainty before interpreting a profile. A retrieved value is not a direct measurement at a single point.</Typography>
            <Typography variant="body2" color="text.secondary">Technical detail: <Link href="/documents/L1_ATBD.pdf">Level 1 processing ATBD (2020, PDF)</Link>{" · "}<Link href="/documents/L2_ATBD.pdf">Level 2 processing ATBD (2020, PDF)</Link>{" · "}<Link href="/documents/PVER.pdf">Product validation report (2020, PDF)</Link>. These describe processing methods and validation, not current archive completeness.</Typography>
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Box component="section" aria-labelledby="references">
        <Typography id="references" component="h2" variant="h5" sx={{ mb: 2 }}>Published references</Typography>
        <MissionReferences all />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>Also see the <Link href="https://www.chalmers.se/en/research/infrastructure/oso/telescopes-and-instruments/radio-astronomy-facilities/odin/">Chalmers mission and instrument overview</Link> and <Link component={RouterLink} to="/documentation">processing and validation documents</Link>.</Typography>
      </Box>
      <Box sx={{ borderTop: 1, borderColor: "divider", pt: 3 }}>
        <Typography component="h2" variant="h5" gutterBottom>Next: understand the data products</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Try a small Level 2 dataset before selecting files for a larger analysis.</Typography>
        <Button variant="contained" component={RouterLink} to="/data_access/quickstart" endIcon={<ArrowForwardIcon />}>Start the L2 quickstart</Button>
      </Box>
    </Stack>
  </Container>;
}
