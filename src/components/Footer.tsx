import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";

export default function Footer() {
  const theme = useTheme();
  const bg =
    theme.palette.mode === "light"
      ? theme.palette.grey[400]
      : theme.palette.grey[800];

  return (
    <Grid
      container
      bgcolor={bg}
      padding={2}
      spacing={2}
      justifyContent="center"
      alignContent="center"
    >
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
      <Grid size={{ xs: 12, lg: 6 }}>
        <Grid container>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              component="img"
              src="/images/Chalmers_white.png"
              alt="Chalmers Logo"
              sx={{ maxWidth: { xs: "100%", md: "auto" } }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              component="img"
              src="/images/Molflow_ESA.png"
              alt="Molflow/ESA Logo"
              sx={{ maxWidth: { xs: "100%", md: "auto" } }}
            />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
