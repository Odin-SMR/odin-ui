import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";

export default function Footer() {
  const theme = useTheme();
  return (
    <Box
      sx={{
        bgcolor:
          theme.palette.mode === "light"
            ? theme.palette.grey[400]
            : theme.palette.grey[800],
        color: "text.primary",
        py: 2,
        mt: "auto",
      }}
    >
      <Grid container padding={2} spacing={2} justifyContent="center">
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography>About the project</Typography>
          <Typography maxWidth="md" variant="caption" align="left">
            The Odin satellite was launched in Feb 2001 as a joint undertaking
            between Sweden, Canada, France and Finland. It carries two
            instruments: the Optical Spectrograph and Infra-Red Imaging System
            OSIRIS and the Sub-Millimetre Radiometer SMR. This site provides
            information on the SMR instrument and access to data from it. The
            OSIRIS data is processed at the University of Saskatchewan and is
            available{" "}
            <Link href="http://odin-osiris.usask.ca/" target="_blank">
              here
            </Link>
            .
          </Typography>
        </Grid>
        <Grid>
          <Grid container>
            <Grid size={{ xs: 12, lg: 6 }} justifyItems="center">
              <Box>
                <img src="/images/Chalmers_white.png" alt="Chalmers Logo" />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }} justifyItems="center">
              <Box>
                <img src="/images/Molflow_ESA.png" alt="Molflow/ESA Logo" />
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
