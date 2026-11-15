import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Chip, Container,
  Link, List, ListItem, ListItemButton, Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Link as RouterLink } from "react-router-dom";
import { PageIntro } from "./PageIntro";

const documents = [
  { file: "L1_ATBD.pdf", title: "L1 processing · Algorithm theoretical basis", date: "2020-09-09" },
  { file: "L2_ATBD.pdf", title: "L2 processing · Algorithm theoretical basis", date: "2020-03-07" },
  { file: "RBD.pdf", title: "Requirement baseline", date: "2015-12-10" },
  { file: "VDS.pdf", title: "Verification dataset · Technical note", date: "2019-12-04" },
  { file: "L2_DATA.pdf", title: "L2 data · Format and overview", date: "2020-08-12" },
  { file: "DBMI.pdf", title: "Level 2 processing configuration", date: "2020-09-08" },
  { file: "IODD.pdf", title: "Input/output data definition · Level 2 processor", date: "2020-09-08" },
  { file: "CAD.pdf", title: "Level 2 completeness analysis", date: "2019-12-04" },
  { file: "PVER.pdf", title: "Product validation and evolution report", date: "2020-10-27" },
];

export const Documents = () => (
  <Container maxWidth="lg" sx={{ py: 4 }}>
    <PageIntro eyebrow="Research resources" title="Odin/SMR documentation">
      Find the processing methods, data formats and validation guidance needed to
      work with SMR observations. Document dates are shown below; links open in a new tab.
    </PageIntro>
    <List aria-label="Scientific documentation" disablePadding sx={{ display: "grid", gap: 1.5, mb: 4 }}>
      {documents.map((document) => (
        <ListItem key={document.file} disablePadding sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
          <ListItemButton component="a" href={`/documents/${document.file}`} target="_blank" rel="noopener noreferrer" aria-label={`${document.title}, PDF, ${document.date}, opens in a new tab`}
            sx={{ px: { xs: 2, sm: 3 }, py: 2, alignItems: "flex-start", gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1, justifyContent: "space-between" }}>
              <Typography color="primary">{document.title}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                <Chip label="PDF" size="small" variant="outlined" sx={{ fontSize: 12 }} />
                <Typography component="time" dateTime={document.date} variant="caption" color="text.secondary">{document.date}</Typography>
              </Box>
            </Box>
            <OpenInNewIcon fontSize="small" color="action" sx={{ mt: .5 }} aria-label="Opens in a new tab" />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
    <Box component="section" aria-labelledby="observing-plan-title" sx={{ mb: 4 }}>
      <Typography id="observing-plan-title" component="h2" variant="h5" gutterBottom>Mission observing plan</Typography>
      <Link href="/documents/astro_aero_programme159.xlsx" target="_blank" rel="noopener noreferrer"
        sx={{ display: "inline-flex", alignItems: "center", gap: 1, py: 1.5, mb: 1 }}>
        Programme planning spreadsheet <Chip label="XLSX" size="small" variant="outlined" />
        <OpenInNewIcon fontSize="small" aria-label="Opens in a new tab" />
      </Link>
      <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: "8px !important", "&::before": { display: "none" }, maxWidth: "75ch" }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="observing-plan-help" id="observing-plan-help-heading">
          <Typography>How to read the observing plan</Typography>
        </AccordionSummary>
        <AccordionDetails id="observing-plan-help">
          <Typography color="text.secondary">
            Start with the <strong>Observing Plan</strong> tab. Columns B, R and S
            show the date, mode and description. Pointing and instrument modes
            vary by orbital region; comments explain non-standard settings.
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
    <Typography color="text.secondary" sx={{ maxWidth: "70ch" }}>
      Looking for data rather than documentation? See the <Link component={RouterLink} to="/data_access">data access and product guide</Link> for
      download options and product caveats.
    </Typography>
    <Typography sx={{ mt: 2 }}>
      Working with an AI assistant? <Link component={RouterLink} to="/data_access/odin-mcp">Install, run and prompt Odin MCP</Link> to use cited research guidance and public data tools.
    </Typography>
  </Container>
);
