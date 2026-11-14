import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Box, Paper, Typography } from "@mui/material";

interface Block { title: string; detail: string; note?: string }
function Flow({ blocks, label }: { blocks: Block[]; label: string }) {
  return <Box component="ol" aria-label={label} sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: { xs: 3, md: 2.5 }, listStyle: "none", p: 0, m: 0 }}>
    {blocks.map((block, index) => <Box component="li" key={block.title} sx={{ flex: 1, minWidth: 0, position: "relative", display: "flex" }}>
      <Paper variant="outlined" sx={{ p: 2, width: "100%", bgcolor: "background.paper" }}>
        <Typography variant="subtitle2" sx={{ mb: .75 }}>{block.title}</Typography>
        <Typography variant="body2" color="text.secondary">{block.detail}</Typography>
        {block.note && <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, pt: 1, borderTop: 1, borderColor: "divider", display: "block" }}>{block.note}</Typography>}
      </Paper>
      {index < blocks.length - 1 && <ArrowForwardIcon aria-hidden="true" sx={{ position: "absolute", color: "primary.main", fontSize: 20, right: { xs: "calc(50% - 10px)", md: -20 }, top: { xs: "calc(100% + 2px)", md: "calc(50% - 10px)" }, transform: { xs: "rotate(90deg)", md: "none" } }} />}
    </Box>)}
  </Box>;
}

export function InstrumentDiagram({ kind }: { kind: "platform" | "smr" }) {
  return <Box component="figure" sx={{ m: 0, p: { xs: 2, sm: 3 }, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "action.hover" }}>
    {kind === "platform" ? <Flow label="Conceptual spacecraft support and observation path" blocks={[
      { title: "Spacecraft support", detail: "Solar power, attitude knowledge and pointing control", note: "Star trackers, gyros, reaction wheels and magnetic coils" },
      { title: "Shared platform", detail: "A three-axis-stabilized spacecraft points the instruments at the atmospheric limb." },
      { title: "Co-aligned payloads", detail: "SMR: submillimetre radiometry. OSIRIS: optical spectroscopy and infrared imaging." },
      { title: "Recorded observations", detail: "Onboard handling and downlink bring measurements to ground processing." },
    ]} /> : <>
      <Flow label="SMR measurement signal path" blocks={[
        { title: "Atmospheric limb", detail: "Emission along the line of sight through the atmosphere" },
        { title: "Telescope & optics", detail: "The 1.1 m telescope collects the signal.", note: "Switching optics also view cold space and an internal calibration load." },
        { title: "Heterodyne receivers", detail: "Mixers translate the signal to a lower frequency for analysis.", note: "Local oscillators provide the reference signal." },
        { title: "Spectrometers", detail: "AC1 and AC2 resolve atmospheric spectra.", note: "The instrument also carries an acousto-optical spectrometer (AOS)." },
      ]} />
      <Typography variant="body2" color="text.secondary" sx={{ my: 2.5, textAlign: "center" }}>Recorded spectra are downlinked for ground processing ↓</Typography>
      <Flow label="SMR ground processing and data products" blocks={[
        { title: "Calibration", detail: "Reference measurements and instrument information calibrate the spectra." },
        { title: "Level 1", detail: "Brightness temperature spectra, with frequency and scan geometry" },
        { title: "Atmospheric retrieval", detail: "A forward model and inverse method estimate the atmospheric state." },
        { title: "Level 2", detail: "Retrieved gas or temperature profiles, with diagnostics and uncertainty" },
      ]} />
    </>}
    <Typography component="figcaption" variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>Conceptual block diagram; not to scale or a wiring schematic. Based on Murtagh et al. (2002), Frisk et al. (2003), Olberg et al. (2003) and the processing documentation.</Typography>
  </Box>;
}
