import { Box, Container, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function Footer() {
  return (
    <Box component="footer" sx={{ mt: 4, borderTop: 1, borderColor: "divider", py: 4 }}>
      <Container maxWidth="xl">
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 2fr) minmax(0, 1fr)" }, gap: 4 }}>
          <Box sx={{ maxWidth: "70ch" }}>
            <Typography component="h2" variant="h6" gutterBottom>About Odin-SMR</Typography>
            <Typography variant="body2" color="text.secondary">
              Launched in February 2001, Odin was a joint undertaking between Sweden,
              Canada, France and Finland. This site provides information and access
              to observations from its Sub-Millimetre Radiometer.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Data from Odin’s other instrument, OSIRIS, is processed at the
              University of Saskatchewan. <Link href="http://odin-osiris.usask.ca/" target="_blank" rel="noopener noreferrer">Visit OSIRIS <Box component="span" sx={{ whiteSpace: "nowrap" }}>(opens in a new tab)</Box></Link>.
            </Typography>
          </Box>
          <Box>
            <Stack direction="row" useFlexGap spacing={3} sx={{ flexWrap: "wrap", mb: 2 }}>
              <Link component={RouterLink} to="/documentation" sx={{ py: 1 }}>Documents</Link>
              <Link component={RouterLink} to="/data_access" sx={{ py: 1 }}>Data access</Link>
              <Link component={RouterLink} to="/news" sx={{ py: 1 }}>News</Link>
            </Stack>
            <Typography variant="body2" color="text.secondary">Chalmers University of Technology · Molflow / ESA</Typography>
            <Stack direction="row" spacing={3} sx={{ bgcolor: "#212121", borderRadius: 1, p: 2, mt: 2, maxWidth: 360, alignItems: "center" }}>
              <Box component="img" src="/images/Chalmers_white.png" alt="Chalmers" loading="lazy" sx={{ width: "40%", height: 48, objectFit: "contain" }} />
              <Box component="img" src="/images/Molflow_ESA.png" alt="Molflow and ESA" loading="lazy" sx={{ width: "50%", height: 48, objectFit: "contain" }} />
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
